import { NextResponse } from 'next/server';
import { ensureWikiSurgeStream, getWikiSurges } from '@/lib/wiki-surge-stream.mjs';

export const dynamic = 'force-dynamic';

const NOTICE = 'Wikipedia articles drawing an unusual rush of edits. A lead to investigate, not confirmation of an event.';

export async function GET() {
  const timestamp = new Date().toISOString();
  if (process.env.VERCEL || process.env.WIKI_SURGE_STREAM === '0') {
    return NextResponse.json({ surges: [], total: 0, timestamp, status: 'unsupported', notice: 'Needs a long-running server (runs on the Pi, not Vercel).' });
  }
  ensureWikiSurgeStream();
  try {
    const { surges, stream } = await getWikiSurges();
    return NextResponse.json({
      surges,
      total: surges.length,
      timestamp,
      source: 'Wikimedia EventStreams + Wikipedia API',
      status: stream.warmingUp ? 'warming' : stream.lastEventAt ? 'live' : 'connecting',
      stream,
      notice: NOTICE,
    });
  } catch (error: any) {
    return NextResponse.json({ surges: [], total: 0, timestamp, status: 'error', error: 'Wiki surge detector unavailable', message: error?.message }, { status: 502 });
  }
}
