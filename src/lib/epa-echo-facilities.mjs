const EPA_ECHO_CWA_BASE = 'https://echodata.epa.gov/echo/cwa_rest_services';

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

export function parseEpaEchoCsv(csvText) {
  const lines = String(csvText || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

export function normalizeEpaEchoFacility(raw) {
  const lat = number(raw.FacLat || raw.Latitude || raw.Lat83 || raw.CWPLatitude, null);
  const lng = number(raw.FacLong || raw.Longitude || raw.Long83 || raw.CWPLongitude, null);

  const id = clean(raw.SourceID || raw.RegistryID || raw.FacilityID || raw.FRSID || raw.CWPID || raw.CWPName);
  return {
    id: `epa-echo-${id}`,
    name: clean(raw.CWPName || raw.FacilityName || raw.FacName),
    lat,
    lng,
    mappable: lat != null && lng != null,
    address: clean(raw.CWPStreet || raw.StreetAddress || raw.FacStreet),
    city: clean(raw.CWPCity || raw.CityName || raw.FacCity),
    county: clean(raw.FacStdCountyName || raw.CountyName),
    state: clean(raw.CWPState || raw.StateCode),
    program: clean(raw.Statute || 'CWA'),
    permitId: clean(raw.SourceID),
    district: clean(raw.CWPStateDistrict),
    designFlow: number(raw.CWPTotalDesignFlowNmbr),
    peopleOfColorPercent: number(raw.PercentPeopleOfColor),
    populationDensity: number(raw.AcsPopulationDensity),
    effectiveDate: clean(raw.CWPEffectiveDate),
    source: 'EPA ECHO CWA',
    sourceUrl: id ? `https://echo.epa.gov/detailed-facility-report?fid=${encodeURIComponent(id)}` : 'https://echo.epa.gov/',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchEpaEchoFacilities({ state = 'MI', limit = 500, fetchImpl = fetch } = {}) {
  const queryParams = new URLSearchParams({ output: 'JSON', p_st: state });
  const queryResponse = await fetchImpl(`${EPA_ECHO_CWA_BASE}.get_facilities?${queryParams.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 epa-echo', 'Accept': 'application/json' },
  });
  if (!queryResponse.ok) throw new Error(`EPA ECHO query returned HTTP ${queryResponse.status}`);
  const queryPayload = await queryResponse.json();
  const qid = queryPayload?.Results?.QueryID;
  if (!qid) throw new Error('EPA ECHO query did not return QueryID');

  const downloadParams = new URLSearchParams({ output: 'CSV', qid: String(qid) });
  const downloadResponse = await fetchImpl(`${EPA_ECHO_CWA_BASE}.get_download?${downloadParams.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 epa-echo', 'Accept': 'text/csv' },
  });
  if (!downloadResponse.ok) throw new Error(`EPA ECHO download returned HTTP ${downloadResponse.status}`);
  return parseEpaEchoCsv(await downloadResponse.text())
    .map(normalizeEpaEchoFacility)
    .filter(Boolean)
    .slice(0, limit);
}
