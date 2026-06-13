const PHMSA_CSV_URL = 'https://www.phmsa.dot.gov/data-and-statistics/pipeline/pipeline-incident-20-year-trends';

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
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
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

function parsePhmsaCsv(csvText) {
  const lines = String(csvText || '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const incidents = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < headers.length) continue;
    const row = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? '']));
    incidents.push(row);
  }
  return incidents;
}

function normalizePhmsaIncident(row) {
  const lat = number(row.Latitude || row.latitude);
  const lng = number(row.Longitude || row.longitude);
  if (lat == null || lng == null) return null;

  const year = number(row.Year || row.year);
  const month = number(row.Month || row.month);
  const day = number(row.Day || row.day);
  const dateStr = year ? `${year}-${String(month || 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}` : new Date().toISOString().split('T')[0];

  return {
    id: `phmsa-${row.IncidentNumber || row.incident_number || row.INCIDENT_NUMBER || `${year}-${i}`}`,
    incidentNumber: clean(row.IncidentNumber || row.incident_number),
    date: dateStr,
    year,
    month,
    day,
    systemType: clean(row.SystemType || row.system_type || row.SYSTEM_TYPE),
    commodity: clean(row.Commodity || row.commodity || row.COMMODITY),
    incidentType: clean(row.IncidentType || row.incident_type || row.INCIDENT_TYPE),
    cause: clean(row.Cause || row.cause || row.CAUSE),
    fatalities: number(row.Fatalities || row.fatalities, 0),
    injuries: number(row.Injuries || row.injuries, 0),
    propertyDamage: number(row.PropertyDamage || row.property_damage || row.PROPERTY_DAMAGE, 0),
    barrelsReleased: number(row.BarrelsReleased || row.barrels_released || row.BARRELS_RELEASED, 0),
    mcfReleased: number(row.McfReleased || row.mcf_released || row.MCF_RELEASED, 0),
    operator: clean(row.OperatorName || row.operator_name || row.OPERATOR_NAME),
    state: clean(row.State || row.state || row.STATE),
    county: clean(row.County || row.county || row.COUNTY),
    city: clean(row.City || row.city || row.CITY),
    lat,
    lng,
    source: 'PHMSA Pipeline Incidents',
    sourceUrl: 'https://www.phmsa.dot.gov/data-and-statistics/pipeline',
    fetchedAt: new Date().toISOString(),
    severity: row.Fatalities > 0 ? 'critical' : row.Injuries > 0 ? 'high' : row.PropertyDamage > 100000 ? 'high' : 'elevated',
  };
}

export function parsePhmsaIncidentsCsv(csvText) {
  return parsePhmsaCsv(csvText).map(normalizePhmsaIncident).filter(Boolean);
}

export async function fetchPhmsaIncidents({ year, fetchImpl = fetch } = {}) {
  const url = year
    ? `https://www.phmsa.dot.gov/sites/phmsa.dot.gov/files/${year}_pipeline_incidents.csv`
    : 'https://www.phmsa.dot.gov/sites/phmsa.dot.gov/files/pipeline_incidents_2020_present.csv';

  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 phmsa-incidents' },
  });
  if (!response.ok) throw new Error(`PHMSA returned HTTP ${response.status}`);
  return parsePhmsaIncidentsCsv(await response.text());
}
