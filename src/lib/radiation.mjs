/**
 * Radiation stations — Safecast realtime fixed-sensor network.
 *
 * Backs the BEACON map's pre-existing `radiation` layer, which expected a
 * `{ stations: [...] }` payload but had no backend. Source is Safecast's
 * keyless realtime device feed (https://tt.safecast.org/devices) — ~1900 fixed
 * sensors worldwide, each reporting a geiger-tube count (CPM) and coordinates.
 *
 * Devices report different LND tubes (and many report only PM2.5 air quality,
 * which we ignore here). CPM is converted to a dose rate in nSv/h using the
 * per-tube Safecast conversion factor, and a coarse status is derived for the
 * map's color scale (NORMAL / WARNING / DANGER).
 */

const SAFECAST_REALTIME_URL = process.env.SAFECAST_REALTIME_URL || 'https://tt.safecast.org/devices';

// CPM-per-(µSv/h) conversion factors by LND geiger tube (Safecast standard).
// Order also defines precedence when a device exposes more than one tube.
const TUBE_FACTORS = [
  ['lnd_7318u', 334],
  ['lnd_7318c', 334],
  ['lnd_78017w', 334],
  ['lnd_712u', 123],
  ['lnd_7128ec', 123],
];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validCoord(lat, lng) {
  return isFiniteNumber(lat) && isFiniteNumber(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0);
}

/** Convert a CPM count from a given tube to a dose rate in nSv/h. */
export function cpmToNanoSievert(cpm, factor) {
  if (!isFiniteNumber(cpm) || cpm <= 0 || !factor) return null;
  return Math.round((cpm / factor) * 1000);
}

/** Coarse status bucket for the map color scale. */
export function statusForNanoSievert(nSvh) {
  if (nSvh == null) return 'NORMAL';
  if (nSvh >= 1000) return 'DANGER';
  if (nSvh >= 300) return 'WARNING';
  return 'NORMAL';
}

function pickTubeReading(device) {
  for (const [key, factor] of TUBE_FACTORS) {
    const cpm = device[key];
    if (isFiniteNumber(cpm) && cpm > 0 && cpm < 100000) {
      return { cpm, tube: key, factor };
    }
  }
  return null;
}

/**
 * Normalize one Safecast realtime device to a BEACON radiation station, or
 * return null if it is not a usable radiation sensor (no tube reading, or
 * invalid coordinates — e.g. air-quality-only PM2.5 devices).
 */
export function normalizeSafecastDevice(device, now = new Date()) {
  if (!device || typeof device !== 'object') return null;
  const lat = device.loc_lat;
  const lng = device.loc_lon;
  if (!validCoord(lat, lng)) return null;
  const reading = pickTubeReading(device);
  if (!reading) return null;

  const nSvh = cpmToNanoSievert(reading.cpm, reading.factor);
  const captured = new Date(String(device.when_captured ?? ''));
  return {
    id: `safecast-${device.device ?? device.device_urn ?? `${lat},${lng}`}`,
    name: String(device.device_urn || `Safecast ${device.device ?? ''}`).trim(),
    city: '',
    country: '',
    lat,
    lng,
    reading: nSvh,
    cpm: reading.cpm,
    tube: reading.tube,
    unit: 'nSv/h',
    status: statusForNanoSievert(nSvh),
    network: 'Safecast Realtime',
    capturedAt: Number.isFinite(captured.getTime()) ? captured.toISOString() : null,
    fetchedAt: now.toISOString(),
  };
}

export function parseSafecastDevices(devices, { limit = 1500, now = new Date() } = {}) {
  if (!Array.isArray(devices)) return [];
  const stations = [];
  for (const device of devices) {
    const station = normalizeSafecastDevice(device, now);
    if (station) stations.push(station);
    if (stations.length >= limit) break;
  }
  return stations;
}

export async function fetchRadiationStations({
  url = SAFECAST_REALTIME_URL,
  limit = 1500,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 radiation' },
  });
  if (!response.ok) throw new Error(`Safecast realtime API returned HTTP ${response.status}`);
  const devices = await response.json();
  return parseSafecastDevices(devices, { limit, now });
}
