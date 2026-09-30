/**
 * GDELT 2.0 Event Database — 15-minute export files.
 *
 * GDELT retired the GEO 2.0 API (api.gdeltproject.org/api/v2/geo/geo now
 * 404s), so this reads the raw event exports instead:
 *   https://data.gdeltproject.org/gdeltv2/lastupdate.txt  -> newest export
 *   https://data.gdeltproject.org/gdeltv2/<YYYYMMDDHHMMSS>.export.CSV.zip
 * Each export is a single tab-separated CSV (61 columns, no header).
 *
 * GDELT is machine-coded from news articles: treat events as leads, not
 * confirmed incidents. When GDELT is unreachable the caller gets an error or
 * the last good result — never invented events.
 */
import { inflateRawSync } from 'node:zlib';

const BASE = 'https://data.gdeltproject.org/gdeltv2';

// GDELT 2.0 event table column indexes.
const COL = {
  id: 0, sqlDate: 1, isRoot: 25, eventCode: 26, rootCode: 28, quadClass: 29, goldstein: 30,
  numMentions: 31, numSources: 32, avgTone: 34,
  geoType: 51, geoName: 52, geoCountry: 53, lat: 56, lng: 57,
  dateAdded: 59, sourceUrl: 60,
};

// CAMEO root codes worth showing on a situation map.
const ROOT_CODES = {
  '14': { label: 'Protest', type: 'unrest' },
  '18': { label: 'Assault', type: 'conflict' },
  '19': { label: 'Armed clash', type: 'conflict' },
  '20': { label: 'Mass violence', type: 'conflict' },
};

// Generic "unspecified" codes (180 assault, 190 military force) are where
// GDELT's coder dumps most false positives (court stories, politics, sport),
// so only specific sub-codes such as 183 bombing or 195 air strike are kept.
const NOISY_EVENT_CODES = new Set(['180', '190']);

// ActionGeo_Type: 1 country, 2 US state, 3 US city, 4 world city, 5 world ADM1.
// Only city-level points are precise enough to plot.
const CITY_GEO_TYPES = new Set([3, 4]);

/** Extract the first file from a ZIP archive (stored or deflated). */
export function unzipFirstEntry(buffer) {
  const buf = Buffer.from(buffer);
  // End of central directory record: search backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a ZIP archive');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cdOffset) !== 0x02014b50) throw new Error('Bad ZIP central directory');
  const method = buf.readUInt16LE(cdOffset + 10);
  const compressedSize = buf.readUInt32LE(cdOffset + 20);
  const localOffset = buf.readUInt32LE(cdOffset + 42);
  if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Bad ZIP local header');
  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + compressedSize);
  if (method === 0) return data;
  if (method === 8) return inflateRawSync(data);
  throw new Error(`Unsupported ZIP compression method ${method}`);
}

function sqlDateToIso(value) {
  const s = String(value || '');
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function dateAddedToIso(value) {
  const s = String(value || '');
  if (!/^\d{14}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
}

/**
 * Parse export rows into map events. Rows are grouped by rounded location and
 * event category so one incident reported by many articles becomes one point.
 */
export function parseGdeltExport(csvText, { now = new Date(), maxAgeDays = 3 } = {}) {
  const cutoff = new Date(now.getTime() - maxAgeDays * 86400_000).toISOString().slice(0, 10);
  const groups = new Map();
  for (const line of String(csvText || '').split('\n')) {
    if (!line) continue;
    const c = line.split('\t');
    if (c.length < 61) continue;
    const root = ROOT_CODES[c[COL.rootCode]];
    if (!root) continue;
    // Root events come from an article's lead; the rest are mostly passing mentions.
    if (c[COL.isRoot] !== '1') continue;
    if (NOISY_EVENT_CODES.has(c[COL.eventCode])) continue;
    if (!CITY_GEO_TYPES.has(Number(c[COL.geoType]))) continue;
    const lat = Number(c[COL.lat]);
    const lng = Number(c[COL.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const eventDate = sqlDateToIso(c[COL.sqlDate]);
    // GDELT re-codes old events whenever an article mentions them; keep recent ones.
    if (!eventDate || eventDate < cutoff) continue;

    const key = `${lat.toFixed(2)},${lng.toFixed(2)},${c[COL.rootCode]}`;
    const mentions = Number(c[COL.numMentions]) || 1;
    const existing = groups.get(key);
    if (existing) {
      existing.count += mentions;
      existing.sources += Number(c[COL.numSources]) || 0;
      if (mentions > existing._topMentions && c[COL.sourceUrl]) {
        existing.url = c[COL.sourceUrl];
        existing._topMentions = mentions;
      }
      continue;
    }
    const place = c[COL.geoName] || 'Unknown location';
    groups.set(key, {
      id: `gdelt-${c[COL.id]}`,
      lat,
      lng,
      name: `${root.label} — ${place}`,
      place,
      country: c[COL.geoCountry] || '',
      url: c[COL.sourceUrl] || '',
      html: '',
      type: root.type,
      cameoRoot: c[COL.rootCode],
      count: mentions,
      sources: Number(c[COL.numSources]) || 0,
      goldstein: Number(c[COL.goldstein]) || 0,
      eventDate,
      reportedAt: dateAddedToIso(c[COL.dateAdded]),
      shareimage: '',
      _topMentions: mentions,
    });
  }
  const events = [...groups.values()];
  for (const event of events) delete event._topMentions;
  return events;
}

/** Export file URLs for the newest `count` 15-minute intervals. */
export function exportUrlsFrom(lastUpdateText, count = 4) {
  const match = String(lastUpdateText || '').match(/(\d{14})\.export\.CSV\.zip/);
  if (!match) throw new Error('GDELT lastupdate.txt had no export entry');
  const s = match[1];
  const newest = Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14));
  const urls = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(newest - i * 15 * 60_000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
    urls.push(`${BASE}/${t}.export.CSV.zip`);
  }
  return urls;
}

export async function fetchGdeltEvents({ intervals = 4, limit = 300, fetchImpl = fetch, now = new Date() } = {}) {
  const headers = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' };
  const last = await fetchImpl(`${BASE}/lastupdate.txt`, { cache: 'no-store', headers, signal: AbortSignal.timeout(10_000) });
  if (!last.ok) throw new Error(`GDELT lastupdate returned HTTP ${last.status}`);
  const urls = exportUrlsFrom(await last.text(), intervals);

  const texts = [];
  let failures = 0;
  for (const url of urls) {
    try {
      const res = await fetchImpl(url, { cache: 'no-store', headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { failures++; continue; }
      texts.push(unzipFirstEntry(await res.arrayBuffer()).toString('utf8'));
    } catch {
      failures++;
    }
  }
  if (texts.length === 0) throw new Error(`All ${urls.length} GDELT export downloads failed`);

  const events = parseGdeltExport(texts.join('\n'), { now })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return { events, intervalsFetched: texts.length, intervalsFailed: failures };
}
