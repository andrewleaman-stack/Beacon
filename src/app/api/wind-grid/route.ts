import { NextResponse } from 'next/server';
import { fetchWindGrid } from '@/lib/weather-layers.mjs';

export const dynamic = 'force-dynamic';

/**
 * Surface wind on a 10° grid from Open-Meteo. Each grid point counts against
 * Open-Meteo's free daily allowance, so refresh at most every 3 hours.
 */
const TTL_MS = 3 * 60 * 60_000;
let cached: { points: Awaited<ReturnType<typeof fetchWindGrid>>; at: number } | null = null;
let inflight: ReturnType<typeof fetchWindGrid> | null = null;

export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > TTL_MS) {
      inflight ??= fetchWindGrid().finally(() => { inflight = null; });
      cached = { points: await inflight, at: Date.now() };
    }
    return NextResponse.json({ points: cached.points, total: cached.points.length, fetchedAt: new Date(cached.at).toISOString(), source: 'Open-Meteo', status: 'live' });
  } catch (error: any) {
    if (cached) return NextResponse.json({ points: cached.points, total: cached.points.length, fetchedAt: new Date(cached.at).toISOString(), source: 'Open-Meteo', status: 'stale' });
    return NextResponse.json({ points: [], total: 0, source: 'Open-Meteo', status: 'error', error: 'Wind data unavailable', message: error?.message }, { status: 502 });
  }
}
