const EPA_ECHO_BASE = 'https://echo.epa.gov/tools/web-services/facility-search-all-data';

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildEpaEchoUrl({ state, limit = 1000, offset = 0 } = {}) {
  const params = new URLSearchParams({
    output: 'JSON',
    qcolumns: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30',
    limit: String(limit),
    offset: String(offset),
  });
  if (state) params.set('state', state);
  return `${EPA_ECHO_BASE}?${params.toString()}`;
}

export function normalizeEpaEchoFacility(raw) {
  const lat = number(raw.Lat83);
  const lng = number(raw.Long83);
  if (lat == null || lng == null) return null;

  return {
    id: `epa-${raw.FacilityID || raw.FACILITY_ID || raw.REGISTRY_ID}`,
    name: clean(raw.FacilityName || raw.FACILITY_NAME),
    lat,
    lng,
    address: clean(raw.StreetAddress || raw.STREET_ADDRESS),
    city: clean(raw.CityName || raw.CITY_NAME),
    county: clean(raw.CountyName || raw.COUNTY_NAME),
    state: clean(raw.StateCode || raw.STATE_CODE),
    zip: clean(raw.ZipCode || raw.ZIP_CODE),
    programs: clean(raw.ProgramAcronyms || raw.PROGRAM_ACRONYMS),
    complianceStatus: clean(raw.ComplianceStatus || raw.COMPLIANCE_STATUS),
    enforcementActions: number(raw.EnforcementActionCount || raw.ENFORCEMENT_ACTION_COUNT, 0),
    violations: number(raw.ViolationCount || raw.VIOLATION_COUNT, 0),
    source: 'EPA ECHO',
    sourceUrl: `https://echo.epa.gov/detailed-facility-report?fid=${raw.FacilityID || raw.REGISTRY_ID}`,
    fetchedAt: new Date().toISOString(),
  };
}

export function parseEpaEchoResponse(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    const results = data.Results || data.results || data;
    return Array.isArray(results) ? results : (results?.Facilities || results?.facilities || []);
  } catch {
    return [];
  }
}

export async function fetchEpaEchoFacilities({ state, limit = 1000, fetchImpl = fetch } = {}) {
  const allFacilities = [];
  let offset = 0;
  const pageSize = Math.min(limit, 1000);

  while (allFacilities.length < limit) {
    const url = buildEpaEchoUrl({ state, limit: pageSize, offset });
    const response = await fetchImpl(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BEACON/1.0 epa-echo', 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`EPA ECHO returned HTTP ${response.status}`);
    const raw = await response.json();
    const facilities = parseEpaEchoResponse(raw);
    if (!facilities.length) break;
    const normalized = facilities.map(normalizeEpaEchoFacility).filter(Boolean);
    allFacilities.push(...normalized);
    if (normalized.length < pageSize) break;
    offset += pageSize;
  }
  return allFacilities.slice(0, limit);
}
