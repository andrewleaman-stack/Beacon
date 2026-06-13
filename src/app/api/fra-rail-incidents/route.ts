import { NextResponse } from 'next/server';
import { fetchFraRailIncidents } from '@/lib/fra-rail-incidents.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'MI';
  const limit = Math.min(Number(searchParams.get('limit') || 50), 500);

  try {
    const incidents = await fetchFraRailIncidents({ state, limit });
    return NextResponse.json({
      incidents,
      total: incidents.length,
      state,
      sources: ['FRA Form 54 Rail Equipment Accident/Incident Data'],
      timestamp,
      status: 'live',
      notice: 'FRA Form 54 rail equipment accident/incident records via DOT Socrata dataset 85tf-25kj.',
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error: any) {
    return NextResponse.json({
      incidents: [],
      total: 0,
      state,
      sources: ['FRA Form 54 Rail Equipment Accident/Incident Data'],
      timestamp,
      status: 'upstream_unavailable',
      error: 'FRA upstream unavailable',
      message: error.message,
      notice: 'Endpoint is wired, but data.transportation.gov/FRA is currently unavailable or rate limited. Returning empty set instead of poisoning feed-health.',
    }, { status: 200, headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  }
}
