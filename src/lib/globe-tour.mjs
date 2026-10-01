// Chooses the stops for the rotating globe tour: the most significant things happening
// now, spread around the world, in an order that sweeps smoothly instead of zig-zagging.

/** @typedef {{ lat: number, lng: number, label: string, detail: string, severity: string, kind: string, score: number }} TourStop */

const SEV_SCORE = /** @type {Record<string, number>} */ ({ critical: 4, high: 3, elevated: 2, advisory: 2, watch: 1, low: 0.5 });
const GDELT_LABEL = /** @type {Record<string, string>} */ ({ unrest: 'Unrest', protest: 'Protest', conflict: 'Armed conflict', assault: 'Violence', fight: 'Fighting', coerce: 'Crackdown' });

/** @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2 */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
}

const ok = (/** @type {any} */ lat, /** @type {any} */ lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * @param {{ situations?: any[], gdelt?: any[], chokepoints?: any[] }} input
 * @param {{ max?: number, minSpacingKm?: number }} [opts]
 * @returns {TourStop[]}
 */
export function buildTourStops({ situations = [], gdelt = [], chokepoints = [] }, { max = 12, minSpacingKm = 700 } = {}) {
  /** @type {TourStop[]} */
  const candidates = [];

  for (const s of Array.isArray(situations) ? situations : []) {
    const c = s?.centroid;
    if (!c || !ok(c.lat, c.lng)) continue;
    const events = Array.isArray(s.events) ? s.events : [];
    const top = events.find((e) => e?.severity === s.topSeverity) || events[0];
    let label = String(top?.title || s.title || 'Situation');
    // News-only situations are titled with just a place ("Tabuk, Tabuk, Saudi Arabia").
    if (!label.includes(' — ') && label.includes(',')) {
      const parts = label.split(',').map((x) => x.trim()).filter(Boolean);
      label = `In the news — ${parts[0]}, ${parts[parts.length - 1]}`;
    }
    candidates.push({
      lat: c.lat, lng: c.lng, label,
      detail: `${s.eventCount || events.length || 1} report${(s.eventCount || events.length) === 1 ? '' : 's'} · ${(s.sources || []).join(', ')}`.replace(/ · $/, ''),
      severity: String(s.topSeverity || 'elevated'), kind: 'situation',
      score: (SEV_SCORE[s.topSeverity] ?? 1) * 2 + Math.min(4, (Number(s.score) || 0) / 4),
    });
  }

  for (const e of Array.isArray(gdelt) ? gdelt : []) {
    const lat = Number(e?.lat), lng = Number(e?.lng);
    if (!ok(lat, lng)) continue;
    const count = Math.max(1, Number(e.count) || 1);
    const place = String(e.place || '').split(',').map((x) => x.trim()).filter(Boolean);
    const where = place.length > 1 ? `${place[0]}, ${place[place.length - 1]}` : place[0] || 'Unknown place';
    const kind = GDELT_LABEL[String(e.type)] || 'In the news';
    const sources = Number(e.sources) || 1;
    candidates.push({
      lat, lng, label: `${kind} — ${where}`,
      detail: `${count} article${count === 1 ? '' : 's'} from ${sources} outlet${sources === 1 ? '' : 's'} · GDELT`,
      severity: Number(e.goldstein) <= -7 ? 'high' : 'elevated', kind: 'news',
      score: Math.log2(1 + count) * (1 + Math.min(10, sources) / 5),
    });
  }

  for (const c of Array.isArray(chokepoints) ? chokepoints : []) {
    if (!ok(c?.lat, c?.lng) || !['HIGH', 'CRITICAL'].includes(c.risk)) continue;
    candidates.push({
      lat: c.lat, lng: c.lng, label: `${c.name}: shipping risk ${String(c.risk).toLowerCase()}`,
      detail: (c.risk_evidence || []).join(' · ') || 'Maritime chokepoint',
      severity: String(c.risk).toLowerCase(), kind: 'chokepoint',
      score: (SEV_SCORE[String(c.risk).toLowerCase()] ?? 2) * 2.5,
    });
  }

  // Strongest first, but keep stops apart so the tour covers the world.
  /** @type {TourStop[]} */
  const picked = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    if (picked.length >= max) break;
    if (picked.some((p) => distanceKm(p.lat, p.lng, c.lat, c.lng) < minSpacingKm)) continue;
    picked.push(c);
  }
  if (picked.length < 3) return picked;

  // Start at the biggest story, then always go to the nearest unvisited stop.
  const route = [picked[0]];
  const rest = picked.slice(1);
  while (rest.length) {
    const last = route[route.length - 1];
    let best = 0;
    for (let i = 1; i < rest.length; i++) {
      if (distanceKm(last.lat, last.lng, rest[i].lat, rest[i].lng) < distanceKm(last.lat, last.lng, rest[best].lat, rest[best].lng)) best = i;
    }
    route.push(rest.splice(best, 1)[0]);
  }
  return route;
}

/**
 * Points along the great circle between two stops, for the travelling arc.
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @param {number} [n]
 * @returns {[number, number][]} [lng, lat] pairs
 */
export function greatCircle(a, b, n = 64) {
  const r = Math.PI / 180;
  const [φ1, λ1, φ2, λ2] = [a.lat * r, a.lng * r, b.lat * r, b.lng * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d === 0) return [[a.lng, a.lat], [b.lng, b.lat]];
  /** @type {[number, number][]} */
  const pts = [];
  let prevLng = a.lng;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    let lng = Math.atan2(y, x) / r;
    // Keep longitudes continuous across the antimeridian so the line doesn't wrap the globe.
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    prevLng = lng;
    pts.push([lng, Math.atan2(z, Math.sqrt(x * x + y * y)) / r]);
  }
  return pts;
}
