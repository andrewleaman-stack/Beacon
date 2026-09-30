/**
 * NASA GIBS (Global Imagery Browse Services) raster layers. Public, keyless,
 * CORS-enabled WMTS tiles in Web Mercator.
 * https://nasa-gibs.github.io/gibs-api-docs/
 */

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
 * Near-real-time (10-minute) geostationary views. GOES-East covers the
 * Americas and Atlantic, GOES-West the Pacific; Himawari infrared covers
 * East Asia and Oceania. "default" asks GIBS for the newest available time.
 */
export const LIVE_CLOUD_LAYERS = [
  { id: 'goes-west', layer: 'GOES-West_ABI_GeoColor', matrix: 'GoogleMapsCompatible_Level7', maxzoom: 7 },
  { id: 'goes-east', layer: 'GOES-East_ABI_GeoColor', matrix: 'GoogleMapsCompatible_Level7', maxzoom: 7 },
  // Himawari's disk is centred on 140.7°E; GIBS returns HTTP 500 outside it, so bound the requests.
  { id: 'himawari', layer: 'Himawari_AHI_Band13_Clean_Infrared', matrix: 'GoogleMapsCompatible_Level6', maxzoom: 6, bounds: [70, -80, 180, 80] },
];

export function liveCloudTiles(layerDef, now = new Date()) {
  return [`${GIBS}/${layerDef.layer}/default/default/${layerDef.matrix}/{z}/{y}/{x}.png?t=${refreshToken(now)}`];
}

export const GIBS_ATTRIBUTION = 'Imagery: NASA GIBS / EOSDIS (NOAA-20 VIIRS, GOES, Himawari)';
