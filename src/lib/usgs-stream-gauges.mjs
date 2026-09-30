const USGS_WATER_SERVICES = 'https://waterservices.usgs.gov/nwis';
// Modern USGS Water Data OGC API. The legacy WaterServices (nwis/iv) is being
// retired and often answers statewide queries with HTTP 503.
const USGS_OGC = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections';
const UA = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon) usgs-gauges' };

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

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

    const stationState = clean(row.state_cd || state || '');
    if (state && stationState.toLowerCase() !== state.toLowerCase()) continue;

    stations.push({
      id: `usgs-gauge-${row.site_no}`,
      name: clean(row.station_nm || 'USGS Gauge'),
      siteId: clean(row.site_no),
      lat,
      lng,
      state: stationState,
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

/** Convert OGC latest-continuous features into the same reading shape as nwis/iv. */
export function normalizeOgcLatest(feature, names = new Map()) {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates;
  const lng = number(coords?.[0]);
  const lat = number(coords?.[1]);
  const locationId = clean(props.monitoring_location_id);
  const site = locationId.replace(/^USGS-/, '');
  if (!site || lat == null || lng == null) return null;
  return {
    id: `usgs-rt-${site}-${clean(props.parameter_code)}`,
    siteId: site,
    siteName: clean(props.monitoring_location_name) || names.get(locationId) || `USGS ${site}`,
    parameterCode: clean(props.parameter_code),
    parameterName: props.parameter_code === '00060' ? 'Discharge' : props.parameter_code === '00065' ? 'Gage height' : clean(props.parameter_code),
    value: number(props.value),
    unit: clean(props.unit_of_measure),
    time: clean(props.time) || null,
    lat,
    lng,
    source: 'USGS Water Data OGC API',
    sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${site}`,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchOgcJson(url, fetchImpl) {
  const response = await fetchImpl(url, { cache: 'no-store', headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`USGS OGC API returned HTTP ${response.status}`);
  return response.json();
}

/** Latest discharge and gage height for a state's stream gauges via the OGC API. */
export async function fetchUsgsOgcGauges({ state = 'MI', fetchImpl = fetch } = {}) {
  const stateName = STATE_NAMES[String(state).toUpperCase()];
  if (!stateName) throw new Error(`Unknown state code ${state}`);
  const q = `f=json&state_name=${encodeURIComponent(stateName)}&site_type_code=ST`;
  const [flow, height, locations] = await Promise.all([
    fetchOgcJson(`${USGS_OGC}/latest-continuous/items?${q}&parameter_code=00060&limit=5000`, fetchImpl),
    fetchOgcJson(`${USGS_OGC}/latest-continuous/items?${q}&parameter_code=00065&limit=5000`, fetchImpl),
    // Names only; a failure here just leaves gauges labelled by site number.
    fetchOgcJson(`${USGS_OGC}/monitoring-locations/items?${q}&limit=10000&skipGeometry=true&properties=monitoring_location_name`, fetchImpl).catch(() => null),
  ]);
  const names = new Map((locations?.features || []).map((f) => [f.id, clean(f.properties?.monitoring_location_name)]));
  const readings = [...(flow?.features || []), ...(height?.features || [])].map((f) => normalizeOgcLatest(f, names)).filter(Boolean);
  const gauges = groupReadingsBySite(readings, String(state).toUpperCase());
  for (const g of gauges) g.source = 'USGS Water Data OGC API';
  return gauges;
}

/**
 * Latest discharge and gage-height readings for every active stream gauge in a
 * state, from one nwis/iv request. (Previously this listed 500 arbitrary sites
 * first and passed them all as a `sites=` list, which USGS rejected with 503.)
 * @param {{ state?: string; limit?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsNwisGauges({ state = 'MI', limit = 200, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    format: 'json',
    stateCd: state,
    siteType: 'ST',
    parameterCd: '00060,00065',
    siteStatus: 'active',
  });
  const response = await fetchImpl(`${USGS_WATER_SERVICES}/iv/?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon) usgs-realtime' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`USGS realtime returned HTTP ${response.status}`);
  const data = await response.json();
  return groupReadingsBySite((data?.value?.timeSeries || []).map(normalizeUsgsRealtime).filter(Boolean), state).slice(0, limit);
}

/** Stream gauges for a state: OGC API first, legacy nwis/iv as fallback. */
export async function fetchUsgsFloodGauges({ state = 'MI', limit = 200, fetchImpl = fetch } = {}) {
  try {
    const gauges = await fetchUsgsOgcGauges({ state, fetchImpl });
    if (gauges.length) return gauges.slice(0, limit);
  } catch {
    // fall through to the legacy service
  }
  return fetchUsgsNwisGauges({ state, limit, fetchImpl });
}

/** Collapse per-parameter readings into one gauge per site, newest reading first. */
export function groupReadingsBySite(readings, state = '') {
  const bySite = new Map();
  for (const rt of readings) {
    const gauge = bySite.get(rt.siteId) || {
      id: `usgs-gauge-${rt.siteId}`,
      name: rt.siteName || 'USGS Gauge',
      siteId: rt.siteId,
      lat: rt.lat,
      lng: rt.lng,
      state,
      siteType: 'ST',
      agency: 'USGS',
      source: 'USGS Water Services (nwis/iv)',
      sourceUrl: rt.sourceUrl,
      readings: [],
    };
    gauge.readings.push(rt);
    bySite.set(rt.siteId, gauge);
  }
  return [...bySite.values()].map((gauge) => {
    gauge.readings.sort((x, y) => new Date(y.time || 0) - new Date(x.time || 0));
    const height = gauge.readings.find((r) => r.parameterCode === '00065');
    const flow = gauge.readings.find((r) => r.parameterCode === '00060');
    return {
      ...gauge,
      latestReading: gauge.readings[0] || null,
      gageHeightFt: height?.value ?? null,
      dischargeCfs: flow?.value ?? null,
      // NWIS does not publish flood stages (NOAA NWPS does), so this stays unknown
      // rather than guessing from a fixed height.
      floodStage: null,
      fetchedAt: new Date().toISOString(),
    };
  });
}

/**
 * Normalize WaterServices realtime time series to BEACON reading
 */
export function normalizeUsgsRealtime(feature) {
  // WaterServices JSON puts sourceInfo/variable/values at the top level of each
  // time series; accept a `properties` wrapper too for GeoJSON-style callers.
  const props = feature?.properties || feature || {};
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
    siteName: clean(sourceInfo.siteName),
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
