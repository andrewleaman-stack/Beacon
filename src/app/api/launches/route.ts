import { NextResponse } from 'next/server';
import { fetchLaunches, groupByPad } from '@/lib/launches.mjs';

export const dynamic = 'force-dynamic';

// Launch Library 2 allows 15 anonymous calls an hour; each refresh uses two.
const TTL_MS = 30 * 60_000;
let cached: { launches: any[]; at: number } | null = null;
let inflight: Promise<any[]> | null = null;

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    if (!cached || Date.now() - cached.at > TTL_MS) {
      inflight ??= fetchLaunches().finally(() => { inflight = null; });
      cached = { launches: await inflight, at: Date.now() };
    }
    return NextResponse.json({ pads: groupByPad(cached.launches), total: cached.launches.length, fetchedAt: new Date(cached.at).toISOString(), timestamp, source: 'Launch Library 2 — The Space Devs', status: 'live' });
  } catch (error: any) {
    if (cached) return NextResponse.json({ pads: groupByPad(cached.launches), total: cached.launches.length, fetchedAt: new Date(cached.at).toISOString(), timestamp, source: 'Launch Library 2 — The Space Devs', status: 'stale', message: error?.message });
    return NextResponse.json({ pads: [], total: 0, timestamp, status: 'error', error: 'Launches unavailable', message: error?.message }, { status: 502 });
  }
}
