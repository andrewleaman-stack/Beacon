/**
 * NASA GIBS (Global Imagery Browse Services) raster layers. Public, keyless,
 * CORS-enabled WMTS tiles in Web Mercator.
 * https://nasa-gibs.github.io/gibs-api-docs/
 */

import { expandTimeDimension } from './weather-timeline.mjs';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

/** GIBS dates are UTC days; yesterday is the newest complete global mosaic. */
export function gibsDate(now = new Date(), daysBack = 1) {
  return new Date(now.getTime() - daysBack * 86400_000).toISOString().slice(0, 10);
}

/** A cache-busting token that changes every `minutes` so live tiles refresh. */
export function refreshToken(now = new Date(), minutes = 10) {
  return String(Math.floor(now.getTime() / (minutes * 60_000)));
}

export function trueColorTiles(now = new Date()) {
  return [`${GIBS}/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${gibsDate(now)}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`];
}

/**
 * Near-real-time (10-minute) geostationary infrared, about 1-1.5 hours behind
 * real time. GOES-East covers the Americas and Atlantic, GOES-West the
 * Pacific, Himawari East Asia and Oceania; Meteosat (EUMETSAT, see
 * weather-layers.mjs) fills Europe and Africa. Infrared rather than GeoColor:
 * GIBS stops publishing GeoColor overnight, so it goes hours stale.
 */
/** @typedef {{ id: string, layer: string, matrix: string, maxzoom: number, bounds: [number, number, number, number] }} LiveCloudLayer */
/** @type {LiveCloudLayer[]} */
export const LIVE_CLOUD_LAYERS = [
  // GIBS returns HTTP 500 for tiles outside a satellite's disk, so each layer is bounded.
  // GOES-West's disk crosses the antimeridian; its far-west part is left to Himawari.
  { id: 'goes-west', layer: 'GOES-West_ABI_Band13_Clean_Infrared', matrix: 'GoogleMapsCompatible_Level6', maxzoom: 6, bounds: [-180, -80, -65, 80] },
  { id: 'goes-east', layer: 'GOES-East_ABI_Band13_Clean_Infrared', matrix: 'GoogleMapsCompatible_Level6', maxzoom: 6, bounds: [-155, -80, 5, 80] },
  { id: 'himawari', layer: 'Himawari_AHI_Band13_Clean_Infrared', matrix: 'GoogleMapsCompatible_Level6', maxzoom: 6, bounds: [70, -80, 180, 80] },
];

/** GIBS WMTS time token: whole seconds, UTC, with a Z. */
/** @param {number} ms */
export function gibsTime(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Tiles for one geostationary layer. With `time` (epoch ms, one of the times
 * GIBS lists for the layer) that exact frame; without, GIBS's newest, with a
 * token that changes every 10 minutes so the tiles refresh.
 */
/** @param {LiveCloudLayer} layerDef @param {Date} [now] @param {number | null} [time] */
export function liveCloudTiles(layerDef, now = new Date(), time = null) {
  const base = `${GIBS}/${layerDef.layer}/default`;
  if (time != null) return [`${base}/${gibsTime(time)}/${layerDef.matrix}/{z}/{y}/{x}.png`];
  return [`${base}/default/${layerDef.matrix}/{z}/{y}/{x}.png?t=${refreshToken(now)}`];
}

/** GIBS DescribeDomains: the times a layer has between two instants (small XML, unlike GetCapabilities). */
/** @param {LiveCloudLayer} layerDef @param {number} from @param {number} to */
export function describeDomainsUrl(layerDef, from, to) {
  return `${GIBS}/1.0.0/${layerDef.layer}/default/${layerDef.matrix}/all/${gibsTime(from)}--${gibsTime(to)}.xml`;
}

/** @param {string} xml @param {number} from @param {number} to @returns {number[]} */
export function parseDescribeDomains(xml, from, to) {
  const text = String(xml || '');
  const block = /<DimensionDomain>[\s\S]*?<ows:Identifier>time<\/ows:Identifier>[\s\S]*?<Domain>([^<]*)<\/Domain>/i.exec(text);
  return block ? expandTimeDimension(block[1], from, to) : [];
}

/** @param {LiveCloudLayer} layerDef @param {{ fetchImpl?: typeof fetch, from: number, to: number }} options */
export async function fetchCloudTimes(layerDef, { fetchImpl = fetch, from, to }) {
  const res = await fetchImpl(describeDomainsUrl(layerDef, from, to), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`GIBS DescribeDomains ${layerDef.id}: HTTP ${res.status}`);
  return parseDescribeDomains(await res.text(), from, to);
}

export const GIBS_ATTRIBUTION = 'Imagery: NASA GIBS / EOSDIS (NOAA-20 VIIRS, GOES, Himawari)';
