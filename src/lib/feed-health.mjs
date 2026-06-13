const DEFAULT_NOW = () => Date.now();
/** @type {Array<{ path: string, ok: boolean, error?: string | null }>} */
const DEFAULT_PROBE_RESULTS = [];

export const FEED_DEFINITIONS = [
  { key: 'news', label: 'OSINT News', dataKeys: ['news'], layerKey: 'news_intel', staleAfterMs: 30 * 60_000 },
  { key: 'earthquakes', label: 'USGS Earthquakes', dataKeys: ['earthquakes'], layerKey: 'earthquakes', staleAfterMs: 30 * 60_000 },
  { key: 'gdelt', label: 'GDELT Incidents', dataKeys: ['gdelt'], layerKey: 'global_incidents', staleAfterMs: 30 * 60_000 },
  { key: 'maritime', label: 'Maritime AIS', dataKeys: ['maritime_ships', 'maritime_ports', 'maritime_chokepoints'], layerKey: 'maritime', staleAfterMs: 60_000 },
  { key: 'live_news', label: 'Live News Feeds', dataKeys: ['live_feeds'], layerKey: 'live_news', staleAfterMs: 6 * 60 * 60_000 },
  { key: 'infrastructure', label: 'Infrastructure', dataKeys: ['infrastructure'], layerKey: 'infrastructure', staleAfterMs: 60 * 60_000 },
  { key: 'weather', label: 'Weather', dataKeys: ['weather_events'], layerKey: 'weather', staleAfterMs: 30 * 60_000 },
  { key: 'radiation', label: 'Radiation', dataKeys: ['radiation'], layerKey: 'radiation', staleAfterMs: 5 * 60_000 },
  { key: 'nws_alerts', label: 'NWS / SPC Alerts', dataKeys: ['nws_alerts'], layerKey: 'nws_alerts', staleAfterMs: 30 * 60_000 },
  { key: 'fires', label: 'NASA FIRMS Fires', dataKeys: ['fires'], layerKey: 'fires', staleAfterMs: 60 * 60_000 },
  { key: 'fire_perimeters', label: 'NIFC Fire Perimeters', dataKeys: ['fire_perimeters'], layerKey: 'fire_perimeters', staleAfterMs: 12 * 60 * 60_000 },
  { key: 'storm_reports', label: 'NOAA SPC Storm Reports', dataKeys: ['storm_reports'], layerKey: 'storm_reports', staleAfterMs: 12 * 60 * 60_000 },
  { key: 'infra_incidents', label: 'Infrastructure Incidents', dataKeys: ['infra_incidents'], layerKey: 'infra_incidents', staleAfterMs: 60 * 60_000 },
  { key: 'cyber_cve', label: 'Cyber / CVE', dataKeys: ['cyber_cve'], layerKey: 'cyber_cve', staleAfterMs: 60 * 60_000 },
  { key: 'ics_advisories', label: 'CISA ICS Advisories', dataKeys: ['ics_advisories'], layerKey: 'ics_advisories', staleAfterMs: 7 * 24 * 60 * 60_000 },
  { key: 'nrc_events', label: 'NRC Events', dataKeys: ['nrc_events'], layerKey: 'nrc_events', staleAfterMs: 7 * 24 * 60 * 60_000 },
  { key: 'usgs_gauges', label: 'USGS Stream Gauges', dataKeys: ['usgs_gauges'], layerKey: 'usgs_gauges', staleAfterMs: 4 * 60 * 60_000 },
  { key: 'tsunami', label: 'NWS Tsunami Alerts', dataKeys: ['tsunami'], layerKey: 'tsunami', staleAfterMs: 4 * 60 * 60_000 },
  { key: 'volcano_alerts', label: 'USGS Volcano Alerts', dataKeys: ['volcano_alerts'], layerKey: 'volcano_alerts', staleAfterMs: 4 * 60 * 60_000 },
  { key: 'epa_echo', label: 'EPA ECHO Facilities', dataKeys: ['epa_echo'], layerKey: 'epa_echo', staleAfterMs: 7 * 24 * 60 * 60_000 },
  { key: 'power_outages', label: 'Power Outages', dataKeys: ['power_outages'], layerKey: 'power_outages', staleAfterMs: 60 * 60_000 },
  { key: 'fema_disasters', label: 'FEMA Disasters', dataKeys: ['fema_disasters'], layerKey: 'fema_disasters', staleAfterMs: 24 * 60 * 60_000 },
  { key: 'openmhz', label: 'OpenMHz / P25', dataKeys: ['openmhz'], layerKey: 'openmhz', staleAfterMs: 6 * 60 * 60_000 },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toTime(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function latestFromItem(item) {
  if (!item || typeof item !== 'object') return null;
  const candidates = [
    item.time,
    item.published,
    item.pubDate,
    item.timestamp,
    item.updated_at,
    item.last_seen,
    item.fetchedAt,
  ].map(toTime).filter((value) => typeof value === 'number');
  return candidates.length ? Math.max(...candidates) : null;
}

function latestFromArrays(arrays) {
  let latest = null;
  for (const items of arrays) {
    for (const item of items) {
      const itemLatest = latestFromItem(item);
      if (itemLatest != null) latest = latest == null ? itemLatest : Math.max(latest, itemLatest);
    }
  }
  return latest;
}

function formatAge(ageSeconds) {
  if (ageSeconds == null) return 'unknown age';
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  const minutes = Math.round(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function feedKeyFromProbePath(path) {
  const segment = String(path || '').split('/').filter(Boolean).pop() || '';
  if (segment === 'live-news') return 'live_news';
  if (segment === 'nws-alerts') return 'nws_alerts';
  if (segment === 'infrastructure-incidents') return 'infra_incidents';
  if (segment === 'fire-perimeters') return 'fire_perimeters';
  if (segment === 'storm-reports') return 'storm_reports';
  if (segment === 'ics-advisories') return 'ics_advisories';
  if (segment === 'nrc-events') return 'nrc_events';
  if (segment === 'usgs-gauges') return 'usgs_gauges';
  if (segment === 'tsunami') return 'tsunami';
  if (segment === 'volcano-alerts') return 'volcano_alerts';
  if (segment === 'epa-echo') return 'epa_echo';
  if (segment === 'power-outages') return 'power_outages';
  if (segment === 'fema-disasters') return 'fema_disasters';
  if (segment === 'cyber-cve') return 'cyber_cve';
  if (segment === 'openmhz') return 'openmhz';
  return segment.replace(/-/g, '_');
}

function buildOperationalEvents({ feeds, probeResults = DEFAULT_PROBE_RESULTS, now }) {
  const byKey = Object.fromEntries(feeds.map((feed) => [feed.key, feed]));
  const events = [];

  for (const probe of probeResults) {
    if (probe?.ok !== false) continue;
    const feedKey = feedKeyFromProbePath(probe.path);
    const feed = byKey[feedKey];
    events.push({
      id: `${now}-probe-${feedKey}`,
      type: 'probe_failed',
      severity: 'error',
      feedKey,
      label: feed?.label || feedKey,
      message: `${feed?.label || feedKey} probe failed: ${probe.error || 'unknown error'}`,
      timestamp: new Date(now).toISOString(),
    });
  }

  for (const feed of feeds) {
    if (!feed.active) continue;
    if (feed.status === 'offline') {
      events.push({
        id: `${now}-offline-${feed.key}`,
        type: 'feed_offline',
        severity: 'error',
        feedKey: feed.key,
        label: feed.label,
        message: `${feed.label} is offline: no current records available`,
        timestamp: new Date(now).toISOString(),
      });
    } else if (feed.status === 'stale') {
      events.push({
        id: `${now}-stale-${feed.key}`,
        type: 'feed_stale',
        severity: 'warning',
        feedKey: feed.key,
        label: feed.label,
        message: `${feed.label} is stale: last event ${formatAge(feed.ageSeconds)}`,
        timestamp: new Date(now).toISOString(),
      });
    } else if (feed.status === 'healthy') {
      events.push({
        id: `${now}-refreshed-${feed.key}`,
        type: 'feed_refreshed',
        severity: 'info',
        feedKey: feed.key,
        label: feed.label,
        message: `${feed.label} refreshed: ${feed.count} records, last event ${formatAge(feed.ageSeconds)}`,
        timestamp: new Date(now).toISOString(),
      });
    }
  }

  const severityRank = { error: 0, warning: 1, info: 2 };
  return events.sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || a.feedKey.localeCompare(b.feedKey));
}

export function classifyFeedStatus({ count, lastEventAt, required, staleAfterMs, now = DEFAULT_NOW() }) {
  if (count <= 0) return required ? 'offline' : 'idle';
  if (lastEventAt == null) return required ? 'stale' : 'idle';
  return now - lastEventAt > staleAfterMs ? 'stale' : 'healthy';
}

export function buildFeedHealthSnapshot({ data = {}, activeLayers = {}, backendStatus = 'connecting', probeResults = DEFAULT_PROBE_RESULTS, now = DEFAULT_NOW() } = {}) {
  const feeds = FEED_DEFINITIONS.map((definition) => {
    const arrays = definition.dataKeys.map((key) => asArray(data[key]));
    const count = arrays.reduce((sum, items) => sum + items.length, 0);
    const active = Boolean(activeLayers[definition.layerKey]);
    const lastEventAt = latestFromArrays(arrays);
    const status = classifyFeedStatus({
      count,
      lastEventAt,
      required: active,
      staleAfterMs: definition.staleAfterMs,
      now,
    });

    return {
      key: definition.key,
      label: definition.label,
      status,
      active,
      count,
      lastEventAt: lastEventAt == null ? null : new Date(lastEventAt).toISOString(),
      ageSeconds: lastEventAt == null ? null : Math.max(0, Math.round((now - lastEventAt) / 1000)),
      staleAfterSeconds: Math.round(definition.staleAfterMs / 1000),
      dataKeys: definition.dataKeys,
    };
  });

  const summary = feeds.reduce((acc, feed) => {
    acc.totalFeeds += 1;
    acc.activeFeeds += feed.active ? 1 : 0;
    acc.totalRecords += feed.count;
    acc[feed.status] += 1;
    return acc;
  }, { totalFeeds: 0, activeFeeds: 0, totalRecords: 0, healthy: 0, stale: 0, offline: 0, idle: 0 });

  const status = backendStatus === 'error'
    ? 'offline'
    : summary.offline > 0 || summary.stale > 0
      ? 'degraded'
      : 'operational';

  return {
    platform: 'BEACON',
    status,
    backendStatus,
    checkedAt: new Date(now).toISOString(),
    summary,
    feeds,
    events: buildOperationalEvents({ feeds, probeResults, now }),
  };
}
