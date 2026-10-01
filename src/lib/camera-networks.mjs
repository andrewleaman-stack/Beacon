// Parsers for open, keyless government traffic-camera networks. Each turns the
// agency's own format into BEACON camera records with an https snapshot URL.

/** @typedef {{ id: string, lat: number, lng: number, name: string, city: string, country: string, feed_url: string, thumb_url?: string, source: string }} Cam */

const valid = (/** @type {Cam} */ c) =>
  Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180
  && !(c.lat === 0 && c.lng === 0) && /^https:\/\//.test(c.feed_url);

const clean = (/** @type {unknown} */ s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Michigan DOT MiDrive: /MiDrive/camera/list. Coordinates and the id live inside an
 * HTML link in `county`; the snapshot is inside an <img> in `image`.
 * @param {any[]} list
 * @returns {Cam[]}
 */
export function parseMichigan(list) {
  if (!Array.isArray(list)) return [];
  return list.map((c) => {
    const where = String(c?.county || '').match(/lat=([-\d.]+)&lon=([-\d.]+)[^"]*?id=(\d+)/);
    const img = String(c?.image || '').match(/src="(https:\/\/[^"]+)"/);
    if (!where || !img) return null;
    // Thumbnails 301 to the full image; link the full image directly.
    const feed = img[1].replace(/\/thumbs\/([^/?]+?)\.flv\.jpg(\?.*)?$/, '/$1.jpg').replace(/\?item=\d+$/, '');
    const county = clean(String(c.county).replace(/<a[\s\S]*$/, ''));
    return {
      id: `mi-${where[3]}`, lat: Number(where[1]), lng: Number(where[2]),
      name: `${clean(c.route)}${clean(c.location) ? ` ${clean(c.location)}` : ''}`.trim() || 'Michigan camera',
      city: county || 'Michigan', country: 'US', feed_url: feed, source: 'MDOT Michigan',
    };
  }).filter((c) => c !== null && valid(c));
}

/**
 * Finland Fintraffic Digitraffic weather cameras: /api/weathercam/v1/stations (GeoJSON).
 * One record per station, using its first preset that is being collected.
 * @param {any} geo
 * @returns {Cam[]}
 */
export function parseFinland(geo) {
  const features = Array.isArray(geo?.features) ? geo.features : [];
  return features.map((f) => {
    const p = f?.properties || {};
    const [lng, lat] = f?.geometry?.coordinates || [];
    const preset = (p.presets || []).find((x) => x?.inCollection) || (p.presets || [])[0];
    if (!preset?.id || (p.collectionStatus && p.collectionStatus !== 'GATHERING')) return null;
    // Station names look like "kt51_Inkoo" (road 51, Inkoo).
    const m = String(p.name || '').match(/^(vt|kt|st|mt|yt)(\d+)_(.+)$/i);
    const place = clean((m ? m[3] : p.name || '').replace(/_/g, ' '));
    const road = m ? `${m[1].toLowerCase() === 'vt' ? 'Highway' : 'Road'} ${m[2]}` : '';
    return {
      id: `fi-${p.id}`, lat: Number(lat), lng: Number(lng),
      name: [place, road].filter(Boolean).join(' · ') || 'Finland road camera',
      city: place || 'Finland', country: 'Finland',
      feed_url: `https://weathercam.digitraffic.fi/${preset.id}.jpg`,
      // Full frames are ~300 KB; the wall uses the 20 KB thumbnail.
      thumb_url: `https://weathercam.digitraffic.fi/${preset.id}.jpg?thumbnail=true`, source: 'Fintraffic',
    };
  }).filter((c) => c !== null && valid(c));
}

/**
 * Hong Kong Transport Department: Traffic_Camera_Locations_En.xml.
 * @param {string} xml
 * @returns {Cam[]}
 */
export function parseHongKong(xml) {
  if (typeof xml !== 'string') return [];
  /** @param {string} block @param {string} name */
  const tag = (block, name) => { const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? m[1].trim() : ''; };
  return (xml.match(/<image>[\s\S]*?<\/image>/g) || []).map((b) => ({
    id: `hk-${tag(b, 'key')}`, lat: Number(tag(b, 'latitude')), lng: Number(tag(b, 'longitude')),
    name: clean(tag(b, 'description').replace(/\s*\[[^\]]+\]\s*$/, '')) || 'Hong Kong camera',
    city: clean(tag(b, 'district')) || 'Hong Kong', country: 'Hong Kong',
    feed_url: tag(b, 'url').replace(/^http:/, 'https:'), source: 'HK Transport Dept',
  })).filter(valid);
}

/**
 * Iceland Road Administration (Vegagerðin): /api/vefmyndavelar2014_1.
 * Stations have several views; each view is its own camera.
 * @param {any[]} list
 * @returns {Cam[]}
 */
export function parseIceland(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.map((c) => {
    const url = String(c?.Slod || '').replace(/^http:/, 'https:');
    if (!url || seen.has(url)) return null;
    seen.add(url);
    const file = url.split('/').pop()?.replace(/\.jpg$/i, '') || String(c?.Maelist_nr);
    return {
      id: `is-${file}`, lat: Number(c?.Breidd), lng: Number(c?.Lengd),
      name: clean(c?.Skyring) || clean(c?.Myndavel) || 'Iceland road camera',
      city: clean(c?.Myndavel) || 'Iceland', country: 'Iceland', feed_url: url, source: 'Vegagerðin',
    };
  }).filter((c) => c !== null && valid(c));
}

/**
 * New Zealand Transport Agency (NZTA) traffic cameras: /service/traffic/rest/4/cameras/all.
 * @param {any} json
 * @returns {Cam[]}
 */
export function parseNewZealand(json) {
  const list = json?.response?.camera;
  const cams = Array.isArray(list) ? list : list ? [list] : [];
  return cams.filter((c) => c && !c.offline && !c.underMaintenance).map((c) => ({
    id: `nz-${c.id}`, lat: Number(c.latitude), lng: Number(c.longitude),
    name: clean(c.name) || 'NZ traffic camera',
    city: clean(c.region?.name) || 'New Zealand', country: 'New Zealand',
    feed_url: /^https:/.test(c.imageUrl || '') ? c.imageUrl : `https://trafficnz.info${c.imageUrl || `/camera/${c.id}.jpg`}`,
    source: 'NZTA',
  })).filter(valid);
}

/**
 * Washington State DOT: data.wsdot.wa.gov/travelcenter/Cameras.json (ArcGIS JSON in
 * Web Mercator, EPSG:3857). Some cameras are hosted by neighbouring agencies.
 * @param {any} json
 * @returns {Cam[]}
 */
export function parseWsdot(json) {
  const features = Array.isArray(json?.features) ? json.features : [];
  const R = 6378137;
  return features.map((f) => {
    const a = f?.attributes || {};
    const x = Number(f?.geometry?.x), y = Number(f?.geometry?.y);
    const lng = (x / R) * (180 / Math.PI);
    const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);
    return {
      id: `wsdot-${a.CameraID}`, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)),
      name: clean(a.CameraTitle) || 'WSDOT camera', city: 'Washington', country: 'US',
      feed_url: String(a.ImageURL || '').replace(/^http:/, 'https:'), source: 'WSDOT',
    };
  }).filter(valid);
}

/**
 * Caltrans CWWP2 per-district status: { data: [{ cctv: { location, inService, imageData } }] }.
 * Snapshots for grids, plus the HLS stream when the camera has one.
 * @param {any} json
 * @returns {(Cam & { stream_url?: string, stream_type?: 'hls' })[]}
 */
export function parseCaltrans(json) {
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map((row) => {
    const c = row?.cctv || row || {};
    if (String(c.inService) === 'false') return null;
    const loc = c.location || {};
    const img = c.imageData || {};
    const feed = String(img.static?.currentImageURL || '').replace(/^http:/, 'https:');
    const stream = String(img.streamingVideoURL || '');
    const id = feed.split('/').slice(-2, -1)[0] || `${loc.district}-${c.index}`;
    return {
      id: `cal-${id}`, lat: Number(loc.latitude), lng: Number(loc.longitude),
      name: clean(String(loc.locationName || '').replace(/^\([^)]*\)\s*/, '')) || 'Caltrans camera',
      city: clean(loc.nearbyPlace) || clean(loc.county) || 'California', country: 'US',
      feed_url: feed, source: 'Caltrans',
      ...(/^https:\/\/.+\.m3u8$/.test(stream) ? { stream_url: stream, stream_type: /** @type {'hls'} */ ('hls') } : {}),
    };
  }).filter((c) => c !== null && valid(c));
}
