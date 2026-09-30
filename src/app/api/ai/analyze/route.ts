import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeIntelligence,
  type IntelligenceContext,
} from '@/lib/ai-engine';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

export const dynamic = 'force-dynamic';

const MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

export async function POST(request: NextRequest) {
  if (isRateLimited(`analyze:${getClientIp(request)}`, 10)) {
    return NextResponse.json({ error: 'Too many questions. Wait a minute and try again.', code: 'RATE_LIMITED', retryAfter: 60 }, { status: 429 });
  }

  let body: { query?: string; context?: IntelligenceContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const query = String(body.query || '').trim().slice(0, 1000);
  if (!query) return NextResponse.json({ error: 'Missing query', code: 'BAD_REQUEST' }, { status: 400 });
  const raw: Partial<IntelligenceContext> = body.context && typeof body.context === 'object' ? body.context : {};
  const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);
  const context: IntelligenceContext = {
    earthquakes: list(raw.earthquakes),
    news: list(raw.news),
    threats: list(raw.threats),
    cyberAlerts: list(raw.cyberAlerts),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
  };

  try {
    const analysis = await analyzeIntelligence(context, query);
    return NextResponse.json({ analysis, model: MODEL, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: 'AI not configured. Set OPENROUTER_API_KEY to enable the analyst.', code: 'NO_AI_KEY' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Analysis failed. Please try again.', code: 'UPSTREAM_ERROR', message }, { status: 502 });
  }
}
