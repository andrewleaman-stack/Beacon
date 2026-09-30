/**
 * Weather and environment overlays:
 *   - Precipitation radar: RainViewer public API (free, attribution required,
 *     tiles served up to zoom 7).
 *   - Lightning strike density: NOAA nowCOAST (NLDN + GLD360, 15-minute,
 *     U.S. government product). Covers 25°S–80°N, 110°E eastward to 0°.
 *   - Forest loss alerts: Global Forest Watch GLAD Landsat alerts (CC BY 4.0).
 *   - Surface wind: Open-Meteo current conditions on a 10° grid (CC BY 4.0).
 */

const UA = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' };

/** Newest RainViewer radar frame as a MapLibre tile template. */
export function parseRainviewerFrames(payload) {
  const host = payload?.host;
  const past = Array.isArray(payload?.radar?.past) ? payload.radar.past : [];
  const latest = past[past.length - 1];
  if (!host || !latest?.path) return null;
  return {
    time: new Date(Number(latest.time) * 1000).toISOString(),
    // 256px tiles, colour scheme 2 (universal blue), smoothed, with snow.
    tiles: [`${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`],
    maxzoom: 7,
  };
}

export async function fetchRainviewerFrame({ fetchImpl = fetch } = {}) {
  const res = await fetchImpl('https://api.rainviewer.com/public/weather-maps.json', { headers: UA, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`RainViewer returned HTTP ${res.status}`);
  const frame = parseRainviewerFrames(await res.json());
  if (!frame) throw new Error('RainViewer returned no radar frames');
  return frame;
}

/** nowCOAST WMS lightning density; `t` changes every 15 minutes to pick up new maps. */
export function lightningTiles(now = new Date()) {
  const t = Math.floor(now.getTime() / (15 * 60_000));
  return [
    'https://nowcoast.noaa.gov/geoserver/lightning_detection/wms?service=WMS&version=1.3.0&request=GetMap' +
    '&layers=ldn_lightning_strike_density&styles=&format=image/png&transparent=true&crs=EPSG:3857' +
    `&width=256&height=256&bbox={bbox-epsg-3857}&t=${t}`,
  ];
}

export const FOREST_ALERT_TILES = ['https://tiles.globalforestwatch.org/umd_glad_landsat_alerts/latest/dynamic/{z}/{x}/{y}.png'];

/** 10° grid from 60°S to 80°N (540 points) for the wind layer. */
export function windGridPoints(step = 10) {
  const points = [];
  for (let lat = -60; lat <= 80; lat += step) {
    for (let lng = -180; lng < 180; lng += step) points.push({ lat, lng });
  }
  return points;
}

/** Open-Meteo returns one object per requested location, in request order. */
export function parseWindGrid(payload, points) {
  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const out = [];
  rows.forEach((row, i) => {
    const speed = Number(row?.current?.wind_speed_10m);
    const direction = Number(row?.current?.wind_direction_10m);
    const point = points[i];
    if (!point || !Number.isFinite(speed) || !Number.isFinite(direction)) return;
    out.push({ lat: point.lat, lng: point.lng, speedKn: speed, directionFrom: direction, observedAt: row.current.time || null });
  });
  return out;
}

export async function fetchWindGrid({ fetchImpl = fetch, step = 10 } = {}) {
  const points = windGridPoints(step);
  const url = 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${points.map((p) => p.lat).join(',')}` +
    `&longitude=${points.map((p) => p.lng).join(',')}` +
    '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn';
  const res = await fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Open-Meteo returned HTTP ${res.status}`);
  return parseWindGrid(await res.json(), points);
}
