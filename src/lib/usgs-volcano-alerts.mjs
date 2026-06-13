const USGS_VOLCANO_BASE = 'https://volcanoes.usgs.gov/vhp/api';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseVolcanoAlert(raw) {
  const lat = number(raw.latitude);
  const lng = number(raw.longitude);
  if (lat == null || lng == null) return null;

  return {
    id: `usgs-volcano-${raw.volcanoId || raw.id || raw.volcano_name?.replace(/\s+/g, '-').toLowerCase()}`,
    volcanoId: clean(raw.volcanoId || raw.id),
    name: clean(raw.volcanoName || raw.name || raw.volcano_name),
    alertLevel: clean(raw.alertLevel || raw.alert_level || raw.level),
    aviationColorCode: clean(raw.aviationColorCode || raw.aviation_color_code || raw.color_code),
    activitySummary: clean(raw.activitySummary || raw.summary || raw.description),
    hazards: clean(raw.hazards || ''),
    lat,
    lng,
    state: clean(raw.state),
    region: clean(raw.region),
    lastUpdated: clean(raw.lastUpdated || raw.updated_at || raw.updated),
    source: 'USGS Volcano Hazards Program',
    sourceUrl: `https://volcanoes.usgs.gov/volcanoes/${clean(raw.volcanoName || raw.name || '').toLowerCase().replace(/\s+/g, '-')}`,
    fetchedAt: new Date().toISOString(),
    severity: raw.alertLevel === 'WARNING' || raw.alertLevel === 'RED' ? 'critical' : raw.alertLevel === 'WATCH' || raw.alertLevel === 'ORANGE' ? 'high' : raw.alertLevel === 'ADVISORY' || raw.alertLevel === 'YELLOW' ? 'elevated' : 'low',
  };
}

export function normalizeVolcanoAlert(raw) {
  return parseVolcanoAlert(raw);
}

export async function fetchVolcanoAlerts({ fetchImpl = fetch } = {}) {
  const url = `${USGS_VOLCANO_BASE}/alerts`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-volcano', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`USGS Volcano returned HTTP ${response.status}`);
  const data = await response.json();
  const alerts = Array.isArray(data) ? data : (data.alerts || data.volcanoes || data.features || []);
  return alerts.map(normalizeVolcanoAlert).filter(Boolean);
}

export async function fetchVolcanoList({ fetchImpl = fetch } = {}) {
  const url = `${USGS_VOLCANO_BASE}/volcanoes`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-volcano', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`USGS Volcano list returned HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : (data.volcanoes || data.features || []);
}
