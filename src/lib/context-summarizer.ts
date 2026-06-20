// Context summarization for token efficiency
// Reduces IntelligenceContext to fit within token budget (8k tokens)

import type { IntelligenceContext, EarthquakeEvent, NewsItem, ThreatEvent, CyberAlert } from '@/types/feeds';

const TOKEN_BUDGET = 8000; // ~8k tokens for context
const TOKENS_PER_CHAR = 0.25; // Rough estimate

interface SummarizedContext {
  earthquakes: EarthquakeEvent[];
  news: NewsItem[];
  threats: ThreatEvent[];
  cyberAlerts: CyberAlert[];
  timestamp: string;
  summary: string;
  tokenEstimate: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

function serializeEarthquake(eq: EarthquakeEvent): string {
  const tsunamiFlag = eq.tsunami ? ' ⚠️TSUNAMI' : '';
  const alertFlag = eq.alert ? ` [ALERT:${eq.alert.toUpperCase()}]` : '';
  return `M${eq.magnitude} | ${eq.location} | ${eq.latitude.toFixed(2)},${eq.longitude.toFixed(2)} | Depth:${eq.depth}km | ${eq.timestamp}${tsunamiFlag}${alertFlag}`;
}

function serializeNews(item: NewsItem): string {
  const coords = item.coords ? ` | GEO:${item.coords[0].toFixed(2)},${item.coords[1].toFixed(2)}` : '';
  return `RISK:${item.risk_score}/10 | ${item.source} | ${item.title}${coords} | ${item.published} | SRC:${item.link}`;
}

function serializeThreat(threat: ThreatEvent): string {
  return `${threat.severity} | ${threat.type} | ${threat.title} | ${threat.region} | ${threat.timestamp}`;
}

function serializeCyber(alert: CyberAlert): string {
  return `${alert.id} | ${alert.severity} | ${alert.vendor}/${alert.product} | ${alert.name} | Due:${alert.due}`;
}

function buildSummary(context: IntelligenceContext): string {
  const parts: string[] = [];

  if (context.earthquakes.length > 0) {
    const maxMag = Math.max(...context.earthquakes.map(e => e.magnitude));
    const critical = context.earthquakes.filter(e => e.magnitude >= 6).length;
    parts.push(`🌍 ${context.earthquakes.length} quakes (max M${maxMag.toFixed(1)}${critical ? `, ${critical} M≥6.0` : ''})`);
  }

  if (context.news.length > 0) {
    const highRisk = context.news.filter(n => n.risk_score >= 7).length;
    parts.push(`📰 ${context.news.length} news items${highRisk ? ` (${highRisk} high-risk)` : ''}`);
  }

  if (context.threats.length > 0) {
    const critical = context.threats.filter(t => t.severity === 'CRITICAL').length;
    parts.push(`⚔️ ${context.threats.length} threats${critical ? ` (${critical} CRITICAL)` : ''}`);
  }

  if (context.cyberAlerts.length > 0) {
    parts.push(`🔒 ${context.cyberAlerts.length} cyber alerts`);
  }

  return parts.join(' | ');
}

export function summarizeContext(
  context: IntelligenceContext,
  options?: { mode?: 'highlights' | 'full'; tokenBudget?: number }
): SummarizedContext {
  const budget = options?.tokenBudget || TOKEN_BUDGET;
  const mode = options?.mode || 'highlights';

  if (mode === 'highlights') {
    const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, ELEVATED: 2, LOW: 1 };

    return {
      earthquakes: [...context.earthquakes].sort((a, b) => b.magnitude - a.magnitude).slice(0, 3),
      news: [...context.news].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3),
      threats: [...context.threats].sort((a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0)).slice(0, 3),
      cyberAlerts: context.cyberAlerts.slice(0, 3),
      timestamp: context.timestamp,
      summary: buildSummary(context),
      tokenEstimate: estimateTokens(buildSummary(context)),
    };
  }

  // Full mode - include all but with token budget awareness
  let earthquakes = [...context.earthquakes];
  let news = [...context.news];
  let threats = [...context.threats];
  let cyberAlerts = [...context.cyberAlerts];

  const fullText = serializeContext({
    earthquakes,
    news,
    threats,
    cyberAlerts,
    timestamp: context.timestamp,
  });

  if (estimateTokens(fullText) > budget) {
    // Progressively reduce until under budget
    while (estimateTokens(fullText) > budget && (earthquakes.length > 5 || news.length > 5 || threats.length > 5 || cyberAlerts.length > 5)) {
      if (earthquakes.length > 5) earthquakes = earthquakes.slice(0, -1);
      else if (news.length > 5) news = news.slice(0, -1);
      else if (threats.length > 5) threats = threats.slice(0, -1);
      else if (cyberAlerts.length > 5) cyberAlerts = cyberAlerts.slice(0, -1);
    }
  }

  return {
    earthquakes,
    news,
    threats,
    cyberAlerts,
    timestamp: context.timestamp,
    summary: buildSummary(context),
    tokenEstimate: estimateTokens(fullText),
  };
}

function serializeContext(context: IntelligenceContext): string {
  const sections: string[] = [];
  sections.push(`[TIMESTAMP] ${context.timestamp}`);

  if (context.earthquakes.length > 0) {
    sections.push(`\n[SEISMIC DATA — ${context.earthquakes.length} events]`);
    for (const eq of context.earthquakes) sections.push(serializeEarthquake(eq));
  }

  if (context.news.length > 0) {
    sections.push(`\n[OSINT NEWS FEED — ${context.news.length} items]`);
    for (const item of context.news) sections.push(serializeNews(item));
  }

  if (context.threats.length > 0) {
    sections.push(`\n[THREAT EVENTS — ${context.threats.length} active]`);
    for (const threat of context.threats) sections.push(serializeThreat(threat));
  }

  if (context.cyberAlerts.length > 0) {
    sections.push(`\n[CYBER ALERTS — ${context.cyberAlerts.length} active]`);
    for (const alert of context.cyberAlerts) sections.push(serializeCyber(alert));
  }

  return sections.join('\n');
}