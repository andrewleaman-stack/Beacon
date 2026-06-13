const NIFC_FEATURE_SERVICE = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_YearToDate/FeatureServer/0/query';

function num(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function arcgisTime(value) {
  const timestamp = num(value);
  return timestamp == null ? null : new Date(timestamp).toISOString();
}

export function buildNifcQueryUrl({ limit = 250 } = {}) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: [
      'OBJECTID',
      'poly_IncidentName',
      'poly_GISAcres',
      'poly_DateCurrent',
      'attr_IncidentSize',
      'attr_PercentContained',
      'attr_FireDiscoveryDateTime',
      'attr_POOCounty',
      'attr_POOState',
      'attr_FireCause',
    ].join(','),
    returnGeometry: 'true',
    returnCentroid: 'true',
    f: 'json',
    resultRecordCount: String(limit),
    orderByFields: 'poly_DateCurrent desc',
  });
  return `${NIFC_FEATURE_SERVICE}?${params.toString()}`;
}

export function normalizeNifcFeature(feature) {
  const attributes = feature?.attributes || {};
  const centroid = feature?.centroid || {};
  const objectId = attributes.OBJECTID ?? attributes.OBJECTId ?? attributes.objectid;
  const lat = num(centroid.y);
  const lng = num(centroid.x);
  if (lat == null || lng == null) return null;
  const containment = num(attributes.attr_PercentContained);

  return {
    id: `nifc-${objectId}`,
    name: text(attributes.poly_IncidentName, 'Unnamed fire'),
    lat,
    lng,
    acres: num(attributes.poly_GISAcres, 0),
    incidentSize: num(attributes.attr_IncidentSize, 0),
    containment,
    county: text(attributes.attr_POOCounty),
    state: text(attributes.attr_POOState),
    cause: text(attributes.attr_FireCause, 'Unknown'),
    discoveredAt: arcgisTime(attributes.attr_FireDiscoveryDateTime),
    updatedAt: arcgisTime(attributes.poly_DateCurrent),
    source: 'NIFC WFIGS',
    sourceUrl: 'https://data-nifc.opendata.arcgis.com/',
    status: containment != null && containment >= 100 ? 'contained' : 'active',
  };
}

export async function fetchNifcFirePerimeters({ limit = 250, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(buildNifcQueryUrl({ limit }), {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 nifc-fire-perimeters' },
  });
  if (!response.ok) throw new Error(`NIFC returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`NIFC error: ${payload.error.message || payload.error.code}`);
  return (payload.features || []).map(normalizeNifcFeature).filter(Boolean);
}
