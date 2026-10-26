import { NextResponse } from 'next/server';
import { fetchOutlooks } from '@/lib/spc-outlook.mjs';

type OutlookFeature = Awaited<ReturnType<typeof fetchOutlooks>>['features'][number];

export const dynamic = 'force-dynamic';

/**
 * SPC convective outlooks for days 1-3. SPC reissues them a few times a day,
 * so they are cached for 15 minutes.
 */
const TTL_MS = 15 * 60_000;
let cached: { features: OutlookFeature[]; errors: string[]; at: number } | null = null;
let inflight: ReturnType<typeof fetchOutlooks> | null = null;

function body(c: NonNullable<typeof cached>, status: string) {
  return { features: c.features, total: c.features.length, errors: c.errors, timestamp: new Date(c.at).toISOString(), source: 'NOAA/SPC', status };
}

export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > TTL_MS) {
      inflight ??= fetchOutlooks().finally(() => { inflight = null; });
      cached = { ...(await inflight), at: Date.now() };
    }
    return NextResponse.json(body(cached, cached.errors.length ? 'partial' : 'live'));
  } catch (error: any) {
    if (cached) return NextResponse.json(body(cached, 'stale'));
    return NextResponse.json({ features: [], total: 0, error: 'SPC outlooks unavailable', message: error?.message, status: 'error' }, { status: 502 });
  }
}
