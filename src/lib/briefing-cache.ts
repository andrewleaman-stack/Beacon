import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL_SECONDS = 300; // 5 minutes
const TOKEN_BUDGET = 8000;

interface IntelligenceContext {
  earthquakes: any[];
  news: any[];
  threats: any[];
  cyberAlerts: any[];
  timestamp: string;
  feedHealth?: Record<string, any>;
}

interface BriefingRequest {
  context: IntelligenceContext;
  role: 'general' | 'chaplain' | 'police';
  translateNonEnglish: boolean;
  mode: 'highlights' | 'full';
}

function hashContext(context: IntelligenceContext): string {
  const serialized = JSON.stringify(context, Object.keys(context).sort());
  return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
}

function summarizeContext(context: IntelligenceContext, budget: number): IntelligenceContext {
  const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, ELEVATED: 2, LOW: 1 };

  // Estimate tokens per item (rough heuristic)
  const tokensPerItem = 150;
  const maxItems = Math.floor(budget / tokensPerItem);

  return {
    earthquakes: context.earthquakes
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, maxItems),
    news: context.news
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, maxItems),
    threats: context.threats
      .sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0))
      .slice(0, maxItems),
    cyberAlerts: context.cyberAlerts.slice(0, maxItems),
    timestamp: context.timestamp,
    feedHealth: context.feedHealth,
  };
}

export async function getCachedBriefing(contextHash: string): Promise<string | null> {
  try {
    return await redis.get(`briefing:${contextHash}`);
  } catch {
    return null;
  }
}

export async function setCachedBriefing(contextHash: string, briefing: string): Promise<void> {
  try {
    await redis.setex(`briefing:${contextHash}`, CACHE_TTL_SECONDS, briefing);
  } catch {
    // Cache failure is non-blocking
  }
}

export async function generateBriefingWithCache(
  request: BriefingRequest,
  generator: (req: BriefingRequest) => Promise<string>
): Promise<string> {
  const contextHash = hashContext(request.context);
  const summarizedContext = summarizeContext(request.context, TOKEN_BUDGET);

  // Check cache first
  const cached = await getCachedBriefing(contextHash);
  if (cached) return cached;

  // Generate with summarized context
  const briefing = await generator({
    ...request,
    context: summarizedContext,
  });

  // Cache the result
  await setCachedBriefing(contextHash, briefing);

  return briefing;
}

export { hashContext, summarizeContext };