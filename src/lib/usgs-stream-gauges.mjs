const USGS_WATER_BASE = 'https://api.waterdata.usgs.gov/ogcapi/v0';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildUsgsGaugesUrl({ state, limit = 500, parameterCodes = ['00060', '00065'], bbox } = {}) {
  const params = new URLSearchParams({
    format: 'json',
  });
  if (state) params.set('stateCd', state);
  if (parameterCodes.length) params.set('parameterCd', parameterCodes.join(','));
  if (bbox) params.set('bbox', bbox);
  return `https://waterservices.usgs.gov/nwis/iv/?${params.toString()}`;
}

function buildUsgsRealtimeUrl({ sites, parameterCodes = ['00060', '00065'], limit = 500 } = {}) {
  const params = new URLSearchParams({
    format: 'json',
    sites: sites.join(','),
    parameterCd: parameterCodes.join(','),
    siteStatus: 'active',
  });
  return `https://waterservices.usgs.gov/nwis/iv/?${params.toString()}`;
}

function parseUsgsGaugeFeature(feature) {
  const props = feature?.properties || {};
  const sourceInfo = props.sourceInfo || {};
  const site = sourceInfo.siteCode?.[0]?.value || sourceInfo.siteName || '';
  const lat = number(sourceInfo.geoLocation?.geogLocation?.latitude);
  const lng = number(sourceInfo.geoLocation?.geogLocation?.longitude);
  if (lat == null || lng == null) return null;

  const siteCode = sourceInfo.siteCode?.[0]?.value || '';
  const siteName = sourceInfo.siteName || 'USGS Gauge';
  const siteType = sourceInfo.siteProperty?.find(p => p.name === 'siteTypeCd')?.value || '';
  const agency = sourceInfo.agencyCode || sourceInfo.agency_code || 'USGS';
  const stateCode = sourceInfo.siteProperty?.find(p => p.name === 'stateCd')?.value || '';
  const countyCd = sourceInfo.countyCd || sourceInfo.siteProperty?.find(p => p.name === 'countyCd')?.value || '';
  const hucCd = sourceInfo.siteProperty?.find(p => p.name === 'hucCd')?.value || '';

  return {
    id: `usgs-gauge-${siteCode}`,
    name: clean(siteName),
    siteId: clean(siteCode),
    lat,
    lng,
    state: clean(stateCode),
    county: clean(countyCd),
    huc: clean(hucCd),
    siteType: clean(siteType),
    agency: clean(agency),
    source: 'USGS Water Services',
    sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${siteCode}`,
    fetchedAt: new Date().toISOString(),
  };
}

function parseUsgsRealtimeFeature(feature) {
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
    source: 'USGS Realtime',
    sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${site}`,
    fetchedAt: new Date().toISOString(),
  };
}

export function normalizeUsgsGauge(feature) {
  return parseUsgsGaugeFeature(feature);
}

export function normalizeUsgsRealtime(feature) {
  return parseUsgsRealtimeFeature(feature);
}

/**
 * @param {{ state?: string; limit?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsGauges({ state, limit = 500, fetchImpl = fetch } = {}) {
  const url = buildUsgsGaugesUrl({ state, limit });
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-gauges' },
  });
  if (!response.ok) throw new Error(`USGS gauges returned HTTP ${response.status}`);
  const data = await response.json();
  return (data.features || []).map(normalizeUsgsGauge).filter(Boolean);
}

/**
 * @param {{ siteIds?: string[]; parameterCodes?: string[]; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsRealtime({ siteIds, parameterCodes = ['00060', '00065'], fetchImpl = fetch } = {}) {
  if (!siteIds?.length) return [];
  const url = buildUsgsRealtimeUrl({ sites: siteIds, parameterCodes });
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
 * @param {{ state?: string; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsFloodGauges({ state, fetchImpl = fetch } = {}) {
  const gauges = await fetchUsgsGauges({ state, limit: 2000, fetchImpl });
  const streamGauges = gauges.filter(g => g.siteType?.includes('ST') || g.siteType?.includes('stream'));
  const siteIds = streamGauges.map(g => g.siteId).slice(0, 200);
  const realtime = await fetchUsgsRealtime({ siteIds, parameterCodes: ['00060', '00065', '00062'], fetchImpl });
  const bySite = new Map();
  for (const rt of realtime) {
    const existing = bySite.get(rt.siteId) || { gauge: gauges.find(g => g.siteId === rt.siteId), readings: [] };
    existing.readings.push(rt);
    bySite.set(rt.siteId, existing);
  }
  return Array.from(bySite.values())
    .map(({ gauge, readings }) => ({
      ...gauge,
      readings: readings.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)),
      latestReading: readings[0] || null,
      floodStage: readings.some(r => r.parameterCode === '00065' && r.value != null && r.value > (r.floodStage || 10)),
    }))
    .filter(g => g.lat != null && g.lng != null);
}
