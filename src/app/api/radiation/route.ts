import { NextResponse } from 'next/server';
import { fetchRadiationStations } from '@/lib/radiation.mjs';

export const dynamic = 'force-dynamic';

const RADIATION_LIMIT = Number(process.env.RADIATION_LIMIT || 1500);

export async function GET() {
  const timestamp = new Date().toISOString();
  const limit = Number.isFinite(RADIATION_LIMIT) && RADIATION_LIMIT > 0 ? RADIATION_LIMIT : 1500;

  try {
    const stations = await fetchRadiationStations({ limit });
    const byStatus = stations.reduce((acc: Record<string, number>, s: { status: string }) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json(
      {
        stations,
        total: stations.length,
        byStatus,
        sources: ['Safecast Realtime'],
        timestamp,
        status: stations.length ? 'live' : 'empty',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        stations: [],
        total: 0,
        sources: ['Safecast Realtime'],
        timestamp,
        status: 'error',
        error: 'Radiation feed unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
