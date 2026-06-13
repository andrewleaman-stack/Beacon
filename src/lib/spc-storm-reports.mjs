const SPC_REPORTS_BASE = 'https://www.spc.noaa.gov/climo/reports';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  return cells.map(clean);
}

function reportDate(day, now) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (day === 'yesterday') date.setUTCDate(date.getUTCDate() - 1);
  return date;
}

function reportedAt(day, time, now) {
  const normalized = clean(time).padStart(4, '0').slice(-4);
  const date = reportDate(day, now);
  date.setUTCHours(Number(normalized.slice(0, 2)), Number(normalized.slice(2, 4)), 0, 0);
  return date.toISOString();
}

function typeFromHeader(header) {
  if (header.includes('F_Scale')) return 'tornado';
  if (header.includes('Speed')) return 'wind';
  if (header.includes('Size')) return 'hail';
  return null;
}

function severity(type, magnitude) {
  const value = number(magnitude, 0);
  if (type === 'tornado') return 'critical';
  if (type === 'wind') return value >= 65 ? 'high' : value >= 58 ? 'elevated' : 'low';
  if (type === 'hail') return value >= 2 ? 'high' : value >= 1 ? 'elevated' : 'low';
  return 'low';
}

export function normalizeSpcStormReport({ type, row, day = 'today', now = new Date() }) {
  const lat = number(row.Lat);
  const lng = number(row.Lon);
  if (lat == null || lng == null) return null;
  const magnitude = clean(row.F_Scale || row.Speed || row.Size || 'UNK');
  const time = clean(row.Time);
  return {
    id: `spc-${day}-${type}-${time}-${lat}-${lng}`,
    type,
    magnitude,
    location: clean(row.Location),
    county: clean(row.County),
    state: clean(row.State),
    lat,
    lng,
    comments: clean(row.Comments),
    severity: severity(type, magnitude),
    reportedAt: reportedAt(day, time, now),
    source: 'NOAA SPC',
    sourceUrl: `https://www.spc.noaa.gov/climo/reports/${day}.html`,
  };
}

export function parseSpcStormReportsCsv(csvText, day = 'today', now = new Date()) {
  const reports = [];
  let headers = [];
  let type = null;

  for (const rawLine of String(csvText || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const cells = parseCsvLine(line);
    if (cells[0] === 'Time') {
      headers = cells;
      type = typeFromHeader(headers);
      continue;
    }
    if (!headers.length || !type) continue;
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    const report = normalizeSpcStormReport({ type, row, day, now });
    if (report) reports.push(report);
  }
  return reports;
}

export async function fetchSpcStormReports({ days = ['today', 'yesterday'], fetchImpl = fetch, now = new Date() } = {}) {
  const results = await Promise.allSettled(days.map(async (day) => {
    const response = await fetchImpl(`${SPC_REPORTS_BASE}/${day}.csv`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BEACON/1.0 spc-storm-reports' },
    });
    if (!response.ok) throw new Error(`SPC ${day} returned HTTP ${response.status}`);
    return parseSpcStormReportsCsv(await response.text(), day, now);
  }));

  const reports = [];
  const sourceStatus = [];
  results.forEach((result, index) => {
    const day = days[index];
    if (result.status === 'fulfilled') {
      reports.push(...result.value);
      sourceStatus.push({ source: `NOAA SPC ${day}`, ok: true, count: result.value.length, error: null });
    } else {
      sourceStatus.push({ source: `NOAA SPC ${day}`, ok: false, count: 0, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  });

  reports.sort((a, b) => String(b.reportedAt).localeCompare(String(a.reportedAt)));
  return { reports, sourceStatus };
}
