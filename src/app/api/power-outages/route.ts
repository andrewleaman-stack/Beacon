import { NextResponse } from 'next/server';
import { fetchPowerOutages } from '@/lib/power-outages.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const outages = await fetchPowerOutages();
    return NextResponse.json({
      outages,
      total: outages.length,
      sources: ['DTE Kubra summary via Michigan Daily tracker'],
      timestamp,
      status: 'live',
      notice: 'DTE service territory outage summary. This is a regional summary source, not individual outage polygons.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      outages: [],
      total: 0,
      sources: ['DTE Kubra summary via Michigan Daily tracker'],
      timestamp,
      status: 'error',
      error: 'Power outages feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
