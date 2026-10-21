/**
 * Weather and environment overlays:
 *   - Precipitation radar: RainViewer public API (free, attribution required,
 *     tiles served up to zoom 7).
 *   - Lightning strike density: NOAA nowCOAST (NLDN + GLD360, 15-minute,
 *     U.S. government product). Covers 25°S–80°N, 110°E eastward to 0°.
 *   - Forest loss alerts: Global Forest Watch GLAD Landsat alerts (CC BY 4.0).
 *   - Surface wind: Open-Meteo current conditions on a 10° grid (CC BY 4.0).
 *   - Meteosat infrared clouds: EUMETSAT View WMS (0° service, 15-minute),
 *     filling the Europe / Africa gap between GOES-East and Himawari.
 *
 * Each timed source also exposes the frame times it has, so the map timeline
 * can step through them.
 */

import { expandTimeDimension } from './weather-timeline.mjs';

const UA = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' };

function rainviewerTiles(host, path) {
  // 256px tiles, colour scheme 2 (universal blue), smoothed, with snow.
  return [`${host}${path}/256/{z}/{x}/{y}/2/1_1.png`];
}

/**
 * RainViewer radar frames as MapLibre tile templates, oldest first. The
 * top-level `time` / `tiles` are the newest frame.
 */
export function parseRainviewerFrames(payload) {
  const host = payload?.host;
  const past = Array.isArray(payload?.radar?.past) ? payload.radar.past : [];
  if (!host) return null;
  const frames = past
    .filter((f) => f?.path && Number.isFinite(Number(f.time)))
    .map((f) => ({ time: new Date(Number(f.time) * 1000).toISOString(), tiles: rainviewerTiles(host, f.path) }));
  const latest = frames[frames.length - 1];
  if (!latest) return null;
  return { time: latest.time, tiles: latest.tiles, maxzoom: 7, frames };
}

export async function fetchRainviewerFrame({ fetchImpl = fetch } = {}) {
  const res = await fetchImpl('https://api.rainviewer.com/public/weather-maps.json', { headers: UA, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`RainViewer returned HTTP ${res.status}`);
  const frame = parseRainviewerFrames(await res.json());
  if (!frame) throw new Error('RainViewer returned no radar frames');
  return frame;
}

/**
 * Times listed in a WMS 1.3.0 GetCapabilities document for one layer's time
 * dimension, as epoch ms within [from, to].
 */
/** @param {string} xml @param {string} layerName @param {number} from @param {number} to @returns {number[]} */
export function parseWmsLayerTimes(xml, layerName, from, to) {
  const text = String(xml || '');
  const at = text.indexOf(`<Name>${layerName}</Name>`);
  if (at < 0) return [];
  const end = text.indexOf('</Layer>', at);
  const block = text.slice(at, end < 0 ? undefined : end);
  const dim = /<Dimension[^>]*name="time"[^>]*>([^<]*)<\/Dimension>/i.exec(block);
  return dim ? expandTimeDimension(dim[1], from, to) : [];
}

/** @param {string} url @param {string} layerName @param {number} from @param {number} to @param {typeof fetch} fetchImpl */
async function fetchWmsTimes(url, layerName, from, to, fetchImpl) {
  const res = await fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${res.status}`);
  return parseWmsLayerTimes(await res.text(), layerName, from, to);
}

const NOWCOAST_LIGHTNING = 'https://nowcoast.noaa.gov/geoserver/lightning_detection/wms';

/**
 * nowCOAST WMS lightning density. With `time` (ISO) it asks for that 15-minute
 * map; without, the newest one, with `t` changing every 15 minutes to refresh.
 */
/** @param {Date} [now] @param {string | null} [time] */
export function lightningTiles(now = new Date(), time = null) {
  const when = time ? `&time=${time}` : `&t=${Math.floor(now.getTime() / (15 * 60_000))}`;
  return [
    `${NOWCOAST_LIGHTNING}?service=WMS&version=1.3.0&request=GetMap` +
    '&layers=ldn_lightning_strike_density&styles=&format=image/png&transparent=true&crs=EPSG:3857' +
    `&width=256&height=256&bbox={bbox-epsg-3857}${when}`,
  ];
}

/** @param {{ fetchImpl?: typeof fetch, from: number, to: number }} options */
export function fetchLightningTimes({ fetchImpl = fetch, from, to }) {
  return fetchWmsTimes(`${NOWCOAST_LIGHTNING}?service=WMS&request=GetCapabilities&version=1.3.0`, 'ldn_lightning_strike_density', from, to, fetchImpl);
}

const EUMETSAT_WMS = 'https://view.eumetsat.int/geoserver/ows';

/**
 * Meteosat 0° infrared (10.8 µm). The disk is bounded so it only fills the gap
 * between GOES-East (to 5°E) and Himawari (from 70°E).
 */
/** @type {{ id: string, layer: string, maxzoom: number, bounds: [number, number, number, number] }} */
export const METEOSAT_LAYER = { id: 'meteosat', layer: 'msg_fes:ir108', maxzoom: 6, bounds: [5, -80, 70, 80] };
export const METEOSAT_ATTRIBUTION = 'Imagery: EUMETSAT (Meteosat)';

/** @param {string | null} [time] */
export function meteosatTiles(time = null) {
  return [
    `${EUMETSAT_WMS}?service=WMS&version=1.3.0&request=GetMap&layers=${METEOSAT_LAYER.layer}` +
    '&styles=&format=image/png&transparent=true&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}' +
    (time ? `&time=${time}` : ''),
  ];
}

/** @param {{ fetchImpl?: typeof fetch, from: number, to: number }} options */
export function fetchMeteosatTimes({ fetchImpl = fetch, from, to }) {
  // The per-layer capabilities document is ~7 KB (the global one is several MB)
  // and names the layer without its workspace prefix.
  return fetchWmsTimes('https://view.eumetsat.int/geoserver/msg_fes/ir108/ows?service=WMS&request=GetCapabilities&version=1.3.0', 'ir108', from, to, fetchImpl);
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
