/**
 * Conflict events — UCDP + ACLED.
 *
 * Clean-room normalizer + fetchers for two armed-conflict event datasets,
 * merged into one BEACON event shape to deepen the frontlines picture with
 * sourced, georeferenced events (not just the Ukraine frontline polygon).
 *
 * Both providers now require free access credentials, so the feed degrades
 * gracefully: with no credentials configured it returns an empty set plus a
 * notice, matching BEACON's optional-key feeds (FIRMS, OpenSky, etc.).
 *
 *   UCDP  — header token `x-ucdp-access-token`; request via
 *           https://ucdpapi.pcr.uu.se/api/gedevents/<version>?pagesize=N
 *           (GED 26.1; Candidate Monthly 26.0.4 for the most recent events).
 *           Env: UCDP_ACCESS_TOKEN, optional UCDP_GED_VERSION.
 *   ACLED — read API with key + email; request via
 *           https://api.acleddata.com/acled/read?key=KEY&email=EMAIL&...
 *           Env: ACLED_API_KEY, ACLED_EMAIL.
 *
 * Note: ACLED has been migrating its access portal — if a deployment's token
 * uses the newer OAuth flow rather than the classic key+email read API, only
 * fetchAcledEvents needs adjusting; the normalizer and wiring are unaffected.
 */

const UCDP_DEFAULT_VERSION = '26.1';
const UCDP_API_BASE = 'https://ucdpapi.pcr.uu.se/api/gedevents';
const ACLED_API_URL = 'https://api.acleddata.com/acled/read';

function clean(value) {
  return String(value ?? '').trim();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Parse provider date strings ("2024-01-15 00:00:00.000", "2024-01-15") to ISO. */
function toIso(value) {
  const raw = clean(value);
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /[zZ]|[+-]\d\d:?\d\d$/.test(normalized) ? normalized : `${normalized}Z`;
  const parsed = new Date(withZone);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

/** Map a fatality count to a coarse BEACON severity bucket. */
export function severityForFatalities(fatalities) {
  const n = toNumber(fatalities);
  if (n >= 50) return 'critical';
  if (n >= 10) return 'high';
  if (n >= 1) return 'elevated';
  return 'low';
}

const UCDP_VIOLENCE_LABELS = {
  1: 'State-based conflict',
  2: 'Non-state conflict',
  3: 'One-sided violence',
};

export function normalizeUcdpEvent(raw, now = new Date()) {
  const sideA = clean(raw.side_a);
  const sideB = clean(raw.side_b);
  const country = clean(raw.country);
  const fatalities = toNumber(raw.best);
  const eventType = UCDP_VIOLENCE_LABELS[Number(raw.type_of_violence)] || 'Armed conflict';
  const where = clean(raw.where_coordinates || raw.adm_1);
  const parties = [sideA, sideB].filter(Boolean).join(' vs ') || eventType;
  return {
    id: `ucdp-${clean(raw.id) || clean(raw.relid)}`,
    source: 'UCDP GED',
    eventType,
    subType: clean(raw.conflict_name),
    title: `${parties} — ${country || 'Unknown'}`,
    summary: clean(raw.source_article).replace(/\s+/g, ' ').slice(0, 500),
    actor1: sideA,
    actor2: sideB,
    country,
    region: clean(raw.region),
    location: where,
    lat: toNumber(raw.latitude),
    lng: toNumber(raw.longitude),
    fatalities,
    severity: severityForFatalities(fatalities),
    date: toIso(raw.date_start) || toIso(raw.date_end),
    url: 'https://ucdp.uu.se/',
    fetchedAt: now.toISOString(),
  };
}

const ACLED_FATAL_EVENT_TYPES = /battle|violence|explosion|remote/i;

export function normalizeAcledEvent(raw, now = new Date()) {
  const actor1 = clean(raw.actor1);
  const actor2 = clean(raw.actor2);
  const country = clean(raw.country);
  const fatalities = toNumber(raw.fatalities);
  const eventType = clean(raw.event_type) || 'Conflict event';
  const subType = clean(raw.sub_event_type);
  const parties = [actor1, actor2].filter(Boolean).join(' vs ') || eventType;
  return {
    id: `acled-${clean(raw.event_id_cnty) || clean(raw.event_id)}`,
    source: 'ACLED',
    eventType,
    subType,
    title: `${parties} — ${clean(raw.location) || country || 'Unknown'}`,
    summary: clean(raw.notes).replace(/\s+/g, ' ').slice(0, 500),
    actor1,
    actor2,
    country,
    region: clean(raw.region),
    location: clean(raw.location),
    lat: toNumber(raw.latitude),
    lng: toNumber(raw.longitude),
    fatalities,
    // ACLED records non-fatal events too; keep severity meaningful for those.
    severity: fatalities > 0 || ACLED_FATAL_EVENT_TYPES.test(eventType)
      ? severityForFatalities(fatalities)
      : 'low',
    date: toIso(raw.event_date),
    url: clean(raw.source) ? '' : 'https://acleddata.com/',
    fetchedAt: now.toISOString(),
  };
}

function sortByDateDesc(events) {
  return events.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

export async function fetchUcdpEvents({
  token = process.env.UCDP_ACCESS_TOKEN,
  version = process.env.UCDP_GED_VERSION || UCDP_DEFAULT_VERSION,
  pageSize = 200,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  if (!token) return [];
  const url = `${UCDP_API_BASE}/${version}?pagesize=${pageSize}`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'x-ucdp-access-token': token, 'User-Agent': 'BEACON/1.0 conflict-events' },
  });
  if (!response.ok) throw new Error(`UCDP API returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload?.Result) ? payload.Result : Array.isArray(payload) ? payload : [];
  return rows.map((row) => normalizeUcdpEvent(row, now)).filter((event) => event.id !== 'ucdp-');
}

export async function fetchAcledEvents({
  key = process.env.ACLED_API_KEY,
  email = process.env.ACLED_EMAIL,
  limit = 200,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  if (!key || !email) return [];
  const params = new URLSearchParams({ key, email, limit: String(limit) });
  const response = await fetchImpl(`${ACLED_API_URL}?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 conflict-events' },
  });
  if (!response.ok) throw new Error(`ACLED API returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row) => normalizeAcledEvent(row, now)).filter((event) => event.id !== 'acled-');
}

/**
 * Fetch from whichever providers are configured, merge, sort newest-first, and
 * cap to `limit`. A failure in one provider never suppresses the other.
 */
export async function fetchConflictEvents({
  limit = 250,
  fetchImpl = fetch,
  now = new Date(),
  ucdp = {},
  acled = {},
} = {}) {
  const sources = [];
  const errors = [];
  const configured = {
    ucdp: Boolean(ucdp.token ?? process.env.UCDP_ACCESS_TOKEN),
    acled: Boolean((acled.key ?? process.env.ACLED_API_KEY) && (acled.email ?? process.env.ACLED_EMAIL)),
  };

  const results = await Promise.allSettled([
    configured.ucdp ? fetchUcdpEvents({ fetchImpl, now, ...ucdp }) : Promise.resolve([]),
    configured.acled ? fetchAcledEvents({ fetchImpl, now, ...acled }) : Promise.resolve([]),
  ]);

  const [ucdpResult, acledResult] = results;
  let events = [];
  if (ucdpResult.status === 'fulfilled' && ucdpResult.value.length) {
    events = events.concat(ucdpResult.value);
    sources.push('UCDP GED');
  } else if (ucdpResult.status === 'rejected') {
    errors.push(`UCDP: ${ucdpResult.reason?.message || ucdpResult.reason}`);
  }
  if (acledResult.status === 'fulfilled' && acledResult.value.length) {
    events = events.concat(acledResult.value);
    sources.push('ACLED');
  } else if (acledResult.status === 'rejected') {
    errors.push(`ACLED: ${acledResult.reason?.message || acledResult.reason}`);
  }

  return {
    events: sortByDateDesc(events).slice(0, limit),
    sources,
    configured,
    errors,
  };
}
