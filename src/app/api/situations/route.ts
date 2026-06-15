import { NextRequest, NextResponse } from 'next/server';
import { buildSituations } from '@/lib/situations.mjs';

export const dynamic = 'force-dynamic';

type Severity = 'low' | 'elevated' | 'high' | 'critical';

interface FeedSource {
  path: string;
  key: string;          // top-level array key in the feed payload
  source: string;       // label used for cross-feed corroboration
  type: string;
  sev: (item: any) => Severity;
  minSeverity?: Severity;
  timeoutMs?: number;
}

const SEV_RANK: Severity[] = ['low', 'elevated', 'high', 'critical'];

// High-signal, geolocated feeds. Routine/background feeds (e.g. radiation
// stations, stream gauges) are intentionally excluded so situations stay
// meaningful. Severity heuristics are deterministic and tunable.
const FEED_SOURCES: FeedSource[] = [
  { path: '/api/earthquakes', key: 'earthquakes', source: 'USGS Quakes', type: 'seismic', minSeverity: 'elevated',
    sev: (e) => (e.magnitude >= 6 ? 'critical' : e.magnitude >= 5 ? 'high' : e.magnitude >= 4 ? 'elevated' : 'low') },
  { path: '/api/conflict-events', key: 'events', source: 'Conflict', type: 'conflict', timeoutMs: 15000,
    sev: (e) => (SEV_RANK.includes(e.severity) ? e.severity : 'elevated') },
  { path: '/api/port-disruptions', key: 'disruptions', source: 'PortWatch', type: 'maritime', timeoutMs: 12000,
    sev: (e) => (e.active ? 'high' : 'elevated') },
  { path: '/api/nws-alerts', key: 'alerts', source: 'NWS Alerts', type: 'weather',
    sev: (e) => (/extreme/i.test(String(e.severity)) ? 'critical' : /severe/i.test(String(e.severity)) ? 'high' : 'elevated') },
  { path: '/api/volcano-alerts', key: 'alerts', source: 'Volcano', type: 'geo', timeoutMs: 8000, sev: () => 'high' },
  { path: '/api/tsunami', key: 'alerts', source: 'Tsunami', type: 'geo', timeoutMs: 8000, sev: () => 'critical' },
  { path: '/api/storm-reports', key: 'reports', source: 'Storm Reports', type: 'weather', timeoutMs: 8000, sev: () => 'elevated' },
  { path: '/api/fires', key: 'fires', source: 'FIRMS Fires', type: 'fire', sev: () => 'elevated' },
  { path: '/api/fema-disasters', key: 'disasters', source: 'FEMA', type: 'hazard', timeoutMs: 8000, sev: () => 'elevated' },
  { path: '/api/gdelt', key: 'events', source: 'GDELT', type: 'geopolitical', timeoutMs: 12000, sev: () => 'elevated' },
];

const num = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function pickLatLng(item: any): { lat: number; lng: number } | null {
  const lat = num(item.lat ?? item.latitude);
  const lng = num(item.lng ?? item.lon ?? item.long ?? item.longitude);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

function pickTime(item: any): string | null {
  const t = item.time ?? item.date ?? item.published ?? item.pubDate ?? item.timestamp
    ?? item.updated_at ?? item.reportedAt ?? item.toDate ?? item.fetchedAt;
  if (!t) return null;
  const d = new Date(t);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function pickTitle(item: any): string {
  return String(item.title || item.place || item.headline || item.eventName || item.portName
    || item.name || item.label || item.summary || 'Event').slice(0, 160);
}

async function fetchFeedEvents(origin: string, cfg: FeedSource) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 6000);
  try {
    const res = await fetch(`${origin}${cfg.path}`, { cache: 'no-store', signal: controller.signal,
      headers: { 'User-Agent': 'BEACON-situations/1.0' } });
    if (!res.ok) return { source: cfg.source, ok: false, events: [] as any[] };
    const payload = await res.json();
    const items = Array.isArray(payload?.[cfg.key]) ? payload[cfg.key] : [];
    const minRank = cfg.minSeverity ? SEV_RANK.indexOf(cfg.minSeverity) : 0;
    const events = items.map((item: any) => {
      const coord = pickLatLng(item);
      if (!coord) return null;
      const severity = cfg.sev(item);
      if (SEV_RANK.indexOf(severity) < minRank) return null;
      return {
        id: `${cfg.source}-${item.id ?? item.event_id ?? `${coord.lat},${coord.lng}`}`,
        source: cfg.source,
        type: cfg.type,
        title: pickTitle(item),
        lat: coord.lat,
        lng: coord.lng,
        time: pickTime(item),
        severity,
        country: String(item.country || '').trim(),
      };
    }).filter(Boolean);
    return { source: cfg.source, ok: true, events };
  } catch {
    return { source: cfg.source, ok: false, events: [] as any[] };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const { searchParams } = request.nextUrl;
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit')) || 25, 100));
  const radiusKm = Math.max(50, Math.min(Number(searchParams.get('radiusKm')) || 300, 1000));
  const windowHours = Math.max(1, Math.min(Number(searchParams.get('windowHours')) || 72, 720));

  const results = await Promise.all(FEED_SOURCES.map((cfg) => fetchFeedEvents(origin, cfg)));
  const events = results.flatMap((r) => r.events);
  const feedsUsed = results.filter((r) => r.ok && r.events.length).map((r) => r.source);

  const situations = buildSituations(events, { radiusKm, windowHours, limit });

  return NextResponse.json(
    {
      situations,
      total: situations.length,
      eventsConsidered: events.length,
      feedsUsed,
      params: { radiusKm, windowHours, limit },
      timestamp: new Date().toISOString(),
      status: situations.length ? 'live' : 'empty',
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
