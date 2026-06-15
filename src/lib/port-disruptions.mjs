/**
 * Port disruptions — IMF PortWatch.
 *
 * Keyless feed borrowed from the retired WorldMonitor shortlist. Source is IMF
 * PortWatch's public ArcGIS feature service `disruptions_with_ports`, which
 * geolocates ports affected by named disruption events (tropical cyclones,
 * conflict, etc.) with a date range. Complements the maritime / chokepoint
 * layers with "which ports are disrupted, where, and by what".
 *
 * No credentials required. Override the endpoint with PORTWATCH_DISRUPTIONS_URL.
 */

const PORTWATCH_URL = process.env.PORTWATCH_DISRUPTIONS_URL
  || 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/disruptions_with_ports/FeatureServer/0/query';

function clean(value) {
  return String(value ?? '').trim();
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validCoord(lat, lng) {
  return isFiniteNumber(lat) && isFiniteNumber(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0);
}

/** Epoch-ms (ArcGIS) or date string -> ISO, or null. */
function toIso(value) {
  if (value == null || value === '') return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/**
 * Normalize one ArcGIS `disruptions_with_ports` feature (attributes) to a
 * BEACON port-disruption record, or null if it lacks usable coordinates.
 */
export function normalizePortDisruption(attributes, now = new Date()) {
  if (!attributes || typeof attributes !== 'object') return null;
  const lat = Number(attributes.lat);
  const lng = Number(attributes.long);
  if (!validCoord(lat, lng)) return null;

  const fromDate = toIso(attributes.fromdate);
  const toDate = toIso(attributes.todate);
  const active = Boolean(toDate && new Date(toDate).getTime() >= now.getTime());
  return {
    id: `portwatch-${clean(attributes.portid)}-${clean(attributes.eventid) || clean(attributes.ObjectId)}`,
    portId: clean(attributes.portid),
    portName: clean(attributes.portname),
    country: clean(attributes.country),
    lat,
    lng,
    eventId: clean(attributes.eventid),
    eventName: clean(attributes.eventname),
    fromDate,
    toDate,
    active,
    status: active ? 'ACTIVE' : 'PAST',
    distanceKm: isFiniteNumber(Number(attributes.distance_km)) ? Math.round(Number(attributes.distance_km)) : null,
    source: 'IMF PortWatch',
    fetchedAt: now.toISOString(),
  };
}

export function parsePortWatchFeatures(payload, { limit = 250, now = new Date() } = {}) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const out = [];
  for (const feature of features) {
    const record = normalizePortDisruption(feature?.attributes, now);
    if (record) out.push(record);
    if (out.length >= limit) break;
  }
  return out;
}

export async function fetchPortDisruptions({
  url = PORTWATCH_URL,
  limit = 250,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'portid,portname,country,lat,long,eventid,eventname,fromdate,todate,distance_km,ObjectId',
    orderByFields: 'fromdate DESC',
    resultRecordCount: String(limit),
    f: 'json',
  });
  const response = await fetchImpl(`${url}?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 port-disruptions' },
  });
  if (!response.ok) throw new Error(`IMF PortWatch API returned HTTP ${response.status}`);
  const payload = await response.json();
  return parsePortWatchFeatures(payload, { limit, now });
}
