import { NextResponse } from 'next/server';
import { fetchNrcEvents } from '@/lib/nrc-events.mjs';

export const dynamic = 'force-dynamic';

const NRC_EVENT_LIMIT = Number(process.env.NRC_EVENT_LIMIT || 50);

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const limit = Number.isFinite(NRC_EVENT_LIMIT) && NRC_EVENT_LIMIT > 0 ? NRC_EVENT_LIMIT : 50;
    const events = await fetchNrcEvents({ limit });
    return NextResponse.json({
      events,
      total: events.length,
      bySeverity: events.reduce((acc: Record<string, number>, event: any) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {}),
      sources: ['NRC Event Notifications', 'zachlandes/nrc-event-scraper mirror'],
      timestamp,
      status: 'live',
      notice: 'NRC event notifications mirrored from public NRC reports into structured JSONL for reliability.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      events: [],
      total: 0,
      sources: ['NRC Event Notifications'],
      timestamp,
      status: 'error',
      error: 'NRC event feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
