import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';

interface AskSituation {
  title?: string;
  country?: string;
  centroid?: { lat: number; lng: number };
  topSeverity?: string;
  score?: number;
  eventCount?: number;
  sources?: string[];
  lastTime?: string | null;
  events?: Array<{ title?: string; source?: string; severity?: string }>;
}

/** Compact, source-grounded context string from the situations the user sees. */
function buildContext(situations: AskSituation[]): string {
  return situations.slice(0, 12).map((s, i) => {
    const place = s.country || (s.centroid ? `${s.centroid.lat.toFixed(1)},${s.centroid.lng.toFixed(1)}` : 'unknown');
    const samples = (s.events || []).slice(0, 4).map((e) => `• ${(e.title || 'event').slice(0, 100)} (${e.source || '?'})`).join('\n');
    return `[#${i + 1}] ${place} — severity ${s.topSeverity || '?'}, score ${Math.round(s.score || 0)}, ${s.eventCount || 0} events from ${(s.sources || []).join(', ') || 'feeds'}; last ${s.lastTime || 'n/a'}\n${samples}`;
  }).join('\n\n');
}

export async function POST(request: NextRequest) {
  let body: { question?: string; situations?: AskSituation[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = String(body.question || '').trim().slice(0, 500);
  const situations = Array.isArray(body.situations) ? body.situations : [];
  if (!question) return NextResponse.json({ error: 'Missing question' }, { status: 400 });

  if (situations.length === 0) {
    return NextResponse.json({
      answer: 'No active situations are loaded right now. Toggle map layers or run a DEEP SCAN, then ask again.',
      grounded: false,
    });
  }

  try {
    const answer = await answerQuestion(question, buildContext(situations));
    return NextResponse.json({ answer, grounded: true, situationsUsed: Math.min(situations.length, 12) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json(
        { error: 'AI not configured. Set OPENROUTER_API_KEY to enable natural-language queries.', code: 'NO_AI_KEY' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Query failed. Please try again.', message }, { status: 502 });
  }
}
