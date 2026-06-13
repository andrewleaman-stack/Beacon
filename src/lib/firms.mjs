const FIRMS_SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];

const SATELLITE_NAMES = {
  N: 'Suomi-NPP',
  NPP: 'Suomi-NPP',
  S: 'Suomi-NPP',
  J1: 'NOAA-20',
  N20: 'NOAA-20',
  NOAA20: 'NOAA-20',
  T: 'Terra',
  A: 'Aqua',
};

export function getFirmsSources() {
  return [...FIRMS_SOURCES];
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeConfidence(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'nominal';
  if (raw === 'h' || raw === 'high') return 'high';
  if (raw === 'n' || raw === 'nominal' || raw === 'medium') return 'nominal';
  if (raw === 'l' || raw === 'low') return 'low';

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric >= 80) return 'high';
    if (numeric >= 30) return 'nominal';
    return 'low';
  }

  return 'nominal';
}

function normalizeSatellite(value) {
  const raw = String(value ?? '').trim();
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return SATELLITE_NAMES[key] || raw || 'Unknown';
}

function normalizeAcqTime(value) {
  return String(value ?? '').trim().padStart(4, '0').slice(-4);
}

export function buildFirmsTimestamp(acqDate, acqTime) {
  const time = normalizeAcqTime(acqTime);
  const iso = `${acqDate}T${time.slice(0, 2)}:${time.slice(2, 4)}:00.000Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeFirmsRecord(row, source) {
  const lat = toNumber(row.latitude);
  const lng = toNumber(row.longitude);
  const acqDate = String(row.acq_date || '').trim();
  const acqTime = normalizeAcqTime(row.acq_time);
  const timestamp = buildFirmsTimestamp(acqDate, acqTime);
  const brightness = toNumber(row.bright_ti4 ?? row.brightness ?? row.bright_t31);
  const brightT31 = toNumber(row.bright_ti5 ?? row.bright_t31 ?? row.brightness);

  return {
    id: `firms-${source}-${lat}-${lng}-${acqDate}-${acqTime}`,
    lat,
    lng,
    brightness,
    scan: toNumber(row.scan),
    track: toNumber(row.track),
    acq_date: acqDate,
    acq_time: acqTime,
    satellite: normalizeSatellite(row.satellite),
    instrument: String(row.instrument || (source.includes('MODIS') ? 'MODIS' : 'VIIRS')).trim(),
    confidence: normalizeConfidence(row.confidence),
    version: String(row.version || '').trim(),
    bright_t31: brightT31,
    frp: toNumber(row.frp),
    daynight: String(row.daynight || '').trim().toUpperCase() === 'N' ? 'N' : 'D',
    source,
    timestamp,
  };
}

export function parseFirmsCsv(csvText, source) {
  return parseCsv(csvText)
    .map((row) => normalizeFirmsRecord(row, source))
    .filter((record) => Number.isFinite(record.lat) && Number.isFinite(record.lng) && record.acq_date);
}

export async function fetchFirmsSource({ mapKey, source, area = 'world', days = 1, fetchImpl = fetch }) {
  if (!mapKey) throw new Error('FIRMS API key missing');
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${encodeURIComponent(source)}/${encodeURIComponent(area)}/${encodeURIComponent(days)}`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 active-fire-feed' },
  });

  if (!response.ok) {
    throw new Error(`FIRMS ${source} returned HTTP ${response.status}`);
  }

  const text = await response.text();
  return parseFirmsCsv(text, source);
}

export async function fetchFirmsFeeds({
  mapKey = '',
  sources = FIRMS_SOURCES,
  area = 'world',
  days = 1,
  fetchImpl = fetch,
} = {}) {
  const results = await Promise.allSettled(
    sources.map((source) => fetchFirmsSource({ mapKey, source, area, days, fetchImpl })),
  );

  const fires = [];
  const sourceStatus = [];

  results.forEach((result, index) => {
    const source = sources[index];
    if (result.status === 'fulfilled') {
      fires.push(...result.value);
      sourceStatus.push({ source, ok: true, count: result.value.length, error: null });
    } else {
      sourceStatus.push({ source, ok: false, count: 0, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  });

  fires.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')) || b.frp - a.frp);

  return { fires, sourceStatus };
}
