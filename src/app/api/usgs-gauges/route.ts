import { NextResponse } from 'next/server';
import { fetchUsgsStations, fetchUsgsFloodGauges } from '@/lib/usgs-stream-gauges.mjs';

export const dynamic = 'force-dynamic';

const USGS_GAUGE_LIMIT = Number(process.env.USGS_GAUGE_LIMIT || 500);

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
        { source: 'USGS OGC Stations', ok: gauges.length > 0, count: gauges.length, error: gauges.length === 0 ? 'No stations found' : null },
        { source: 'USGS Realtime IV', ok: gauges.some(g => g.latestReading), count: gauges.filter(g => g.latestReading).length, error: null },
      ];
    }

    return NextResponse.json({
      gauges,
      total: gauges.length,
      mode,
      sources: ['USGS OGC API', 'USGS WaterServices IV'],
      sourceStatus,
      timestamp,
      status: gauges.length > 0 ? 'live' : 'degraded',
      notice: mode === 'flood'
        ? 'Active stream gauges with latest discharge/gage height readings. Flood stage detection included.'
        : 'USGS monitoring station locations from OGC API. Use mode=flood for realtime readings.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (error: any) {
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
