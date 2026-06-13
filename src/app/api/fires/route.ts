import { NextResponse } from 'next/server';
import { fetchFirmsFeeds, getFirmsSources } from '@/lib/firms.mjs';

/**
 * BEACON — Active Fires / Thermal Anomalies (NASA FIRMS / VIIRS / MODIS)
 *
 * Source: NASA FIRMS area CSV API.
 * Env: FIRMS_API_KEY preferred; FIRMS_MAP_KEY supported for compatibility.
 */

export const dynamic = 'force-dynamic';

const FIRMS_AREA = process.env.FIRMS_AREA || 'world';
const FIRMS_DAYS = Number(process.env.FIRMS_DAYS || 1);
const FIRMS_LIMIT = Number(process.env.FIRMS_LIMIT || 500);

export async function GET() {
  const mapKey = process.env.FIRMS_API_KEY || process.env.FIRMS_MAP_KEY;
  const sources = getFirmsSources();
  const lastUpdated = new Date().toISOString();

  if (!mapKey) {
    return NextResponse.json({
      fires: [],
      total: 0,
      sources,
      sourceStatus: sources.map((source: string) => ({ source, ok: false, count: 0, error: 'FIRMS_API_KEY not configured' })),
      lastUpdated,
      status: 'degraded',
      notice: 'NASA FIRMS API key missing. Set FIRMS_API_KEY or FIRMS_MAP_KEY for live data.',
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const { fires, sourceStatus } = await fetchFirmsFeeds({
      mapKey,
      sources,
      area: FIRMS_AREA,
      days: Number.isFinite(FIRMS_DAYS) && FIRMS_DAYS > 0 ? FIRMS_DAYS : 1,
    });
    const limitedFires = fires.slice(0, Number.isFinite(FIRMS_LIMIT) && FIRMS_LIMIT > 0 ? FIRMS_LIMIT : 500);
    const anySourceOk = sourceStatus.some((source: { ok: boolean }) => source.ok);

    return NextResponse.json({
      fires: limitedFires,
      total: limitedFires.length,
      totalAvailable: fires.length,
      sources,
      sourceStatus,
      area: FIRMS_AREA,
      days: Number.isFinite(FIRMS_DAYS) && FIRMS_DAYS > 0 ? FIRMS_DAYS : 1,
      lastUpdated,
      status: anySourceOk ? 'live' : 'degraded',
    }, {
      status: anySourceOk ? 200 : 502,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      fires: [],
      total: 0,
      sources,
      lastUpdated,
      status: 'error',
      error: 'Fires feed unavailable',
      message: error.message,
    }, { status: 500 });
  }
}
