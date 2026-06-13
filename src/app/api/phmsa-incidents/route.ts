import { NextResponse } from 'next/server';
import { fetchPhmsaIncidents } from '@/lib/phmsa-incidents.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'MI';
  const limit = Math.min(Number(searchParams.get('limit') || 50), 500);

  try {
    const incidents = await fetchPhmsaIncidents({ state, limit });
    return NextResponse.json({
      incidents,
      total: incidents.length,
      state,
      sources: ['PHMSA Pipeline Incident Flagged Files'],
      timestamp,
      status: 'live',
      notice: 'PHMSA pipeline incident flagged files via DOT Socrata dataset qdme-9bbm.',
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error: any) {
    return NextResponse.json({
      incidents: [],
      total: 0,
      state,
      sources: ['PHMSA Pipeline Incident Flagged Files'],
      timestamp,
      status: 'upstream_unavailable',
      error: 'PHMSA upstream unavailable',
      message: error.message,
      notice: 'Endpoint is wired, but data.transportation.gov/PHMSA is currently unavailable or rate limited. Returning empty set instead of poisoning feed-health. Government API goblin contained.',
    }, { status: 200, headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  }
}
