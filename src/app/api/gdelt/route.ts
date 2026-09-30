import { NextResponse } from 'next/server';
import { fetchGdeltEvents } from '@/lib/gdelt-events.mjs';

export const dynamic = 'force-dynamic';

/**
 * BEACON — Geopolitical incidents from the GDELT 2.0 Event Database.
 * Reads the last hour of 15-minute export files. If GDELT is unreachable we
 * serve the last good result (marked stale) or an error — never invented events.
 */

const CACHE_MS = 10 * 60_000;
const STALE_LIMIT_MS = 6 * 60 * 60_000;
let lastGood: { events: any[]; fetchedAt: number } | null = null;
let inflight: Promise<{ events: any[]; intervalsFetched: number; intervalsFailed: number }> | null = null;

const SOURCE = 'GDELT 2.0 Event Database (15-minute exports)';
const NOTICE = 'Machine-coded from news reports. Treat as leads to verify, not confirmed incidents.';

export async function GET() {
  const timestamp = new Date().toISOString();
  if (lastGood && Date.now() - lastGood.fetchedAt < CACHE_MS) {
    return NextResponse.json({ events: lastGood.events, total: lastGood.events.length, timestamp, source: SOURCE, status: 'live', notice: NOTICE, fetchedAt: new Date(lastGood.fetchedAt).toISOString() });
  }
  try {
    inflight ??= fetchGdeltEvents().finally(() => { inflight = null; });
    const { events, intervalsFetched, intervalsFailed } = await inflight;
    lastGood = { events, fetchedAt: Date.now() };
    return NextResponse.json({
      events,
      total: events.length,
      timestamp,
      source: SOURCE,
      status: intervalsFailed ? 'partial' : 'live',
      intervalsFetched,
      notice: NOTICE,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error: any) {
    console.error('[BEACON] GDELT fetch error:', error?.message || error);
    if (lastGood && Date.now() - lastGood.fetchedAt < STALE_LIMIT_MS) {
      return NextResponse.json({
        events: lastGood.events,
        total: lastGood.events.length,
        timestamp,
        source: SOURCE,
        status: 'stale',
        fetchedAt: new Date(lastGood.fetchedAt).toISOString(),
        notice: NOTICE,
      });
    }
    return NextResponse.json({ events: [], total: 0, timestamp, source: SOURCE, status: 'error', error: 'GDELT unavailable', message: error?.message }, { status: 502 });
  }
}
