const USGS_HANS_VOLCANO_BASE = 'https://volcanoes.usgs.gov/hans-public/api/volcano';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severityFrom(level, color) {
  const l = clean(level).toUpperCase();
  const c = clean(color).toUpperCase();
  if (l === 'WARNING' || c === 'RED') return 'critical';
  if (l === 'WATCH' || c === 'ORANGE') return 'high';
  if (l === 'ADVISORY' || c === 'YELLOW') return 'elevated';
  return 'low';
}

export function normalizeVolcanoAlert(raw) {
  const lat = number(raw.latitude ?? raw.lat);
  const lng = number(raw.longitude ?? raw.lng ?? raw.lon);
  if (lat == null || lng == null) return null;

  const name = clean(raw.volcano_name_appended || raw.volcano_name || raw.volcanoName || raw.name).replace(/\s+Volcano$/i, '');
  const vnum = clean(raw.vnum || raw.volcanoId || raw.id);
  const noticeId = clean(raw.notice_identifier || raw.guid || raw.id || vnum || name);
  const alertLevel = clean(raw.alert_level || raw.alertLevel);
  const aviationColorCode = clean(raw.color_code || raw.aviationColorCode);
  const timestamp = clean(raw.sent_date_cap || raw.sent_utc || raw.pubDate || raw.lastUpdated || raw.updated_at);

  return {
    id: `usgs-volcano-${noticeId || name.replace(/\s+/g, '-').toLowerCase()}`,
    volcanoId: vnum,
    name,
    alertLevel,
    aviationColorCode,
    certainty: clean(raw.cap_certainty),
    capSeverity: clean(raw.cap_severity),
    urgency: clean(raw.cap_urgency),
    activitySummary: clean(raw.synopsis || raw.activitySummary || raw.summary || raw.description),
    hazards: clean(raw.hazards || ''),
    lat,
    lng,
    observatory: clean(raw.obs_fullname || raw.observatory),
    sent: timestamp,
    timestamp,
    expires: clean(raw.cap_expires),
    source: 'USGS Volcano Hazards Program HANS',
    sourceUrl: clean(raw.notice_url) || `https://volcanoes.usgs.gov/hans-public/volcano/${vnum}`,
    fetchedAt: new Date().toISOString(),
    severity: severityFrom(alertLevel, aviationColorCode),
  };
}

export async function fetchVolcanoAlerts({ fetchImpl = fetch } = {}) {
  const url = `${USGS_HANS_VOLCANO_BASE}/getCapElevated`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-volcano', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`USGS Volcano HANS returned HTTP ${response.status}`);
  const data = await response.json();
  const alerts = Array.isArray(data) ? data : (data.alerts || data.volcanoes || data.features || []);
  return alerts.map(normalizeVolcanoAlert).filter(Boolean);
}

export async function fetchVolcanoList({ fetchImpl = fetch } = {}) {
  const url = `${USGS_HANS_VOLCANO_BASE}/getUSVolcanoes`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 usgs-volcano', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`USGS Volcano list returned HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : (data.volcanoes || data.features || []);
}
