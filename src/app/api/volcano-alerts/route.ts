import { NextResponse } from 'next/server';
import { fetchVolcanoAlerts } from '@/lib/usgs-volcano-alerts.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const alerts = await fetchVolcanoAlerts();
    return NextResponse.json({
      alerts,
      total: alerts.length,
      sources: ['USGS Volcano Hazards Program HANS'],
      timestamp,
      status: 'live',
      notice: 'Live USGS HANS elevated volcano CAP feed. Includes volcanoes at elevated aviation color code and/or alert level.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      alerts: [],
      total: 0,
      sources: ['USGS Volcano Hazards Program HANS'],
      timestamp,
      status: 'error',
      error: 'Volcano alerts feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
