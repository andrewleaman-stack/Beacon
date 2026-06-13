export const DEFAULT_AIS_BOUNDING_BOXES = [
  // Great Lakes / Detroit River / Lake Erie corridor
  [[40.9, -84.0], [43.7, -78.5]],
  // St. Clair / Huron approaches
  [[42.0, -83.8], [45.0, -80.5]],
  // Major global chokepoints already represented in BEACON
  [[1.0, 103.0], [3.0, 104.5]],
  [[25.0, 54.0], [27.5, 57.5]],
  [[27.0, 32.0], [32.0, 33.5]],
  [[12.0, 42.5], [14.0, 44.0]],
  [[8.0, -80.5], [10.0, -79.0]],
];

function clean(value) {
  return String(value ?? '').trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseAisBoundingBoxes(value) {
  if (!value) return DEFAULT_AIS_BOUNDING_BOXES;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return DEFAULT_AIS_BOUNDING_BOXES;
    const valid = parsed.filter((box) => (
      Array.isArray(box)
      && box.length === 2
      && Array.isArray(box[0])
      && Array.isArray(box[1])
      && box[0].length === 2
      && box[1].length === 2
      && box.flat().every((item) => Number.isFinite(Number(item)))
    ));
    return valid.length ? valid : DEFAULT_AIS_BOUNDING_BOXES;
  } catch {
    return DEFAULT_AIS_BOUNDING_BOXES;
  }
}

export function shipTypeFromCode(typeCode) {
  const code = Number(typeCode);
  if (!Number.isFinite(code)) return 'cargo';
  if (code >= 80 && code <= 89) return 'tanker';
  if (code >= 70 && code <= 79) return 'cargo';
  if (code === 35 || code === 55) return 'military';
  if (code >= 60 && code <= 69) return 'passenger';
  if (code >= 30 && code <= 39) return 'service';
  return 'cargo';
}

export function normalizeAisStreamMessage(parsed, existing = {}) {
  const mmsi = parsed?.MetaData?.MMSI;
  if (!mmsi) return null;

  const next = {
    ...existing,
    id: mmsi,
    mmsi,
    source: 'AISStream',
    timestamp: Date.now(),
    last_seen: new Date().toISOString(),
  };

  const metadataName = clean(parsed?.MetaData?.ShipName);
  if (metadataName) next.name = metadataName;
  const metadataTime = clean(parsed?.MetaData?.time_utc);
  if (metadataTime) next.last_seen = metadataTime;

  if (parsed.MessageType === 'PositionReport' && parsed.Message?.PositionReport) {
    const report = parsed.Message.PositionReport;
    const lat = number(report.Latitude);
    const lng = number(report.Longitude);
    if (lat != null) next.lat = lat;
    if (lng != null) next.lng = lng;
    next.speed = number(report.Sog) ?? next.speed ?? 0;
    next.heading = number(report.TrueHeading) ?? number(report.Cog) ?? next.heading ?? 0;
    next.course = number(report.Cog) ?? next.course ?? next.heading;
    next.nav_status = report.NavigationalStatus ?? next.nav_status;
  }

  if (parsed.MessageType === 'ShipStaticData' && parsed.Message?.ShipStaticData) {
    const staticData = parsed.Message.ShipStaticData;
    const staticName = clean(staticData.Name);
    const destination = clean(staticData.Destination);
    if (staticName) next.name = staticName;
    if (destination) next.destination = destination;
    next.type = shipTypeFromCode(staticData.Type);
    next.ship_type_code = staticData.Type ?? next.ship_type_code;
    next.call_sign = clean(staticData.CallSign || staticData.Callsign) || next.call_sign;
    next.imo = staticData.ImoNumber || staticData.IMO || next.imo;
  }

  if (next.lat == null || next.lng == null) return null;
  if (!next.type) next.type = 'cargo';
  if (!next.name) next.name = `MMSI ${mmsi}`;
  return next;
}

export function buildAisSubscription({ apiKey, boundingBoxes = DEFAULT_AIS_BOUNDING_BOXES } = {}) {
  return {
    APIKey: apiKey,
    Apikey: apiKey,
    BoundingBoxes: boundingBoxes,
    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
  };
}
