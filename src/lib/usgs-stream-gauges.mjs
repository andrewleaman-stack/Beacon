const USGS_OGC_BASE = 'https://api.waterdata.usgs.gov/ogcapi/v0';
const USGS_WATER_SERVICES = 'https://waterservices.usgs.gov/nwis';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * OGC API - fetch stations (no state filter support, filter in memory)
 * @param {{ state?: string; limit?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchUsgsStations({ state, limit = 1000, fetchImpl = fetch } = {}) {
  const allStations = [];
  let offset = 0;
  const pageSize = 500;

  while (allStations.length < limit) {
    const params = new URLSearchParams({
      f: 'json',
      limit: String(pageSize),
      offset: String(offset),
    });
    const url = `${USGS_OGC_BASE}/collections/monitoring-locations/items?${params.toString()}`;
    const response = await fetchImpl(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BEACON/1.0 usgs-stations' },
    });
    if (!response.ok) throw new Error(`USGS OGC stations returned HTTP ${response.status}`);
    const data = await response.json();
    const features = data.features || [];
    if (!features.length) break;

    for (const feature of features) {
      const station = normalizeUsgsOGCStation(feature);
      if (station && (!state || station.state === state.toUpperCase())) {
        allStations.push(station);
        if (allStations.length >= limit) break;
      }
    }
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return allStations.slice(0, limit);
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

  // Filter to stream/river types
  const streamStations = stations.filter(s =>
    s.siteType?.includes('ST') || s.siteType?.includes('stream') || s.siteType?.includes('river')
  ).slice(0, 200);

  const siteIds = streamStations.map(s => s.siteId);
  const realtime = await fetchUsgsRealtime({ siteIds, parameterCodes: ['00060', '00065', '00062'], fetchImpl });

  // Merge readings back to stations
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
 * Normalize OGC API station feature to BEACON format
 */
export function normalizeUsgsOGCStation(feature) {
  const props = feature?.properties || {};
  const geom = feature?.geometry || {};
  const coords = geom.coordinates || [];
  const lng = number(coords[0]);
  const lat = number(coords[1]);
  if (lat == null || lng == null) return null;

  return {
    id: `usgs-gauge-${props.monitoring_location_id || props.id}`,
    name: clean(props.monitoring_location_name || props.site_name || 'USGS Gauge'),
    siteId: clean(props.monitoring_location_id || props.site_no || props.id),
    lat,
    lng,
    state: clean(props.state_code || props.state_cd),
    county: clean(props.county_name || props.county_cd),
    huc: clean(props.hydrologic_unit_code || props.huc_cd),
    siteType: clean(props.site_type_code || props.site_tp_cd),
    agency: clean(props.agency_code || props.agency_cd),
    source: 'USGS Water Services (OGC)',
    sourceUrl: `https://waterdata.usgs.gov/monitoring-location/${props.monitoring_location_id || props.site_no}`,
    fetchedAt: new Date().toISOString(),
  };
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
