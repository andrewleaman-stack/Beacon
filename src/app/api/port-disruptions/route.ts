import { NextResponse } from 'next/server';
import { fetchPortDisruptions } from '@/lib/port-disruptions.mjs';

export const dynamic = 'force-dynamic';

const PORT_DISRUPTION_LIMIT = Number(process.env.PORT_DISRUPTION_LIMIT || 250);

export async function GET() {
  const timestamp = new Date().toISOString();
  const limit = Number.isFinite(PORT_DISRUPTION_LIMIT) && PORT_DISRUPTION_LIMIT > 0 ? PORT_DISRUPTION_LIMIT : 250;

  try {
    const disruptions = await fetchPortDisruptions({ limit });
    const active = disruptions.filter((d: { active: boolean }) => d.active).length;

    return NextResponse.json(
      {
        disruptions,
        total: disruptions.length,
        active,
        sources: ['IMF PortWatch'],
        timestamp,
        status: disruptions.length ? 'live' : 'empty',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        disruptions: [],
        total: 0,
        sources: ['IMF PortWatch'],
        timestamp,
        status: 'error',
        error: 'Port disruptions feed unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
