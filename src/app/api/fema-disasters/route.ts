import { NextResponse } from 'next/server';
import { fetchFemaDisasters, fetchActiveFemaDisasters } from '@/lib/fema-disasters.mjs';

export const dynamic = 'force-dynamic';

const FEMA_LIMIT = Number(process.env.FEMA_LIMIT || 100);

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || undefined;
  const mode = searchParams.get('mode') || 'active'; // 'active' | 'all'

  try {
    const limit = Number.isFinite(FEMA_LIMIT) && FEMA_LIMIT > 0 ? FEMA_LIMIT : 100;
    let disasters;
    let sourceStatus;

    if (mode === 'all') {
      disasters = await fetchFemaDisasters({ state, limit } as { state?: string; limit: number });
      sourceStatus = [{ source: 'FEMA Open Data (all)', ok: true, count: disasters.length, error: null }];
    } else {
      disasters = await fetchActiveFemaDisasters({ state, days: 365 } as { state?: string; days: number });
      sourceStatus = [{ source: 'FEMA Open Data (active 365d)', ok: true, count: disasters.length, error: null }];
    }

    return NextResponse.json({
      disasters,
      total: disasters.length,
      mode,
      byState: disasters.reduce((acc: Record<string, number>, d: any) => { acc[d.state] = (acc[d.state] || 0) + 1; return acc; }, {}),
      byType: disasters.reduce((acc: Record<string, number>, d: any) => { acc[d.incidentType] = (acc[d.incidentType] || 0) + 1; return acc; }, {}),
      sources: ['FEMA Disaster Declarations'],
      sourceStatus,
      timestamp,
      status: 'live',
      notice: 'Federal disaster declarations with IA/PA/HM program flags. Active mode shows last 365 days.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      disasters: [],
      total: 0,
      sources: ['FEMA Disaster Declarations'],
      timestamp,
      status: 'error',
      error: 'FEMA disaster feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
