import { NextResponse } from 'next/server';
import { createZoneCache, fetchNwsAlerts } from '@/lib/nws-alerts.mjs';

type NwsResult = Awaited<ReturnType<typeof fetchNwsAlerts>>;

export const dynamic = 'force-dynamic';

/**
 * BEACON — U.S. weather warnings, watches and advisories (NWS), with map areas.
 * Alerts refresh every 2 minutes; zone outlines are cached for the life of the
 * process (see lib/nws-alerts.mjs).
 */
const TTL_MS = 2 * 60_000;
const zoneCache = createZoneCache();
// `complete` is false when zones were still loading as the result was built.
let cached: (NwsResult & { at: number; complete: boolean }) | null = null;
let inflight: Promise<NwsResult> | null = null;

function body({ alerts, zones, at }: NwsResult & { at: number }, status: string) {
  return {
    alerts,
    /** Zone outlines by id, each sent once; alerts list the ids in `zones`. */
    zones,
    total: alerts.length,
    mapped: alerts.filter((a) => a.areaSource).length,
    warnings: alerts.filter((a) => a.severity === 'Severe' || a.severity === 'Extreme').length,
    watches: alerts.filter((a) => /watch/i.test(a.event)).length,
    timestamp: new Date(at).toISOString(),
    source: 'NOAA/NWS',
    status,
  };
}

export async function GET() {
  try {
    // Rebuild soon after a result made while zones were loading, so areas fill in quickly after a restart.
    const ttl = cached && !cached.complete ? 20_000 : TTL_MS;
    if (!cached || Date.now() - cached.at > ttl) {
      inflight ??= fetchNwsAlerts({ zoneCache }).finally(() => { inflight = null; });
      const result = await inflight;
      cached = { ...result, at: Date.now(), complete: zoneCache.pending === 0 };
    }
    return NextResponse.json(body(cached, 'live'));
  } catch (error: any) {
    console.error('[BEACON] NWS alerts error:', error?.message || error);
    if (cached) return NextResponse.json(body(cached, 'stale'));
    return NextResponse.json({ alerts: [], zones: {}, total: 0, error: 'NWS alerts unavailable', message: error?.message, status: 'error' }, { status: 502 });
  }
}
