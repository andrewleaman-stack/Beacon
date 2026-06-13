const FRA_FORM54_URL = 'https://data.transportation.gov/resource/85tf-25kj.json';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function first(row, names) {
  for (const name of names) {
    if (row[name] != null && row[name] !== '') return row[name];
  }
  return '';
}

function severityFrom(row) {
  const killed = number(first(row, ['totkld', 'killed', 'total_killed', 'fatalities']), 0);
  const injured = number(first(row, ['totinj', 'injured', 'total_injured', 'injuries']), 0);
  const damage = number(first(row, ['damage', 'total_damage', 'total_damages']), 0);
  const type = clean(first(row, ['type', 'accident_type', 'accident_type_name'])).toLowerCase();
  if (killed > 0) return 'critical';
  if (injured > 0 || type.includes('collision') || type.includes('derail')) return 'high';
  if (damage >= 250_000) return 'elevated';
  return 'low';
}

function parseDate(row) {
  const direct = clean(first(row, ['date', 'incident_date', 'accident_date']));
  if (direct) return direct;
  const year = number(first(row, ['year', 'accident_year']));
  const month = number(first(row, ['month', 'accident_month']), 1);
  const day = number(first(row, ['day', 'accident_day']), 1);
  return year ? `${year}-${String(month || 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}` : '';
}

export function normalizeFraRailIncident(row) {
  const lat = number(first(row, ['latitude', 'lat']));
  const lng = number(first(row, ['longitude', 'lon', 'lng']));
  const id = clean(first(row, ['report_number', 'incident_number', 'accident_number', 'id'])) || `${clean(first(row, ['railroad', 'railroad_name', 'rr']))}-${parseDate(row)}`;
  const accidentType = clean(first(row, ['accident_type', 'type', 'type_name', 'accident_type_name']));
  return {
    id: `fra-${id}`,
    type: 'rail',
    title: `${accidentType || 'Rail equipment accident'}${clean(first(row, ['state'])) ? ` — ${clean(first(row, ['state']))}` : ''}`,
    description: clean(first(row, ['narrative', 'description'])) || 'FRA Form 54 rail equipment accident/incident record.',
    reportNumber: id,
    date: parseDate(row),
    state: clean(first(row, ['state', 'state_name', 'st'])),
    county: clean(first(row, ['county', 'county_name'])),
    city: clean(first(row, ['city', 'location'])),
    railroad: clean(first(row, ['railroad', 'railroad_name', 'rr', 'railroad_code'])),
    accidentType,
    cause: clean(first(row, ['cause', 'primary_cause', 'cause_code'])),
    trackType: clean(first(row, ['track_type', 'type_of_track'])),
    fatalities: number(first(row, ['totkld', 'killed', 'total_killed', 'fatalities']), 0),
    injuries: number(first(row, ['totinj', 'injured', 'total_injured', 'injuries']), 0),
    damage: number(first(row, ['damage', 'total_damage', 'total_damages']), 0),
    lat,
    lng,
    mappable: lat != null && lng != null,
    severity: severityFrom(row),
    source: 'FRA Rail Equipment Accident/Incident Data (Form 54)',
    sourceUrl: 'https://data.transportation.gov/dataset/Rail-Equipment-Accident-Incident-Data-Form-54/85tf-25kj',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchFraRailIncidents({ state = 'MI', limit = 50, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({ '$limit': String(Math.min(limit, 500)), '$order': ':id DESC' });
  if (state) params.set('state', state);
  const response = await fetchImpl(`${FRA_FORM54_URL}?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 fra-rail-incidents', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`FRA Form 54 Socrata returned HTTP ${response.status}`);
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map(normalizeFraRailIncident).filter(Boolean);
}
