import { NextResponse } from 'next/server';
import { fetchUsgsStations, fetchUsgsFloodGauges } from '@/lib/usgs-stream-gauges.mjs';

export const dynamic = 'force-dynamic';

const USGS_GAUGE_LIMIT = Number(process.env.USGS_GAUGE_LIMIT || 500);

// Last good result per state/mode, served (marked stale) for up to 6 h if USGS fails.
const lastGood = new Map<string, { gauges: any[]; at: number }>();
const STALE_LIMIT_MS = 6 * 60 * 60_000;

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'MI';
  const mode = searchParams.get('mode') || 'flood'; // 'flood' | 'stations'

  try {
    const limit = Number.isFinite(USGS_GAUGE_LIMIT) && USGS_GAUGE_LIMIT > 0 ? USGS_GAUGE_LIMIT : 500;
    let gauges;
    let sourceStatus;

    if (mode === 'stations') {
      gauges = await fetchUsgsStations({ state, limit } as { state?: string; limit: number });
      sourceStatus = [{ source: 'USGS OGC Stations', ok: true, count: gauges.length, error: null }];
    } else {
      gauges = await fetchUsgsFloodGauges({ state, limit } as { state?: string; limit: number });
      sourceStatus = [
        { source: gauges[0]?.source || 'USGS', ok: gauges.length > 0, count: gauges.length, error: gauges.length === 0 ? 'No active stream gauges reported' : null },
      ];
    }

    lastGood.set(`${state}:${mode}`, { gauges, at: Date.now() });
    return NextResponse.json({
      gauges,
      total: gauges.length,
      mode,
      sources: ['USGS WaterServices'],
      sourceStatus,
      timestamp,
      status: gauges.length > 0 ? 'live' : 'degraded',
      notice: mode === 'flood'
        ? 'Active stream gauges with latest discharge and gage height. Flood stage is not published by USGS and is left blank.'
        : 'USGS monitoring station locations. Use mode=flood for realtime readings.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (error: any) {
    const cached = lastGood.get(`${state}:${mode}`);
    if (cached && Date.now() - cached.at < STALE_LIMIT_MS) {
      return NextResponse.json({
        gauges: cached.gauges,
        total: cached.gauges.length,
        mode,
        sources: ['USGS'],
        timestamp,
        fetchedAt: new Date(cached.at).toISOString(),
        status: 'stale',
        message: error.message,
      });
    }
    return NextResponse.json({
      gauges: [],
      total: 0,
      sources: ['USGS Water Services'],
      timestamp,
      status: 'error',
      error: 'USGS stream gauges feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
