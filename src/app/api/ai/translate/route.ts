/**
 * ════════════════════════════════════════════════════════════════
 *  BEACON — AI Translation Endpoint
 *  POST /api/ai/translate
 *  Translates text to English using OpenRouter (Nemotron 3.5) with fallback
 * ════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateToEnglish } from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';

/* ─────────────────────────────────────────────────────────────
   Rate Limiter — 10 requests per minute per IP (more permissive than analysis)
   ───────────────────────────────────────────────────────────── */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetAt - now };
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 120_000);

/* ─────────────────────────────────────────────────────────────
   Request / Response types
   ───────────────────────────────────────────────────────────── */
interface TranslateRequestBody {
  text: string;
  sourceLang?: string; // e.g., 'es', 'fr', 'auto' for auto-detect
}

interface TranslateResponse {
  translatedText: string;
  sourceLang: string; // What we detected/used
  translated: boolean; // Whether translation was actually performed
}

interface ErrorResponse {
  error: string;
  code: string;
}

/* ─────────────────────────────────────────────────────────────
   POST Handler
   ───────────────────────────────────────────────────────────── */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TranslateResponse | ErrorResponse>> {
  // Extract client IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Rate limit check
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 10 requests per minute.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
        },
      }
    );
  }

  // Parse request body
  let body: TranslateRequestBody;
  try {
    body = (await request.json()) as TranslateRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  if (!body.text || typeof body.text !== 'string') {
    return NextResponse.json(
      { error: 'Text field is required and must be a string.', code: 'MISSING_TEXT' },
      { status: 400 }
    );
  }

  const sourceLang = body.sourceLang ?? 'auto';

  try {
    const translatedText = await translateToEnglish(body.text, sourceLang);
    const translated = translatedText !== body.text;

    return NextResponse.json(
      {
        translatedText,
        sourceLang: sourceLang === 'auto' ? 'detected' : sourceLang,
        translated,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600', // 10 min cache for translations
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown translation error';
    console.error('[BEACON AI] Translation error:', message);

    return NextResponse.json(
      { error: 'Translation failed. Please try again.', code: 'TRANSLATION_FAILED' },
      { status: 500 }
    );
  }
}