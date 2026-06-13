function clean(value) {
  return String(value ?? '').trim();
}

function parseDateTime(dateValue, timeValue) {
  const date = clean(dateValue);
  if (!date) return null;
  const time = clean(timeValue) || '00:00';
  const parsed = new Date(`${date}T${time.padStart(5, '0')}:00Z`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date(date).toISOString();
}

function severityForNrcEvent(event) {
  const text = `${event.emergency_class || ''} ${event.event_text || ''} ${event.category || ''}`.toLowerCase();
  if (text.includes('alert') || text.includes('site area') || text.includes('general emergency')) return 'critical';
  if (text.includes('unusual event') || text.includes('offsite power') || text.includes('lost source')) return 'high';
  if (text.includes('agreement state') || text.includes('non emergency') || text.includes('invalid specified system')) return 'elevated';
  return 'low';
}

function titleForEvent(event, facility) {
  const category = clean(event.category) || 'NRC Event';
  return `${category} — ${facility || clean(event.state) || 'Unknown facility'}`;
}

export function normalizeNrcEvent(event, now = new Date()) {
  const facility = clean(event.facility || event.rep_org || event.licensee);
  const summary = clean(event.event_text).replace(/\s+/g, ' ').slice(0, 500);
  return {
    id: `nrc-${event.event_number}`,
    eventNumber: Number(event.event_number),
    category: clean(event.category),
    title: titleForEvent(event, facility),
    facility,
    city: clean(event.city),
    county: clean(event.county),
    state: clean(event.state),
    region: clean(event.region),
    emergencyClass: clean(event.emergency_class),
    severity: severityForNrcEvent(event),
    reportedAt: parseDateTime(event.notification_date, event.notification_time),
    reportDate: clean(event.report_date),
    summary,
    url: clean(event.page_url),
    source: 'NRC Event Notifications',
    fetchedAt: now.toISOString(),
  };
}

export function parseNrcEventsJsonl(jsonlText, { limit = 50, now = new Date() } = {}) {
  const events = [];
  for (const line of String(jsonlText || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      const normalized = normalizeNrcEvent(parsed, now);
      if (normalized.eventNumber) events.push(normalized);
    } catch {
      // Skip malformed mirror rows; one bad line should not kill the feed.
    }
  }
  return events
    .sort((a, b) => String(b.reportDate || b.reportedAt).localeCompare(String(a.reportDate || a.reportedAt)))
    .slice(0, limit);
}

export async function fetchNrcEvents({ year = new Date().getUTCFullYear(), limit = 50, fetchImpl = fetch, now = new Date() } = {}) {
  const url = `https://raw.githubusercontent.com/zachlandes/nrc-event-scraper/main/data/events/${year}.jsonl`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 nrc-event-notifications' },
  });
  if (!response.ok) throw new Error(`NRC event mirror returned HTTP ${response.status}`);
  return parseNrcEventsJsonl(await response.text(), { limit, now });
}
