const DEFAULT_NOW = () => Date.now();

export const FEED_DEFINITIONS = [
  { key: 'news', label: 'OSINT News', dataKeys: ['news'], layerKey: 'news_intel', staleAfterMs: 30 * 60_000 },
  { key: 'earthquakes', label: 'USGS Earthquakes', dataKeys: ['earthquakes'], layerKey: 'earthquakes', staleAfterMs: 30 * 60_000 },
  { key: 'gdelt', label: 'GDELT Incidents', dataKeys: ['gdelt'], layerKey: 'global_incidents', staleAfterMs: 30 * 60_000 },
  { key: 'maritime', label: 'Maritime AIS', dataKeys: ['maritime_ships', 'maritime_ports', 'maritime_chokepoints'], layerKey: 'maritime', staleAfterMs: 60_000 },
  { key: 'live_news', label: 'Live News Feeds', dataKeys: ['live_feeds'], layerKey: 'live_news', staleAfterMs: 6 * 60 * 60_000 },
  { key: 'infrastructure', label: 'Infrastructure', dataKeys: ['infrastructure'], layerKey: 'infrastructure', staleAfterMs: 60 * 60_000 },
  { key: 'weather', label: 'Weather', dataKeys: ['weather_events'], layerKey: 'weather', staleAfterMs: 30 * 60_000 },
  { key: 'radiation', label: 'Radiation', dataKeys: ['radiation'], layerKey: 'radiation', staleAfterMs: 5 * 60_000 },
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

export function classifyFeedStatus({ count, lastEventAt, required, staleAfterMs, now = DEFAULT_NOW() }) {
  if (count <= 0) return required ? 'offline' : 'idle';
  if (lastEventAt == null) return required ? 'stale' : 'idle';
  return now - lastEventAt > staleAfterMs ? 'stale' : 'healthy';
}

export function buildFeedHealthSnapshot({ data = {}, activeLayers = {}, backendStatus = 'connecting', now = DEFAULT_NOW() } = {}) {
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
  };
}
