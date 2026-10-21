/**
 * Active U.S. National Weather Service alerts with map areas.
 *
 * Only storm-based warnings (tornado, severe thunderstorm, flash flood) carry
 * their own polygon; most alerts (watches, advisories, marine and winter
 * products) list the forecast zones they cover instead. Zone outlines never
 * change, so they are fetched once from api.weather.gov, simplified (marine
 * zones can be 1.5 MB raw) and cached. Alerts reference zones by id and each
 * outline is sent once, since many alerts share the same zones.
 */

const NWS = 'https://api.weather.gov';
const UA = { 'User-Agent': 'BEACON Situational Awareness (github.com/andrewleaman-stack/Beacon)', Accept: 'application/geo+json' };

/** Zone outlines kept in memory. A busy severe-weather day touches ~2,000. */
const ZONE_CACHE_LIMIT = 5000;
const ZONE_CONCURRENCY = 8;
/** Zone outline simplification, in degrees (~500 m): plenty for a globe view. */
const ZONE_TOLERANCE = 0.005;

/** Severity colours, strongest first. */
export const NWS_SEVERITY_COLORS = {
  Extreme: '#D32F2F',
  Severe: '#F4511E',
  Moderate: '#F9A825',
  Minor: '#4FC3F7',
  Unknown: '#90A4AE',
};

const SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };

/**
 * Douglas-Peucker line simplification: keep only points that stray more than
 * `tolerance` from the line between their neighbours. Iterative, so huge
 * coastlines cannot overflow the stack.
 * @param {number[][]} points @param {number} tolerance
 */
export function douglasPeucker(points, tolerance) {
  if (points.length < 3 || tolerance <= 0) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const tol2 = tolerance * tolerance;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = /** @type {[number, number]} */ (stack.pop());
    const [ax, ay] = points[a];
    const dx = points[b][0] - ax;
    const dy = points[b][1] - ay;
    const len2 = dx * dx + dy * dy;
    let best = 0;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const ex = px - (ax + t * dx);
      const ey = py - (ay + t * dy);
      const d2 = ex * ex + ey * ey;
      if (d2 > best) { best = d2; index = i; }
    }
    if (index > 0 && best > tol2) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Round coordinates to ~100 m, drop repeated points, and optionally simplify
 * by `tolerance` degrees, to keep payloads small. Rings that collapse are dropped.
 * @param {any} geometry @param {number} [tolerance]
 */
export function simplifyGeometry(geometry, tolerance = 0) {
  if (!geometry || !geometry.coordinates) return null;
  /** @param {number[][]} coords */
  const ring = (coords) => {
    /** @type {number[][]} */
    const out = [];
    for (const [lng, lat] of coords) {
      const p = [Math.round(lng * 1000) / 1000, Math.round(lat * 1000) / 1000];
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
    const simple = douglasPeucker(out, tolerance);
    return simple.length >= 4 ? simple : null;
  };
  const polygon = (rings) => {
    const kept = rings.map(ring).filter(Boolean);
    return kept.length ? kept : null;
  };
  if (geometry.type === 'Polygon') {
    const p = polygon(geometry.coordinates);
    return p ? { type: 'Polygon', coordinates: p } : null;
  }
  if (geometry.type === 'MultiPolygon') {
    const ps = geometry.coordinates.map(polygon).filter(Boolean);
    return ps.length ? { type: 'MultiPolygon', coordinates: ps } : null;
  }
  return null;
}

/** Merge several Polygon / MultiPolygon geometries into one MultiPolygon. */
export function mergePolygons(geometries) {
  const polys = [];
  for (const g of geometries) {
    if (!g) continue;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') polys.push(...g.coordinates);
  }
  if (!polys.length) return null;
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}

/** Zone geometry cache: url → simplified geometry, or null for a zone with no outline. */
/** @param {{ fetchImpl?: typeof fetch, limit?: number, concurrency?: number }} [options] */
export function createZoneCache({ fetchImpl = fetch, limit = ZONE_CACHE_LIMIT, concurrency = ZONE_CONCURRENCY } = {}) {
  const zones = new Map();
  const pending = new Map();
  const queue = [];
  let active = 0;

  const pump = () => {
    while (active < concurrency && queue.length) {
      const { url, resolve } = queue.shift();
      active++;
      fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(30_000) })
        .then(async (res) => {
          if (res.ok) {
            const body = await res.json();
            if (zones.size >= limit) zones.delete(zones.keys().next().value);
            zones.set(url, simplifyGeometry(body?.geometry, ZONE_TOLERANCE));
          }
          // A failed fetch is not cached, so the zone is retried on the next refresh.
        })
        .catch(() => {})
        .finally(() => {
          active--;
          pending.delete(url);
          resolve();
          pump();
        });
    }
  };

  const load = (url) => {
    if (zones.has(url)) return Promise.resolve();
    let p = pending.get(url);
    if (!p) {
      p = new Promise((resolve) => queue.push({ url, resolve }));
      pending.set(url, p);
      pump();
    }
    return p;
  };

  return {
    get: (url) => zones.get(url),
    has: (url) => zones.has(url),
    get size() { return zones.size; },
    /** Zones still being fetched. */
    get pending() { return pending.size; },
    /** Fetch the missing zones, waiting at most `deadlineMs`; the rest finish in the background. */
    async ensure(urls, deadlineMs) {
      const missing = [...new Set(urls)].filter((u) => !zones.has(u));
      if (!missing.length) return;
      await Promise.race([Promise.all(missing.map(load)), new Promise((r) => setTimeout(r, deadlineMs))]);
    },
  };
}

/** Short zone id from its API url: ".../zones/forecast/ANZ050" → "ANZ050". @param {string} url */
export function zoneId(url) {
  return String(url).split('/').pop() || '';
}

/**
 * One alert, slimmed for the map: no long text. `geometry` is the alert's
 * own polygon; otherwise `zones` lists the zone ids that make up its area.
 * @param {any} feature @param {{ get(url: string): any } | null} [zoneCache]
 */
export function normalizeAlert(feature, zoneCache) {
  const p = feature?.properties || {};
  const geometry = simplifyGeometry(feature?.geometry);
  const zoneUrls = !geometry && Array.isArray(p.affectedZones) ? p.affectedZones : [];
  const zonesMapped = zoneCache ? zoneUrls.some((/** @type {string} */ u) => zoneCache.get(u)) : false;
  const areaSource = geometry ? 'alert' : zonesMapped ? 'zones' : null;
  const severity = SEVERITY_RANK[p.severity] != null ? p.severity : 'Unknown';
  return {
    id: p.id || feature?.id || '',
    event: p.event || 'Weather alert',
    headline: p.headline || '',
    severity,
    rank: SEVERITY_RANK[severity],
    color: NWS_SEVERITY_COLORS[severity],
    urgency: p.urgency || '',
    certainty: p.certainty || '',
    area: p.areaDesc || '',
    sender: p.senderName || '',
    // Onset/ends describe the hazard itself; effective/expires the message. Prefer the hazard.
    onset: p.onset || p.effective || null,
    ends: p.ends || p.expires || null,
    sent: p.sent || null,
    url: typeof p['@id'] === 'string' && p['@id'].startsWith('https://') ? p['@id'] : '',
    instruction: (p.instruction || '').slice(0, 400),
    areaSource,
    geometry,
    zones: zoneUrls.map(zoneId),
  };
}

/**
 * Fetch active alerts and the outlines of the zones they use. Zones not yet
 * cached are given `zoneDeadlineMs` to load; the rest fill in on a later call.
 */
/** @param {{ fetchImpl?: typeof fetch, zoneCache?: ReturnType<typeof createZoneCache>, zoneDeadlineMs?: number }} [options] */
export async function fetchNwsAlerts({ fetchImpl = fetch, zoneCache, zoneDeadlineMs = 4000 } = {}) {
  const res = await fetchImpl(`${NWS}/alerts/active?status=actual`, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`NWS returned HTTP ${res.status}`);
  const body = await res.json();
  /** @type {any[]} */
  const features = Array.isArray(body?.features) ? body.features : [];
  if (zoneCache) {
    const urls = features.filter((f) => !f.geometry).flatMap((f) => f.properties?.affectedZones || []);
    await zoneCache.ensure(urls, zoneDeadlineMs);
  }
  const alerts = features.map((f) => normalizeAlert(f, zoneCache));
  // Weakest first, so stronger alerts draw on top.
  alerts.sort((a, b) => a.rank - b.rank);
  /** @type {Record<string, any>} */
  const zones = {};
  for (const f of features) {
    if (f.geometry) continue;
    for (const url of f.properties?.affectedZones || []) {
      const g = zoneCache?.get(url);
      if (g) zones[zoneId(url)] = g;
    }
  }
  return { alerts, zones };
}

/**
 * An alert's area: its own polygon, or its zones' outlines merged.
 * @param {{ geometry: any, zones?: string[] }} alert @param {Record<string, any>} zones
 */
export function alertArea(alert, zones) {
  if (alert.geometry) return alert.geometry;
  return mergePolygons((alert.zones || []).map((id) => zones?.[id]));
}
