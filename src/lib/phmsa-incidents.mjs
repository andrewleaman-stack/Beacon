const PHMSA_SOCRATA_URL = 'https://data.transportation.gov/resource/qdme-9bbm.json';

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

function parseDate(row) {
  const direct = clean(first(row, ['incident_date', 'local_datetime', 'date', 'report_received_date', 'accident_date']));
  if (direct) return direct;
  const year = number(first(row, ['year', 'incident_year', 'iyear']));
  const month = number(first(row, ['month', 'incident_month', 'imonth']), 1);
  const day = number(first(row, ['day', 'incident_day', 'iday']), 1);
  return year ? `${year}-${String(month || 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}` : '';
}

function severityFrom(row) {
  const fatalities = number(first(row, ['fatalities', 'fatal', 'num_fatalities']), 0);
  const injuries = number(first(row, ['injuries', 'injured', 'num_injuries']), 0);
  const damage = number(first(row, ['total_property_damage', 'property_damage', 'total_cost', 'estimated_property_damage']), 0);
  const significant = clean(first(row, ['significant', 'significant_ind', 'significant_flag'])).toLowerCase();
  if (fatalities > 0) return 'critical';
  if (injuries > 0 || damage >= 1_000_000) return 'high';
  if (significant === 'yes' || significant === 'y' || significant === 'true' || damage >= 50_000) return 'elevated';
  return 'low';
}

export function normalizePhmsaIncident(row) {
  const lat = number(first(row, ['latitude', 'lat', 'incident_latitude']));
  const lng = number(first(row, ['longitude', 'lon', 'lng', 'incident_longitude']));
  const id = clean(first(row, ['incident_number', 'incident_id', 'report_number', 'id'])) || `${clean(first(row, ['operator_name', 'operator']))}-${parseDate(row)}`;
  return {
    id: `phmsa-${id}`,
    type: 'pipeline',
    title: clean(first(row, ['title'])) || `${clean(first(row, ['commodity_released', 'commodity', 'system_type'])) || 'Pipeline'} incident${clean(first(row, ['state'])) ? ` — ${clean(first(row, ['state']))}` : ''}`,
    description: clean(first(row, ['narrative', 'description', 'cause_details', 'cause'])) || 'PHMSA pipeline incident record.',
    incidentNumber: id,
    date: parseDate(row),
    state: clean(first(row, ['state', 'state_name'])),
    county: clean(first(row, ['county', 'county_name'])),
    city: clean(first(row, ['city', 'location_city'])),
    operator: clean(first(row, ['operator_name', 'operator'])),
    systemType: clean(first(row, ['system_type', 'pipeline_system_type'])),
    commodity: clean(first(row, ['commodity_released', 'commodity'])),
    cause: clean(first(row, ['cause', 'cause_category', 'cause_subcategory'])),
    fatalities: number(first(row, ['fatalities', 'fatal', 'num_fatalities']), 0),
    injuries: number(first(row, ['injuries', 'injured', 'num_injuries']), 0),
    propertyDamage: number(first(row, ['total_property_damage', 'property_damage', 'total_cost', 'estimated_property_damage']), 0),
    lat,
    lng,
    mappable: lat != null && lng != null,
    severity: severityFrom(row),
    source: 'PHMSA Pipeline Incident Flagged Files',
    sourceUrl: 'https://data.transportation.gov/Pipelines-and-Hazmat/Pipeline-Incident-Flagged-Files/qdme-9bbm',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchPhmsaIncidents({ state = 'MI', limit = 50, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({ '$limit': String(Math.min(limit, 500)), '$order': ':id DESC' });
  if (state) params.set('state', state);
  const response = await fetchImpl(`${PHMSA_SOCRATA_URL}?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 phmsa-incidents', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`PHMSA Socrata returned HTTP ${response.status}`);
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map(normalizePhmsaIncident).filter(Boolean);
}
