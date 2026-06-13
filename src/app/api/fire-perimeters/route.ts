import { NextResponse } from 'next/server';
import { fetchNifcFirePerimeters } from '@/lib/nifc-fire-perimeters.mjs';

export const dynamic = 'force-dynamic';

const FIRE_PERIMETER_LIMIT = Number(process.env.FIRE_PERIMETER_LIMIT || 250);

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const limit = Number.isFinite(FIRE_PERIMETER_LIMIT) && FIRE_PERIMETER_LIMIT > 0 ? FIRE_PERIMETER_LIMIT : 250;
    const perimeters = await fetchNifcFirePerimeters({ limit });
    return NextResponse.json({
      perimeters,
      total: perimeters.length,
      sources: ['NIFC WFIGS'],
      timestamp,
      status: 'live',
      notice: 'NIFC WFIGS perimeters provide incident boundary context for FIRMS thermal detections.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      perimeters: [],
      total: 0,
      sources: ['NIFC WFIGS'],
      timestamp,
      status: 'error',
      error: 'Fire perimeter feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
