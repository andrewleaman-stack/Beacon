// Picks news channels for the wall from what is happening in the world right now.
// Hotspots come from GDELT news events (what the media is covering) and BEACON's
// situations; channels near a hotspot, in its region, or whose live title names it
// score higher. The result keeps one channel per network and stays stable between
// refreshes so the screen you are listening to does not move.

/** @typedef {{ lat: number, lng: number, label: string, terms: string[], weight: number }} Hotspot */
/** @typedef {{ id: string, name: string, country?: string, region?: string, language?: string, lat?: number, lng?: number, live?: boolean | null, embed_allowed?: boolean, live_title?: string | null }} Channel */

/** Rough world regions matching the channel catalog's `region` field. */
export function regionOf(/** @type {number} */ lat, /** @type {number} */ lng) {
  if (lng < -30) return 'Americas';
  if (lat >= 12 && lat <= 42 && lng >= 34 && lng <= 63) return 'Middle East';
  if (lat > 35 && lng >= -30 && lng < 60) return 'Europe';
  if (lat <= 37 && lng >= -20 && lng < 52) return 'Africa';
  return 'Asia-Pacific';
}

const SEV_WEIGHT = /** @type {Record<string, number>} */ ({ critical: 2, high: 1.3, elevated: 1, low: 0.6 });
// Words too generic to match against a channel's live title.
const STOP = new Set(['city', 'state', 'region', 'province', 'district', 'county', 'north', 'south', 'east', 'west', 'united', 'states', 'kingdom', 'republic', 'report', 'earthquake', 'volcano', 'watch', 'protest', 'attack', 'fight', 'near', 'from', 'with', 'the']);

/** @param {string} text */
function termsOf(text) {
  return [...new Set(String(text || '').toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !STOP.has(w)))];
}

/**
 * @param {{ gdelt?: any[], situations?: any[] }} input
 * @returns {Hotspot[]}
 */
export function buildHotspots({ gdelt = [], situations = [] }) {
  /** @type {Hotspot[]} */
  const out = [];
  const events = (Array.isArray(gdelt) ? gdelt : []).filter((e) => Number.isFinite(Number(e?.lat)) && Number.isFinite(Number(e?.lng)));
  // GDELT leans on English-language outlets, so one country can flood it; each country's
  // events are scaled by 1/√n so ten reports from one place don't count ten times.
  /** @type {Map<string, number>} */
  const perCountry = new Map();
  for (const e of events) perCountry.set(e.country || '', (perCountry.get(e.country || '') || 0) + 1);
  for (const e of events) {
    const count = Math.max(1, Number(e.count) || 1);
    const sources = Math.min(10, Math.max(1, Number(e.sources) || 1));
    const conflict = Math.max(0, -(Number(e.goldstein) || 0)) / 10;
    const parts = String(e.place || '').split(',').map((x) => x.trim()).filter(Boolean);
    const where = parts.length > 1 ? `${parts[0]}, ${parts[parts.length - 1]}` : parts[0] || String(e.name || 'the news');
    out.push({
      lat: Number(e.lat), lng: Number(e.lng), label: `News near ${where}`,
      // Only the city: every channel in a country says the country's name.
      terms: parts.length ? termsOf(parts[0]) : [],
      weight: (Math.log2(1 + count) * (1 + sources / 5) * (1 + conflict)) / Math.sqrt(perCountry.get(e.country || '') || 1),
    });
  }
  for (const s of Array.isArray(situations) ? situations : []) {
    const c = s?.centroid;
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const events = Array.isArray(s.events) ? s.events : [];
    const top = events.find((ev) => ev?.severity === s.topSeverity) || events[0];
    const label = String(top?.title || s.title || 'Situation');
    // Physical events (storms, quakes) rarely lead news channels, so they count for less.
    // Match on the place after the dash ("M5.2 earthquake — 7 km ESE of Baghlān, Afghanistan").
    const place = label.split(' — ')[1] || '';
    const city = place.replace(/^.*\bof\s+/, '').split(',')[0];
    out.push({ lat: c.lat, lng: c.lng, label, terms: termsOf(city), weight: 0.5 * (Number(s.score) || 1) / 4 * (SEV_WEIGHT[s.topSeverity] ?? 1) });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** @param {number} lat1 @param {number} lng1 @param {number} lat2 @param {number} lng2 */
function km(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Network family, so the wall shows one Al Jazeera, one France 24, one DW… */
export function familyOf(/** @type {string} */ name) {
  const words = String(name || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return ['al', 'sky', 'abc', 'cbs', 'nbc'].includes(words[0]) ? words.slice(0, 2).join(' ') : words[0];
}

/**
 * @param {Channel[]} channels
 * @param {Hotspot[]} hotspots
 * @param {{ count: number, preferLanguage?: string, previous?: (string | null)[], fallback?: string[] }} opts
 * @returns {{ id: string, reason: string }[]}  one entry per screen
 */
export function pickAuto(channels, hotspots, { count, preferLanguage = 'en', previous = [], fallback = [] }) {
  const top = hotspots.slice(0, 40);
  const scored = channels
    .filter((c) => c.live === true && c.embed_allowed && Number.isFinite(c.lat) && Number.isFinite(c.lng))
    .map((c) => {
      const titleWords = new Set(termsOf(c.live_title || ''));
      let score = 0, best = 0, reason = '';
      for (const h of top) {
        const near = Math.exp(-km(/** @type {number} */ (c.lat), /** @type {number} */ (c.lng), h.lat, h.lng) / 1500);
        const sameRegion = regionOf(h.lat, h.lng) === c.region ? 0.25 : 0;
        const named = h.terms.some((t) => titleWords.has(t)) ? 2 : 0;
        const part = h.weight * (near + sameRegion + named);
        score += part;
        if (part > best) { best = part; reason = named ? `Covering ${h.label.replace(/^News near /, '')}` : h.label; }
      }
      score *= c.language === preferLanguage ? 1 : 0.55;
      // A small nudge toward the usual world channels when the news is quiet.
      const fi = fallback.indexOf(c.id);
      if (fi >= 0) score += (fallback.length - fi) * 0.02;
      return { c, score, reason };
    })
    .sort((a, b) => b.score - a.score);

  /** @type {typeof scored} */
  const chosen = [];
  const families = new Set();
  /** @type {Map<string, number>} */
  const perCountry = new Map();
  for (const s of scored) {
    if (chosen.length >= count) break;
    const fam = familyOf(s.c.name);
    const n = perCountry.get(s.c.country || '') || 0;
    if (families.has(fam) || n >= (count <= 4 ? 1 : 2)) continue;
    families.add(fam);
    perCountry.set(s.c.country || '', n + 1);
    chosen.push(s);
  }

  // Keep channels that are still picked on the same screen; fill the gaps with the rest.
  const byId = new Map(chosen.map((s) => [s.c.id, s]));
  /** @type {({ id: string, reason: string } | null)[]} */
  const slots = Array.from({ length: count }, (_, i) => {
    const id = previous[i];
    const s = id ? byId.get(id) : undefined;
    if (!s) return null;
    byId.delete(id);
    return { id: s.c.id, reason: s.reason };
  });
  const rest = [...byId.values()];
  return slots.map((s) => s || (() => { const n = rest.shift(); return n ? { id: n.c.id, reason: n.reason } : null; })())
    .filter((s) => s !== null);
}
