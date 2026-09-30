import { NextRequest, NextResponse } from 'next/server';
import { parseNwsAlerts, parseCurrentWeather, nearbyFromFeeds, placeStatus } from '@/lib/place-watch.mjs';
import { timedFetch } from '@/lib/timed-fetch';

export const dynamic = 'force-dynamic';

/** BEACON's own feeds are shared by every place, so cache them for 5 minutes. */
const FEEDS: Record<string, { path: string; key: string }> = {
  earthquakes: { path: '/api/earthquakes', key: 'earthquakes' },
  fires: { path: '/api/fires', key: 'fires' },
  incidents: { path: '/api/gdelt', key: 'events' },
  wikiSurges: { path: '/api/wiki-surges', key: 'surges' },
  outages: { path: '/api/power-outages', key: 'outages' },
};
let feedCache: { at: number; data: Record<string, any[]> } | null = null;
let feedInflight: Promise<Record<string, any[]>> | null = null;

async function loadFeeds(origin: string) {
  if (feedCache && Date.now() - feedCache.at < 5 * 60_000) return feedCache.data;
  feedInflight ??= (async () => {
    const entries = await Promise.all(Object.entries(FEEDS).map(async ([name, cfg]) => {
      try {
        const res = await fetch(`${origin}${cfg.path}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
        const json = res.ok ? await res.json() : null;
        return [name, Array.isArray(json?.[cfg.key]) ? json[cfg.key] : []] as const;
      } catch {
        return [name, []] as const;
      }
    }));
    const data = Object.fromEntries(entries);
    feedCache = { at: Date.now(), data };
    return data;
  })().finally(() => { feedInflight = null; });
  return feedInflight;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));
  const radiusKm = Math.min(300, Math.max(5, Number(sp.get('radius')) || 50));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const [alertsResult, weatherResult, feeds] = await Promise.all([
    // NWS covers the US only; elsewhere it answers 400 and we report no alerts source.
    timedFetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`, { headers: { Accept: 'application/geo+json' }, timeoutMs: 10_000 })
      .then(async (r) => (r.ok ? { ok: true, alerts: parseNwsAlerts(await r.json()) } : { ok: false, alerts: [] }))
      .catch(() => ({ ok: false, alerts: [] })),
    timedFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`, { timeoutMs: 8_000 })
      .then(async (r) => (r.ok ? parseCurrentWeather(await r.json()) : null))
      .catch(() => null),
    loadFeeds(request.nextUrl.origin),
  ]);

  const nearby = nearbyFromFeeds({ lat, lng }, radiusKm, feeds);
  const status = placeStatus({ alerts: alertsResult.alerts, nearby });
  return NextResponse.json({
    lat, lng, radiusKm,
    status: status.level,
    reasons: status.reasons,
    alerts: alertsResult.alerts,
    alertsSource: alertsResult.ok ? 'NWS' : null,
    weather: weatherResult,
    nearby,
    timestamp: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
