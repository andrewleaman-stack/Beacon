/**
 * Situations engine — cross-feed fusion + relevance scoring.
 *
 * Pure, deterministic, NO LLM / external paid calls. Takes a flat list of
 * normalized geo-events from many feeds and:
 *   1. clusters them by geographic proximity + time window into "situations"
 *      (so 70 separate feeds collapse into a handful of "what's happening"),
 *   2. scores each situation by severity, cross-feed corroboration, size, and
 *      recency, and returns them ranked.
 *
 * This is the foundation for the cognition layer: situation cards (fusion),
 * relevance triage (scoring), and natural-language query (filter these events).
 * AI synthesis, if used, is a separate on-demand step over a chosen cluster.
 *
 * Common event shape (each feed adapter must produce this):
 *   { id, source, type, title, lat, lng, time (ISO string|null),
 *     severity: 'low'|'elevated'|'high'|'critical', country }
 */

const SEVERITY_WEIGHT = { low: 1, elevated: 2, high: 4, critical: 8 };
const EARTH_RADIUS_KM = 6371;
const SEV_ORDER = ['low', 'elevated', 'high', 'critical'];

// Geolocated feeds the dashboard already loads into its `data` object, mapped
// to common events so situations can be computed instantly client-side (no
// extra fetch, no LLM). High-volume/background feeds (radiation, maritime) are
// excluded so fusion stays meaningful. Severity heuristics mirror the server
// /api/situations route.
const DASHBOARD_FEEDS = [
  { key: 'earthquakes', source: 'USGS Quakes', type: 'seismic', minSeverity: 'elevated',
    sev: (e) => (e.magnitude >= 6 ? 'critical' : e.magnitude >= 5 ? 'high' : e.magnitude >= 4 ? 'elevated' : 'low') },
  { key: 'conflict_events', source: 'Conflict', type: 'conflict',
    sev: (e) => (SEV_ORDER.includes(e.severity) ? e.severity : 'elevated') },
  { key: 'port_disruptions', source: 'PortWatch', type: 'maritime',
    sev: (e) => (e.active ? 'high' : 'elevated') },
  { key: 'gdelt', source: 'GDELT', type: 'geopolitical', sev: () => 'elevated' },
  { key: 'fires', source: 'FIRMS Fires', type: 'fire', sev: () => 'elevated' },
  { key: 'weather_events', source: 'Weather', type: 'weather', sev: () => 'elevated' },
];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickLatLng(item) {
  const lat = num(item.lat ?? item.latitude);
  const lng = num(item.lng ?? item.lon ?? item.long ?? item.longitude);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

function pickTime(item) {
  const t = item.time ?? item.date ?? item.published ?? item.pubDate ?? item.timestamp
    ?? item.updated_at ?? item.reportedAt ?? item.toDate ?? item.fetchedAt;
  if (!t) return null;
  const d = new Date(t);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function pickTitle(item) {
  return String(item.title || item.place || item.headline || item.eventName || item.portName
    || item.name || item.label || 'Event').slice(0, 160);
}

/**
 * Map the dashboard's already-loaded `data` object to common situation events.
 * Only feeds present in `data` contribute, so the result reflects whatever the
 * user has loaded — instant and zero-cost.
 */
export function eventsFromDashboardData(data = {}) {
  const events = [];
  for (const cfg of DASHBOARD_FEEDS) {
    const items = Array.isArray(data[cfg.key]) ? data[cfg.key] : [];
    const minRank = cfg.minSeverity ? SEV_ORDER.indexOf(cfg.minSeverity) : 0;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const coord = pickLatLng(item);
      if (!coord) continue;
      const severity = cfg.sev(item);
      if (SEV_ORDER.indexOf(severity) < minRank) continue;
      events.push({
        id: `${cfg.source}-${item.id ?? item.event_id ?? `${coord.lat},${coord.lng}`}`,
        source: cfg.source,
        type: cfg.type,
        title: pickTitle(item),
        lat: coord.lat,
        lng: coord.lng,
        time: pickTime(item),
        severity,
        country: String(item.country || '').trim(),
      });
    }
  }
  return events;
}

export function severityWeight(severity) {
  return SEVERITY_WEIGHT[severity] || SEVERITY_WEIGHT.low;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km between two {lat,lng} points. */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function eventTimeMs(event) {
  if (!event?.time) return null;
  const t = new Date(event.time).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Keep only events usable for geo+time clustering. */
export function usableEvents(events) {
  return (Array.isArray(events) ? events : []).filter(
    (e) => e && isFiniteNumber(e.lat) && isFiniteNumber(e.lng) && Math.abs(e.lat) <= 90 && Math.abs(e.lng) <= 180,
  );
}

/**
 * Greedy geo+time clustering. An event joins the first cluster whose centroid
 * is within `radiusKm` and whose most-recent event is within `windowHours`
 * (events with no time only match on distance). Otherwise it seeds a new
 * cluster. Events are processed newest-first so clusters anchor on recency.
 */
export function clusterEvents(events, { radiusKm = 300, windowHours = 72 } = {}) {
  const windowMs = windowHours * 3_600_000;
  const usable = usableEvents(events).slice().sort((a, b) => (eventTimeMs(b) ?? 0) - (eventTimeMs(a) ?? 0));
  const clusters = [];

  for (const event of usable) {
    const t = eventTimeMs(event);
    let target = null;
    for (const cluster of clusters) {
      const near = haversineKm({ lat: cluster.cLat, lng: cluster.cLng }, event) <= radiusKm;
      const inWindow = t == null || cluster.lastMs == null || Math.abs(cluster.lastMs - t) <= windowMs;
      if (near && inWindow) { target = cluster; break; }
    }
    if (!target) {
      target = { events: [], sumLat: 0, sumLng: 0, cLat: event.lat, cLng: event.lng, lastMs: t, firstMs: t };
      clusters.push(target);
    }
    target.events.push(event);
    target.sumLat += event.lat;
    target.sumLng += event.lng;
    target.cLat = target.sumLat / target.events.length;
    target.cLng = target.sumLng / target.events.length;
    if (t != null) {
      target.lastMs = target.lastMs == null ? t : Math.max(target.lastMs, t);
      target.firstMs = target.firstMs == null ? t : Math.min(target.firstMs, t);
    }
  }
  return clusters;
}

function dominantCountry(events) {
  const counts = {};
  for (const e of events) {
    const c = (e.country || '').trim();
    if (c) counts[c] = (counts[c] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '';
}

const SEVERITY_RANK = ['low', 'elevated', 'high', 'critical'];

/**
 * Relevance score for a cluster. Severity sum + cross-feed corroboration
 * (distinct sources, the strongest signal that something real is happening) +
 * log-damped size, all decayed by how long ago the latest event was.
 */
export function scoreSituation(cluster, { now = Date.now(), halfLifeHours = 48 } = {}) {
  const events = cluster.events || [];
  // Severity is summed by *distinct source* (each feed contributes only its
  // peak severity), so one high-volume feed (e.g. hundreds of fire pixels)
  // can't inflate the score. Real significance = several feeds corroborating
  // and/or a high-severity event — not raw event count.
  const peakBySource = {};
  for (const e of events) {
    const w = severityWeight(e.severity);
    if (!peakBySource[e.source] || w > peakBySource[e.source]) peakBySource[e.source] = w;
  }
  const severity = Object.values(peakBySource).reduce((a, b) => a + b, 0);
  const diversity = Object.keys(peakBySource).length;
  const sizeFactor = Math.log2(events.length + 1); // small, damped contribution
  const ageHours = cluster.lastMs == null ? halfLifeHours : Math.max(0, (now - cluster.lastMs) / 3_600_000);
  const recency = Math.pow(0.5, ageHours / halfLifeHours); // 1.0 now → 0.5 at half-life
  const raw = (severity + diversity * 3 + sizeFactor) * recency;
  return Math.round(raw * 100) / 100;
}

/**
 * Build ranked situations from a flat event list. Returns the most significant
 * clusters first, each carrying its member events for source-grounding.
 */
export function buildSituations(events, {
  radiusKm = 300,
  windowHours = 72,
  now = Date.now(),
  limit = 50,
  minEvents = 1,
} = {}) {
  const clusters = clusterEvents(events, { radiusKm, windowHours });
  const situations = clusters
    .filter((c) => c.events.length >= minEvents)
    .map((c) => {
      const sources = [...new Set(c.events.map((e) => e.source).filter(Boolean))];
      const topSeverity = c.events
        .map((e) => e.severity)
        .sort((a, b) => SEVERITY_RANK.indexOf(b) - SEVERITY_RANK.indexOf(a))[0] || 'low';
      const country = dominantCountry(c.events);
      const score = scoreSituation(c, { now });
      return {
        id: `sit-${Math.round(c.cLat * 100)}-${Math.round(c.cLng * 100)}-${c.lastMs ?? 0}`,
        title: `${country || 'Region'} — ${c.events.length} event${c.events.length === 1 ? '' : 's'} across ${sources.length} feed${sources.length === 1 ? '' : 's'}`,
        country,
        centroid: { lat: Math.round(c.cLat * 10000) / 10000, lng: Math.round(c.cLng * 10000) / 10000 },
        score,
        topSeverity,
        eventCount: c.events.length,
        sourceCount: sources.length,
        sources,
        firstTime: c.firstMs ? new Date(c.firstMs).toISOString() : null,
        lastTime: c.lastMs ? new Date(c.lastMs).toISOString() : null,
        events: c.events,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return situations;
}
