/**
 * ════════════════════════════════════════════════════════════════
 *  BEACON — AI Intelligence Briefing Endpoint
 *  POST /api/ai/briefing
 *  Generates structured threat briefings via OpenRouter (primary) / Gemini (fallback)
 *  Supports role-based briefings and automatic translation
 * ════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createGeminiClient,
  rotateGeminiApiKey,
  generateBriefing,
  translateToEnglish,
  type IntelligenceContext,
  type BriefingRole,
} from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';

/* ─────────────────────────────────────────────────────────────
   Rate Limiter — 5 requests per minute per IP
   ───────────────────────────────────────────────────────────── */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 5;
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
   Environment Key Collection (for fallback)
   ───────────────────────────────────────────────────────────── */

function getEnvApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  return keys;
}

/* ─────────────────────────────────────────────────────────────
   Request / Response types
   ───────────────────────────────────────────────────────────── */

interface BriefingRequestBody {
  context: IntelligenceContext;
  role?: BriefingRole; // Optional role, defaults to 'general'
  translateNonEnglish?: boolean; // Whether to translate non-English items in context
}

interface BriefingResponse {
  briefing: string;
  generatedAt: string;
  roleUsed: BriefingRole;
  translated: boolean; // Whether translation was performed
}

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
}

/* ─────────────────────────────────────────────────────────────
   POST Handler
   ───────────────────────────────────────────────────────────── */

export async function POST(
  request: NextRequest
): Promise<NextResponse<BriefingResponse | ErrorResponse>> {
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
        error: 'Rate limit exceeded. Maximum 5 requests per minute.',
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
  let body: BriefingRequestBody;
  try {
    body = (await request.json()) as BriefingRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  if (!body.context) {
    return NextResponse.json(
      { error: 'Intelligence context is required.', code: 'MISSING_CONTEXT' },
      { status: 400 }
    );
  }

  // Determine role (default to 'general')
  const role: BriefingRole = body.role ?? 'general';

  // Fetch feed health to include in context for confidence annotation
  let feedHealth; // We'll type this as any since it's an optional addition
  try {
    const feedHealthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/feed-health`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-store' },
    });
    if (feedHealthResponse.ok) {
      const feedHealthData = await feedHealthResponse.json();
      // Transform to match our feedHealth interface
      feedHealth = {
        status: feedHealthData.status as 'operational' | 'degraded' | 'offline',
        summary: {
          totalFeeds: feedHealthData.summary.totalFeeds,
          activeFeeds: feedHealthData.summary.activeFeeds,
          totalRecords: feedHealthData.summary.totalRecords,
          healthy: feedHealthData.summary.healthy,
          stale: feedHealthData.summary.stale,
          offline: feedHealthData.summary.offline,
          idle: feedHealthData.summary.idle,
        },
      };
    }
  } catch (feedHealthError) {
    console.warn('[BEACON AI] Failed to fetch feed health for briefing context:', feedHealthError);
    // Continue without feed health
  }

  // Optional: Translate non-English items in the context before generating briefing
  let translated = false;
  let processedContext = body.context;
  if (body.translateNonEnglish !== false) { // Default to true if not explicitly false
    try {
      // We'll translate text fields in news items and threat events
      // This is a simplified approach; in production you might want more sophisticated translation
      const contextCopy = JSON.parse(JSON.stringify(body.context)); // Deep copy

      // Add feed health to context
      if (feedHealth) {
        // Since IntelligenceContext doesn't have feedHealth, we'll add it as an optional property
        // @ts-ignore - Adding optional property for briefing context enrichment
        contextCopy.feedHealth = feedHealth;
      }

      // Translate news titles and descriptions
      if (contextCopy.news && Array.isArray(contextCopy.news)) {
        for (const item of contextCopy.news) {
          if (item.title && typeof item.title === 'string') {
            const translatedTitle = await translateToEnglish(item.title, 'auto');
            if (translatedTitle !== item.title) {
              item.title = translatedTitle;
              translated = true;
            }
          }
          if (item.description && typeof item.description === 'string') {
            const translatedDesc = await translateToEnglish(item.description, 'auto');
            if (translatedDesc !== item.description) {
              item.description = translatedDesc;
              translated = true;
            }
          }
        }
      }

      // Translate threat event titles and descriptions
      if (contextCopy.threats && Array.isArray(contextCopy.threats)) {
        for (const threat of contextCopy.threats) {
          if (threat.title && typeof threat.title === 'string') {
            const translatedTitle = await translateToEnglish(threat.title, 'auto');
            if (translatedTitle !== threat.title) {
              threat.title = translatedTitle;
              translated = true;
            }
          }
          if (threat.description && typeof threat.description === 'string') {
            const translatedDesc = await translateToEnglish(threat.description, 'auto');
            if (translatedDesc !== threat.description) {
              threat.description = translatedDesc;
              translated = true;
            }
          }
        }
      }

      processedContext = contextCopy;
    } catch (translationError) {
      console.warn('[BEACON AI] Translation failed, proceeding with original text:', translationError);
      // Continue with original context if translation fails
      processedContext = { ...body.context };
      // @ts-ignore - Adding optional property for briefing context enrichment
      if (feedHealth) processedContext.feedHealth = feedHealth;
    }
  } else {
    // Still add feed health even if not translating
    processedContext = { ...body.context };
    // @ts-ignore - Adding optional property for briefing context enrichment
    if (feedHealth) processedContext.feedHealth = feedHealth;
  }

  try {
    // Generate briefing using the AI engine (OpenRouter primary, Gemini fallback)
    const briefing = await generateBriefing(processedContext, role);

    return NextResponse.json(
      {
        briefing,
        generatedAt: new Date().toISOString(),
        roleUsed: role,
        translated,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    console.error('[BEACON AI] Briefing error:', message);

    // Check for specific error types from our AI engine
    if (message.includes('OPENROUTER_API_KEY') || message.includes('No Gemini API keys')) {
      return NextResponse.json(
        {
          error: 'AI service not configured. Please set OPENROUTER_API_KEY or GEMINI_API_KEY_1.',
          code: 'NO_AI_KEY',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Briefing generation failed. Please try again.', code: 'BRIEFING_FAILED' },
      { status: 500 }
    );
  }
}