import { NextResponse } from 'next/server';
import { fetchEpaEchoFacilities } from '@/lib/epa-echo-facilities.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'MI';
  const limit = Math.min(Number(searchParams.get('limit') || 500), 1000);

  try {
    const facilities = await fetchEpaEchoFacilities({ state, limit });
    return NextResponse.json({
      facilities,
      total: facilities.length,
      state,
      sources: ['EPA ECHO CWA'],
      timestamp,
      status: 'live',
      notice: 'EPA ECHO CWA regulated facilities reference layer. Useful for enriching nearby incidents; not itself an incident feed.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: any) {
    const rateLimited = String(error.message || '').includes('429');
    return NextResponse.json({
      facilities: [],
      total: 0,
      state,
      sources: ['EPA ECHO CWA'],
      timestamp,
      status: rateLimited ? 'rate_limited' : 'error',
      error: rateLimited ? 'EPA ECHO rate limited' : 'EPA ECHO facilities feed unavailable',
      message: error.message,
      notice: rateLimited
        ? 'EPA ECHO is temporarily rate limiting requests. Endpoint remains wired and will return facilities when the upstream limit clears.'
        : 'EPA ECHO facilities feed unavailable.',
    }, { status: rateLimited ? 200 : 502 });
  }
}
