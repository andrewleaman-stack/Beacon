import { NextResponse } from 'next/server';
import { fetchSubmarineCableFaults } from '@/lib/submarine-cable-faults.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || 25), 50);

  try {
    const faults = await fetchSubmarineCableFaults({ limit });
    return NextResponse.json({
      faults,
      total: faults.length,
      sources: ['GDELT submarine cable disruption search'],
      timestamp,
      status: 'live',
      notice: 'News-derived submarine cable fault/disruption monitor. Treat as situational awareness, not authoritative repair status.',
    }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200' } });
  } catch (error: any) {
    const rateLimited = String(error.message || '').includes('429');
    return NextResponse.json({
      faults: [],
      total: 0,
      sources: ['GDELT submarine cable disruption search'],
      timestamp,
      status: rateLimited ? 'rate_limited' : 'upstream_unavailable',
      error: rateLimited ? 'GDELT rate limited' : 'Submarine cable fault search unavailable',
      message: error.message,
      notice: 'Endpoint is wired. Upstream news search is temporarily unavailable or rate limited; returning empty set instead of poisoning feed-health.',
    }, { status: 200, headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
  }
}
