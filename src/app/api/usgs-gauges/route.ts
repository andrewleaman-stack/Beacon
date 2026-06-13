import { NextResponse } from 'next/server';
import { fetchUsgsFloodGauges, fetchUsgsGauges } from '@/lib/usgs-stream-gauges.mjs';

export const dynamic = 'force-dynamic';

const USGS_GAUGE_LIMIT = Number(process.env.USGS_GAUGE_LIMIT || 500);

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || undefined;
  const mode = searchParams.get('mode') || 'flood'; // 'flood' | 'stations'

  try {
    const limit = Number.isFinite(USGS_GAUGE_LIMIT) && USGS_GAUGE_LIMIT > 0 ? USGS_GAUGE_LIMIT : 500;
    let gauges;
    let sourceStatus;

    if (mode === 'stations') {
      gauges = await fetchUsgsGauges({ state, limit } as { state?: string; limit: number });
      sourceStatus = [{ source: 'USGS Water Services (stations)', ok: true, count: gauges.length, error: null }];
    } else {
      gauges = await fetchUsgsFloodGauges({ state } as { state?: string });
      sourceStatus = [
        { source: 'USGS Water Services (gauges)', ok: gauges.length > 0, count: gauges.length, error: gauges.length === 0 ? 'No active stream gauges' : null },
        { source: 'USGS Realtime (readings)', ok: gauges.some(g => g.latestReading), count: gauges.filter(g => g.latestReading).length, error: null },
      ];
    }

    return NextResponse.json({
      gauges,
      total: gauges.length,
      mode,
      sources: ['USGS Water Services', 'USGS Realtime IV'],
      sourceStatus,
      timestamp,
      status: gauges.length > 0 ? 'live' : 'degraded',
      notice: mode === 'flood'
        ? 'Active stream gauges with latest discharge/gage height readings. Flood stage detection included.'
        : 'USGS monitoring station locations. Use mode=flood for realtime readings.',
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
