const FEMA_BASE = 'https://www.fema.gov/api/open/v2';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFemaDisastersUrl({ state, limit = 100, incidentType, since } = {}) {
  const filter = [];
  if (state) filter.push(`state eq '${state}'`);
  if (incidentType) filter.push(`incidentType eq '${incidentType}'`);
  if (since) filter.push(`declarationDate ge ${since}`);

  const params = new URLSearchParams({
    '$format': 'json',
    '$top': String(limit),
    '$orderby': 'declarationDate desc',
  });
  if (filter.length) params.set('$filter', filter.join(' and '));
  return `${FEMA_BASE}/DisasterDeclarationsSummaries?${params.toString()}`;
}

function parseFemaDeclaration(raw) {
  const lat = number(raw.latitude);
  const lng = number(raw.longitude);
  const designation = clean(raw.designatedArea);
  const [cityCounty, state] = designation.includes(',') ? designation.split(',').map(clean) : [designation, ''];

  return {
    id: `fema-${raw.disasterNumber}-${raw.fipsStateCode}-${raw.fipsCountyCode || '000'}`,
    disasterNumber: number(raw.disasterNumber),
    femaDeclarationString: clean(raw.femaDeclarationString),
    declarationType: clean(raw.declarationType),
    declarationDate: clean(raw.declarationDate),
    incidentType: clean(raw.incidentType),
    incidentTitle: clean(raw.declarationTitle),
    incidentBeginDate: clean(raw.incidentBeginDate),
    incidentEndDate: clean(raw.incidentEndDate),
    state: clean(raw.state),
    stateFips: clean(raw.fipsStateCode),
    county: clean(cityCounty),
    countyFips: clean(raw.fipsCountyCode),
    region: number(raw.region),
    iaProgram: Boolean(raw.iaProgramDeclared),
    paProgram: Boolean(raw.paProgramDeclared),
    hmProgram: Boolean(raw.hmProgramDeclared),
    lat,
    lng,
    source: 'FEMA Disaster Declarations',
    sourceUrl: `https://www.fema.gov/disaster/${raw.disasterNumber}`,
    fetchedAt: new Date().toISOString(),
  };
}

export function normalizeFemaDeclaration(raw) {
  return parseFemaDeclaration(raw);
}

/**
 * @param {{ state?: string; limit?: number; incidentType?: string; since?: string; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchFemaDisasters({ state, limit = 100, incidentType, since, fetchImpl = fetch } = {}) {
  const url = buildFemaDisastersUrl({ state, limit, incidentType, since });
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 fema-disasters' },
  });
  if (!response.ok) throw new Error(`FEMA returned HTTP ${response.status}`);
  const data = await response.json();
  const declarations = data.DisasterDeclarationsSummaries || [];
  return declarations.map(normalizeFemaDeclaration).filter(Boolean);
}

/**
 * @param {{ state?: string; days?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<any[]>}
 */
export async function fetchActiveFemaDisasters({ state, days = 365, fetchImpl = fetch } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  return fetchFemaDisasters({ state, limit: 200, since, fetchImpl });
}
