import { NextResponse } from 'next/server';
import { fetchConflictEvents } from '@/lib/conflict-events.mjs';
import type { ConflictEvent } from '@/lib/conflict-events.mjs';

export const dynamic = 'force-dynamic';

const CONFLICT_EVENT_LIMIT = Number(process.env.CONFLICT_EVENT_LIMIT || 250);

export async function GET() {
  const timestamp = new Date().toISOString();
  const limit = Number.isFinite(CONFLICT_EVENT_LIMIT) && CONFLICT_EVENT_LIMIT > 0 ? CONFLICT_EVENT_LIMIT : 250;

  try {
    const { events, sources, configured, errors } = await fetchConflictEvents({ limit });

    const anyConfigured = configured.ucdp || configured.acled;
    const bySeverity = events.reduce((acc: Record<string, number>, event: ConflictEvent) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json(
      {
        events,
        total: events.length,
        bySeverity,
        sources,
        configured,
        timestamp,
        status: anyConfigured ? (events.length ? 'live' : 'empty') : 'unconfigured',
        notice: anyConfigured
          ? undefined
          : 'No conflict-event credentials configured. Set UCDP_ACCESS_TOKEN (https://ucdp.uu.se/apidocs/) and/or ACLED_API_KEY + ACLED_EMAIL (https://acleddata.com/) to activate.',
        errors: errors.length ? errors : undefined,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        events: [],
        total: 0,
        sources: [],
        timestamp,
        status: 'error',
        error: 'Conflict events feed unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
