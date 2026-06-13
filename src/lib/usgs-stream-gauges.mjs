const USGS_WATER_SERVICES = 'https://waterservices.usgs.gov/nwis';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parse RDB (tab-delimited) format from nwis/site
 * @param {string} rdbText
 * @param {string} [state] - optional state filter
 * @returns {any[]}
 */
export function parseRdbStations(rdbText, state) {
  const lines = rdbText.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t');
  const stations = [];

  for (let i = 1; i < lines.length; i++) {
    // Skip the width-specifier line (second line in RDB format: "5s\t15s\t50s\t...")
    if (i === 1 && lines[i].match(/^\d+[a-z]\t/)) continue;

    const values = lines[i].split('\t');
    if (values.length < headers.length) continue;

    const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? '']));

    const lat = number(row.dec_lat_va);
    const lng = number(row.dec_long_va);
    if (lat == null || lng == null) continue;

    const stationState = row.state_cd || row.state_cd?.trim();
    if (state && stationState.toLowerCase() !== state.toLowerCase()) continue;

    stations.push({
      id: `usgs-gauge-${row.site_no}`,
      name: clean(row.station_nm || 'USGS Gauge'),
      siteId: clean(row.site_no),
      lat,
      lng,
      state: clean(row.state_cd),
      county: clean(row.county_cd || ''),
      huc: clean(row.huc_cd || ''),
      siteType: clean(row.site_tp_cd || ''),
      agency: clean(row.agency_cd || 'USGS'),
      source: 'USGS Water Services (nwis/site RDB)',
      sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${row.site_no}`,
      fetchedAt: new Date().toISOString(),
    });
  }
  return stations;
}

/**
 * Fetch stations from nwis/site RDB endpoint
 * @param {{ state?: string; limit?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsStations({ state, limit = 1000, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    format: 'rdb',
    siteStatus: 'active',
  });
  if (state) params.set('stateCd', state);

  const url = `${USGS_WATER_SERVICES}/site/?${params.toString()}`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-stations' },
  });
  if (!response.ok) throw new Error(`USGS nwis/site returned HTTP ${response.status}`);

  const rdbText = await response.text();
  const stations = parseRdbStations(rdbText, state);
  return stations.slice(0, limit);
}

/**
 * nwis/iv - fetch realtime readings for given site IDs
 * @param {{ siteIds: string[]; parameterCodes?: string[]; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsRealtime({ siteIds, parameterCodes = ['00060', '00065'], fetchImpl = fetch } = {}) {
  if (!siteIds?.length) return [];
  const params = new URLSearchParams({
    format: 'json',
    sites: siteIds.join(','),
    parameterCd: parameterCodes.join(','),
    siteStatus: 'active',
  });
  const url = `${USGS_WATER_SERVICES}/iv/?${params.toString()}`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-realtime' },
  });
  if (!response.ok) throw new Error(`USGS realtime returned HTTP ${response.status}`);
  const data = await response.json();
  const series = data?.value?.timeSeries || [];
  return series.map(normalizeUsgsRealtime).filter(Boolean);
}

/**
 * Flood mode: get stations for state, then realtime readings
 * @param {{ state?: string; limit?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsFloodGauges({ state, limit = 200, fetchImpl = fetch } = {}) {
  const stations = await fetchUsgsStations({ state, limit, fetchImpl });
  if (!stations.length) return [];

  const streamStations = stations.filter(s =>
    s.siteType?.includes('ST') || s.siteType?.includes('stream') || s.siteType?.includes('river')
  ).slice(0, 200);

  const siteIds = streamStations.map(s => s.siteId);
  const realtime = await fetchUsgsRealtime({ siteIds, parameterCodes: ['00060', '00065', '00062'], fetchImpl });

  const bySite = new Map();
  for (const rt of realtime) {
    const existing = bySite.get(rt.siteId) || { station: streamStations.find(s => s.siteId === rt.siteId), readings: [] };
    existing.readings.push(rt);
    bySite.set(rt.siteId, existing);
  }

  return Array.from(bySite.values())
    .map(({ station, readings }) => ({
      ...station,
      readings: readings.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)),
      latestReading: readings[0] || null,
      floodStage: readings.some(r => r.parameterCode === '00065' && r.value != null && r.value > (r.floodStage || 10)),
    }))
    .filter(g => g.lat != null && g.lng != null);
}

/**
 * Normalize WaterServices realtime time series to BEACON reading
 */
export function normalizeUsgsRealtime(feature) {
  const props = feature?.properties || {};
  const sourceInfo = props.sourceInfo || {};
  const site = sourceInfo.siteCode?.[0]?.value || sourceInfo.siteName || '';
  const lat = number(sourceInfo.geoLocation?.geogLocation?.latitude);
  const lng = number(sourceInfo.geoLocation?.geogLocation?.longitude);
  if (lat == null || lng == null) return null;

  const variable = props.variable || {};
  const paramCode = variable.variableCode?.[0]?.value || '';
  const values = props.values || [];
  let latestValue = null;
  let latestTime = null;
  if (values.length && values[0].value?.length) {
    const v = values[0].value[values[0].value.length - 1];
    latestValue = number(v.value);
    latestTime = v.dateTime || v.valueTime;
  }

  return {
    id: `usgs-rt-${site}-${paramCode}`,
    siteId: site,
    parameterCode: paramCode,
    parameterName: clean(variable.variableName || variable.variableDescription),
    value: latestValue,
    unit: clean(variable.unit?.unitCode || variable.unit?.unitName),
    time: latestTime,
    lat,
    lng,
    source: 'USGS Realtime (IV)',
    sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${site}`,
    fetchedAt: new Date().toISOString(),
  };
}
