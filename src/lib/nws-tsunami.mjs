const NWS_BASE = 'https://api.weather.gov/alerts/active';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNwsTsunamiFeature(feature) {
  const props = feature?.properties || {};
  const geom = feature?.geometry || {};
  const coords = geom?.coordinates || [];
  let lat = null, lng = null;
  if (geom.type === 'Point' && coords.length >= 2) {
    lng = number(coords[0]);
    lat = number(coords[1]);
  } else if (geom.type === 'Polygon' && coords.length > 0) {
    // centroid of first ring
    const ring = coords[0];
    let sumLat = 0, sumLng = 0, count = 0;
    for (const c of ring) {
      sumLng += c[0];
      sumLat += c[1];
      count++;
    }
    lng = sumLng / count;
    lat = sumLat / count;
  }
  if (lat == null || lng == null) return null;

  return {
    id: `nws-tsunami-${props.id || props['@id'] || clean(props.event + '-' + props.onset)}`,
    event: clean(props.event),
    severity: clean(props.severity),
    certainty: clean(props.certainty),
    urgency: clean(props.urgency),
    areas: clean(props.areaDesc),
    geocode: props.geocode || [],
    effective: clean(props.onset),
    expires: clean(props.expires),
    sent: clean(props.sent),
    status: clean(props.status),
    messageType: clean(props.messageType),
    category: clean(props.category),
    description: clean(props.description),
    instruction: clean(props.instruction),
    lat,
    lng,
    source: 'NWS CAP',
    sourceUrl: `https://api.weather.gov/alerts/${props.id || ''}`,
    fetchedAt: new Date().toISOString(),
  };
}

export function parseNwsTsunamiAlerts(geoJsonText) {
  try {
    const data = JSON.parse(geoJsonText);
    const features = data.features || [];
    return features
      .map(parseNwsTsunamiFeature)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * @param {{ eventTypes?: string[], area?: string, fetchImpl?: typeof fetch }} [options]
 */
export async function fetchNwsTsunamiAlerts({ eventTypes = ['Tsunami Warning', 'Tsunami Watch'], area, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams();
  for (const et of eventTypes) params.append('event', et);
  if (area) params.append('area', area);
  const url = `${NWS_BASE}?${params.toString()}`;
  
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 nws-tsunami', 'Accept': 'application/geo+json' },
  });
  if (!response.ok) throw new Error(`NWS tsunami returned HTTP ${response.status}`);
  return parseNwsTsunamiAlerts(await response.text());
}
