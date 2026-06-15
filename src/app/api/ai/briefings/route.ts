import { NextRequest, NextResponse } from 'next/server';
import { readBriefings } from '@/lib/briefing-log.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(parseInt(limitParam, 10), 500)) : 50;
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

    const entries = await readBriefings({ limit, offset });
    return NextResponse.json(entries);
  } catch (err) {
    console.error('[BEACON AI] Error retrieving briefing log:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve briefing log' },
      { status: 500 }
    );
  }
}
