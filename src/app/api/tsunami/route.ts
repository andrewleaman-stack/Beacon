import { NextResponse } from 'next/server';
import { fetchNwsTsunamiAlerts } from '@/lib/nws-tsunami.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const area = searchParams.get('area') || undefined;

  try {
    const alerts = await fetchNwsTsunamiAlerts({ area });
    return NextResponse.json({
      alerts,
      total: alerts.length,
      sources: ['NWS CAP'],
      timestamp,
      status: 'live',
      notice: 'NWS CAP API for Tsunami Warnings/Watches. Returns GeoJSON features with polygon/point geometries.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      alerts: [],
      total: 0,
      sources: ['NWS CAP'],
      timestamp,
      status: 'error',
      error: 'Tsunami alerts feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
