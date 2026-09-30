/** Great-circle distance and nearest-neighbour helpers for tracking and contacts. */

const R_KM = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Everything within `radiusKm` of `center`, nearest first.
 * `groups` is { kind: items[] } where items have numeric lat/lng.
 * @param {{ lat: number, lng: number }} center
 * @param {Record<string, any[]>} groups
 * @param {{ radiusKm?: number, limit?: number, excludeId?: string | number | null }} [options]
 */
export function contactsNear(center, groups, { radiusKm = 250, limit = 25, excludeId = null } = {}) {
  const out = [];
  for (const [kind, items] of Object.entries(groups)) {
    for (const item of items || []) {
      const lat = Number(item?.lat);
      const lng = Number(item?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const id = String(item.icao24 || item.mmsi || item.id || '');
      if (excludeId && id === String(excludeId)) continue;
      const km = distanceKm(center, { lat, lng });
      if (km <= radiusKm) out.push({ kind, id, km, item });
    }
  }
  return out.sort((a, b) => a.km - b.km).slice(0, limit);
}

/** Nearest item overall, regardless of radius (e.g. the closest public camera). */
export function nearest(center, items) {
  let best = null;
  for (const item of items || []) {
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const km = distanceKm(center, { lat, lng });
    if (!best || km < best.km) best = { km, item };
  }
  return best;
}

/** Append a position to a trail unless it barely moved; cap the length. */
export function appendTrail(trail, point, { minMoveKm = 0.05, max = 400 } = {}) {
  const last = trail[trail.length - 1];
  if (last && distanceKm({ lat: last[1], lng: last[0] }, point) < minMoveKm) return trail;
  const next = [...trail, [point.lng, point.lat]];
  return next.length > max ? next.slice(next.length - max) : next;
}
