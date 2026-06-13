const OPENSKY_API_BASE = 'https://opensky-network.org/api';
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

const DEFAULT_REGIONS = [
  { lamin: 40.5, lomin: -84.0, lamax: 43.5, lomax: -80.0, label: 'Great Lakes / Detroit' },
  { lamin: 24.0, lomin: -125.0, lamax: 50.0, lomax: -66.0, label: 'CONUS' },
];

const globalForOpenSky = globalThis;
if (!globalForOpenSky.__beaconOpenSkyToken) {
  globalForOpenSky.__beaconOpenSkyToken = { token: '', expiresAt: 0 };
}

function round(value, places = 5) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const factor = 10 ** places;
  return Math.round(number * factor) / factor;
}

export function normalizeOpenSkyState(state, fallbackTime = Math.floor(Date.now() / 1000)) {
  if (!Array.isArray(state) || state.length < 17) return null;
  const [
    icao24,
    callsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    ,
    geoAltitude,
    squawk,
    spi,
    positionSource,
    category,
  ] = state;

  if (latitude == null || longitude == null) return null;

  const speedKnots = typeof velocity === 'number' ? Math.round(velocity * 1.94384449 * 10) / 10 : null;
  const timestampSeconds = Number(lastContact || timePosition || fallbackTime);

  return {
    callsign: String(callsign || icao24 || 'UNKNOWN').trim() || String(icao24 || 'UNKNOWN'),
    lat: round(latitude),
    lng: round(longitude),
    alt: typeof baroAltitude === 'number' ? Math.round(baroAltitude) : 0,
    geo_alt: typeof geoAltitude === 'number' ? Math.round(geoAltitude) : null,
    heading: typeof trueTrack === 'number' ? Math.round(trueTrack) : 0,
    speed_knots: speedKnots,
    vertical_rate: typeof verticalRate === 'number' ? Math.round(verticalRate * 196.850394) : null,
    model: 'Unknown',
    icao24: String(icao24 || '').toLowerCase(),
    registration: 'N/A',
    squawk: squawk || '',
    airline_code: '',
    aircraft_category: 'plane',
    category: category === 3 ? 'military' : 'commercial',
    grounded: Boolean(onGround),
    origin_country: originCountry || '',
    position_source: positionSource,
    spi: Boolean(spi),
    type: 'flight',
    source: 'OpenSky',
    timestamp: new Date(timestampSeconds * 1000).toISOString(),
  };
}

export function buildOpenSkyStatesUrl(region = {}) {
  const params = new URLSearchParams({ extended: '1' });
  for (const key of ['lamin', 'lomin', 'lamax', 'lomax']) {
    if (region[key] != null) params.set(key, String(region[key]));
  }
  return `${OPENSKY_API_BASE}/states/all?${params.toString()}`;
}

export async function fetchOpenSkyToken({ clientId, clientSecret, fetchImpl = fetch } = {}) {
  if (!clientId || !clientSecret) return '';
  const cached = globalForOpenSky.__beaconOpenSkyToken;
  if (cached.token && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetchImpl(OPENSKY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`OpenSky token returned HTTP ${response.status}`);
  const payload = await response.json();
  cached.token = payload.access_token || '';
  cached.expiresAt = Date.now() + Math.max(60, Number(payload.expires_in || 1800) - 60) * 1000;
  return cached.token;
}

export async function fetchOpenSkyRegion({ region, token = '', fetchImpl = fetch } = {}) {
  const response = await fetchImpl(buildOpenSkyStatesUrl(region), {
    headers: token ? { Authorization: `Bearer ${token}`, 'User-Agent': 'BEACON/1.0 opensky-feed' } : { 'User-Agent': 'BEACON/1.0 opensky-feed' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`OpenSky states returned HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.states || [])
    .map((state) => normalizeOpenSkyState(state, payload.time))
    .filter(Boolean);
}

export async function fetchOpenSkyFlights({
  clientId = process.env.OPENSKY_CLIENT_ID,
  clientSecret = process.env.OPENSKY_CLIENT_SECRET,
  regions = DEFAULT_REGIONS,
  fetchImpl = fetch,
} = {}) {
  const token = await fetchOpenSkyToken({ clientId, clientSecret, fetchImpl }).catch(() => '');
  const results = await Promise.allSettled(regions.map((region) => fetchOpenSkyRegion({ region, token, fetchImpl })));
  const seen = new Set();
  const flights = [];
  const sourceStatus = [];

  results.forEach((result, index) => {
    const region = regions[index];
    if (result.status === 'fulfilled') {
      for (const flight of result.value) {
        const key = flight.icao24 || `${flight.callsign}-${flight.lat}-${flight.lng}`;
        if (seen.has(key)) continue;
        seen.add(key);
        flights.push(flight);
      }
      sourceStatus.push({ source: `OpenSky ${region.label || index + 1}`, ok: true, count: result.value.length, error: null });
    } else {
      sourceStatus.push({ source: `OpenSky ${region.label || index + 1}`, ok: false, count: 0, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  });

  return { flights, sourceStatus, authenticated: Boolean(token) };
}
