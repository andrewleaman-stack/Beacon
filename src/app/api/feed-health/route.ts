import { NextRequest, NextResponse } from 'next/server';
import { buildFeedHealthSnapshot } from '@/lib/feed-health.mjs';

export const dynamic = 'force-dynamic';

const FEED_PROBES = [
  { path: '/api/news', timeoutMs: 5_000, pick: (payload: any) => ({ news: payload.news || [] }) },
  { path: '/api/earthquakes', timeoutMs: 5_000, pick: (payload: any) => ({ earthquakes: payload.earthquakes || [] }) },
  { path: '/api/gdelt', timeoutMs: 12_000, pick: (payload: any) => ({ gdelt: payload.events || payload.gdelt || [] }) },
  { path: '/api/maritime', timeoutMs: 5_000, pick: (payload: any) => ({ maritime_ships: payload.ships || [], maritime_ports: payload.ports || [], maritime_chokepoints: payload.chokepoints || [] }) },
  { path: '/api/live-news', timeoutMs: 5_000, pick: (payload: any) => ({ live_feeds: payload.feeds || [] }) },
  { path: '/api/infrastructure', timeoutMs: 5_000, pick: (payload: any) => ({ infrastructure: payload.infrastructure || [] }) },
  { path: '/api/weather', timeoutMs: 5_000, pick: (payload: any) => ({ weather_events: payload.events || [] }) },
  { path: '/api/nws-alerts', timeoutMs: 5_000, pick: (payload: any) => ({ nws_alerts: payload.alerts || [] }) },
  { path: '/api/openmhz', timeoutMs: 5_000, pick: (payload: any) => ({ openmhz: payload.feeds || [] }) },
  { path: '/api/fires', timeoutMs: 5_000, pick: (payload: any) => ({ fires: payload.fires || [] }) },
  { path: '/api/fire-perimeters', timeoutMs: 8_000, pick: (payload: any) => ({ fire_perimeters: payload.perimeters || [] }) },
  { path: '/api/storm-reports', timeoutMs: 8_000, pick: (payload: any) => ({ storm_reports: payload.reports || [] }) },
  { path: '/api/infrastructure-incidents', timeoutMs: 5_000, pick: (payload: any) => ({ infra_incidents: payload.incidents || [] }) },
  { path: '/api/cyber-cve', timeoutMs: 5_000, pick: (payload: any) => ({ cyber_cve: payload.cves || [] }) },
];

const DEFAULT_ACTIVE_LAYERS = {
  news_intel: true,
  earthquakes: true,
  global_incidents: true,
  maritime: true,
  live_news: true,
  infrastructure: false,
  weather: false,
  radiation: false,
  nws_alerts: false,
  fires: false,
  fire_perimeters: false,
  storm_reports: false,
  infra_incidents: false,
  cyber_cve: false,
  openmhz: false,
};
function hasEventTime(item: Record<string, unknown>) {
  return Boolean(item.time || item.published || item.pubDate || item.timestamp || item.updated_at || item.last_seen || item.fetchedAt);
}

function stampProbeData(data: Record<string, unknown>, fetchedAt: string) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (!Array.isArray(value)) return [key, value];
    return [key, value.map((item) => {
      if (!item || typeof item !== 'object' || hasEventTime(item as Record<string, unknown>)) return item;
      return { ...(item as Record<string, unknown>), fetchedAt };
    })];
  }));
}

async function probeFeed(origin: string, probe: typeof FEED_PROBES[number]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), probe.timeoutMs);
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(`${origin}${probe.path}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BEACON-feed-health/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, path: probe.path, error: `HTTP ${response.status}`, data: {} };
    const payload = await response.json();
    const data = stampProbeData(probe.pick(payload), String(payload.timestamp || fetchedAt));
    return { ok: true, path: probe.path, data };
  } catch (error) {
    return { ok: false, path: probe.path, error: error instanceof Error ? error.message : String(error), data: {} };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const results = await Promise.all(FEED_PROBES.map((probe) => probeFeed(origin, probe)));
  const data = results.reduce<Record<string, unknown>>((acc, result) => ({ ...acc, ...result.data }), {});
  const probeResults = results.map(({ path, ok, error }) => ({ path, ok, error: error || null }));
  const snapshot = buildFeedHealthSnapshot({
    data,
    activeLayers: DEFAULT_ACTIVE_LAYERS,
    backendStatus: results.some((result) => result.ok) ? 'connected' : 'error',
    probeResults,
  });

  return NextResponse.json({
    ...snapshot,
    probes: probeResults,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
