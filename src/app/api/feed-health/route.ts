import { NextRequest, NextResponse } from 'next/server';
import { buildFeedHealthSnapshot } from '@/lib/feed-health.mjs';

export const dynamic = 'force-dynamic';

const FEED_PROBES = [
  { path: '/api/news', pick: (payload: any) => ({ news: payload.news || [] }) },
  { path: '/api/earthquakes', pick: (payload: any) => ({ earthquakes: payload.earthquakes || [] }) },
  { path: '/api/gdelt', pick: (payload: any) => ({ gdelt: payload.events || payload.gdelt || [] }) },
  { path: '/api/maritime', pick: (payload: any) => ({ maritime_ships: payload.ships || [], maritime_ports: payload.ports || [], maritime_chokepoints: payload.chokepoints || [] }) },
  { path: '/api/live-news', pick: (payload: any) => ({ live_feeds: payload.feeds || [] }) },
  { path: '/api/infrastructure', pick: (payload: any) => ({ infrastructure: payload.infrastructure || [] }) },
  { path: '/api/weather', pick: (payload: any) => ({ weather_events: payload.events || [] }) },
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
};

async function probeFeed(origin: string, probe: typeof FEED_PROBES[number]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${origin}${probe.path}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BEACON-feed-health/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, path: probe.path, error: `HTTP ${response.status}`, data: {} };
    const payload = await response.json();
    return { ok: true, path: probe.path, data: probe.pick(payload) };
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
