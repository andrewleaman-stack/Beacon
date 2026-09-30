import { NextResponse } from 'next/server';
import { fetchRainviewerFrame } from '@/lib/weather-layers.mjs';

export const dynamic = 'force-dynamic';

/** Latest RainViewer precipitation radar frame, cached for 5 minutes. */
let cached: { frame: Awaited<ReturnType<typeof fetchRainviewerFrame>>; at: number } | null = null;

export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > 5 * 60_000) {
      cached = { frame: await fetchRainviewerFrame(), at: Date.now() };
    }
    return NextResponse.json({ ...cached.frame, source: 'RainViewer', status: 'live' });
  } catch (error: any) {
    if (cached) return NextResponse.json({ ...cached.frame, source: 'RainViewer', status: 'stale' });
    return NextResponse.json({ tiles: [], source: 'RainViewer', status: 'error', error: 'Radar unavailable', message: error?.message }, { status: 502 });
  }
}
