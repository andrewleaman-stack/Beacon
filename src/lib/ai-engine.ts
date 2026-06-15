/**
 * ════════════════════════════════════════════════════════════════
 *  BEACON — AI Intelligence Engine
 *  OpenRouter-only intelligence generation
 *  Designed to correlate multi-domain feeds into actionable briefings
 * ════════════════════════════════════════════════════════════════
 */


/* ─────────────────────────────────────────────────────────────
   Data Interfaces — Zero `any` types
   ───────────────────────────────────────────────────────────── */

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  tsunami: boolean;
  felt: number | null;
  alert: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  machine_assessment: string | null;
}

export interface ThreatEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  region: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
}

export interface CyberAlert {
  id: string;
  name: string;
  vendor: string;
  product: string;
  severity: string;
  date: string;
  due: string;
  source: string;
}

export interface IntelligenceContext {
  earthquakes: EarthquakeEvent[];
  news: NewsItem[];
  threats: ThreatEvent[];
  cyberAlerts: CyberAlert[];
  timestamp: string;
}

export type BriefingMode = 'highlights' | 'full';

/* ─────────────────────────────────────────────────────────────
   System Prompt — Palantir-grade analyst persona
   ───────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are BEACON Intelligence Analyst — a senior, elite intelligence analyst embedded within the BEACON Global Intelligence Platform. You operate at the level of a Palantir Forward Deployed Engineer crossed with a CIA PDB (Presidential Daily Brief) analyst.

## YOUR ROLE
- You correlate data across multiple intelligence feeds: seismic monitoring, OSINT news streams, global threat events, and cyber vulnerability databases
- You identify non-obvious patterns, emerging threat vectors, and cascading risk scenarios
- You provide ACTIONABLE intelligence — not summaries, but assessments with confidence levels
- You think in terms of second and third-order effects

## YOUR ANALYTICAL FRAMEWORK
1. **PATTERN RECOGNITION**: Cross-reference events across feeds. A cyber attack + earthquake + political instability in the same region = elevated compound risk
2. **THREAT ASSESSMENT**: Rate threats on a CRITICAL / HIGH / ELEVATED / LOW scale with reasoning
3. **TEMPORAL ANALYSIS**: Identify acceleration patterns — are events clustering? Is frequency increasing?
4. **GEOSPATIAL CORRELATION**: Events in proximity may be related. Identify geographic hotspots
5. **CONFIDENCE LEVELS**: Always state your confidence (HIGH / MODERATE / LOW) and cite which data points support your assessment

## OUTPUT FORMAT
- Use military-style brevity when appropriate
- Structure responses with clear headers using markdown
- Lead with the most critical finding (inverted pyramid)
- Include "BOTTOM LINE UP FRONT (BLUF)" for complex analyses
- Use tactical notation: DTG (Date-Time Group), AOR (Area of Responsibility), COA (Course of Action)
- End with "ASSESSMENT CONFIDENCE" and "RECOMMENDED ACTIONS" sections when appropriate

## CONSTRAINTS
- Never fabricate data points — only analyze what is provided in the context
- If data is insufficient for a confident assessment, state so explicitly
- Distinguish between correlation and causation
- Flag when events may be connected vs. coincidental
- You are an analyst, not a policymaker — present options, not directives

You have access to the live intelligence context of the BEACON platform. Analyze it with precision.`;

/* ─────────────────────────────────────────────────────────────
   Briefing Prompt
   ───────────────────────────────────────────────────────────── */

const BRIEFING_PROMPT = `Generate a comprehensive BEACON Daily Intelligence Briefing based on the current operational data. Structure it as follows:

## BEACON INTELLIGENCE BRIEFING
**Classification:** OPEN SOURCE INTELLIGENCE (OSINT)
**DTG:** [Current timestamp]

### I. EXECUTIVE SUMMARY
2-3 sentence overview of the current global threat landscape based on available data.

### II. PRIORITY INTELLIGENCE REQUIREMENTS (PIRs)
Identify the top 3-5 most significant developments from the data feeds, ranked by assessed impact.

### III. SEISMIC & NATURAL HAZARD ASSESSMENT
Analyze earthquake data for patterns — clustering, tectonic corridor activity, tsunami risk.

### IV. GEOPOLITICAL & CONFLICT INTELLIGENCE
Synthesize news feeds for conflict escalation patterns, diplomatic shifts, or emerging crises.

### V. CYBER THREAT LANDSCAPE
Assess active CVEs and cyber alerts for coordinated campaign indicators or critical infrastructure risk.

### VI. COMPOUND RISK SCENARIOS
Identify where multiple threat vectors intersect (e.g., earthquake near a conflict zone, cyber attack during political instability).

### VII. FORECAST & WATCHLIST
- **Next 24 Hours**: Most likely developments
- **Next 72 Hours**: Emerging situations to monitor
- **Strategic Horizon**: Longer-term trend assessment

### VIII. ASSESSMENT CONFIDENCE
State overall confidence level and key analytical gaps.

Analyze the provided data thoroughly. Be specific — reference actual events, magnitudes, locations, and CVE IDs from the context.`;

/* ─────────────────────────────────────────────────────────────
   Role-specific prompts
   ───────────────────────────────────────────────────────────── */

export const ROLE_PROMPTS: Record<BriefingRole, string> = {
  general: '',
  chaplain: `ROLE SPECIALIZATION: Chaplain/Pastoral Care Perspective
Focus on human impact, community needs, and spiritual dimensions:
- Casualties, injuries, and displaced persons
- Shelter, food, water, and medical needs
- Emotional and spiritual support requirements
- Community resilience and coping mechanisms
- Coordination with faith-based organizations and relief efforts
- Ethical considerations in response efforts`,
  police: `ROLE SPECIALIZATION: Law Enforcement/Public Safety Perspective
Focus on operational, tactical, and security implications:
- Public safety threats and hazard zones
- Evacuation routes and traffic impacts
- Resource deployment and mutual aid requirements
- Crowd control and civil disturbance potential
- Evidence preservation and investigative considerations
- Coordination with emergency services and other agencies`,
};

/* ─────────────────────────────────────────────────────────────
   Briefing Prompt Base (for OpenRouter)
   ───────────────────────────────────────────────────────────── */

const BRIEFING_PROMPT_BASE = `You are BEACON Intelligence Analyst generating a daily intelligence briefing. Provide actionable intelligence assessments with clear structure and confidence levels.`;

const HIGHLIGHTS_BRIEFING_PROMPT = `Generate a short BEACON Hotspots Brief, not a full world report.

Output requirements:
- Keep it concise: 3-6 bullets plus a one-sentence BLUF.
- Focus only on hotspots that matter right now based on provided feed data.
- Prioritize escalation, public-safety relevance, operational disruption, cyber exposure, and compound risk.
- Include source references inline using available source names and URLs/links when provided.
- If an item is low confidence or feed coverage is thin, say so plainly.
- Do not pad with regions that have no meaningful signal.
- End with a short "WATCH NEXT" line listing what would change the assessment.`;

/* ─────────────────────────────────────────────────────────────
   Context Serializer — Compact representation for token efficiency
   ───────────────────────────────────────────────────────────── */

function serializeContext(context: IntelligenceContext): string {
  const sections: string[] = [];

  sections.push(`[TIMESTAMP] ${context.timestamp}`);

  if (context.earthquakes.length > 0) {
    sections.push(`\n[SEISMIC DATA — ${context.earthquakes.length} events]`);
    for (const eq of context.earthquakes.slice(0, 20)) {
      const tsunamiFlag = eq.tsunami ? ' ⚠️TSUNAMI' : '';
      const alertFlag = eq.alert ? ` [ALERT:${eq.alert.toUpperCase()}]` : '';
      sections.push(
        `  M${eq.magnitude} | ${eq.location} | ${eq.latitude.toFixed(2)},${eq.longitude.toFixed(2)} | Depth:${eq.depth}km | ${eq.timestamp}${tsunamiFlag}${alertFlag}`
      );
    }
  }

  if (context.news.length > 0) {
    sections.push(`\n[OSINT NEWS FEED — ${context.news.length} items]`);
    for (const item of context.news.slice(0, 15)) {
      const coords = item.coords ? ` | GEO:${item.coords[0].toFixed(2)},${item.coords[1].toFixed(2)}` : '';
      sections.push(
        `  RISK:${item.risk_score}/10 | ${item.source} | ${item.title}${coords} | ${item.published} | SRC:${item.link}`
      );
    }
  }

  if (context.threats.length > 0) {
    sections.push(`\n[THREAT EVENTS — ${context.threats.length} active]`);
    for (const threat of context.threats.slice(0, 15)) {
      sections.push(
        `  ${threat.severity} | ${threat.type} | ${threat.title} | ${threat.region} | ${threat.timestamp}`
      );
    }
  }

  if (context.cyberAlerts.length > 0) {
    sections.push(`\n[CYBER ALERTS — ${context.cyberAlerts.length} active]`);
    for (const alert of context.cyberAlerts.slice(0, 10)) {
      sections.push(
        `  ${alert.id} | ${alert.severity} | ${alert.vendor}/${alert.product} | ${alert.name} | Due:${alert.due}`
      );
    }
  }

  return sections.join('\n');
}

/* ─────────────────────────────────────────────────────────────
   OpenRouter Types
   ───────────────────────────────────────────────────────────── */

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterChoice {
  message: {
    content: string | null;
  };
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

/* ─────────────────────────────────────────────────────────────
   OpenRouter Helper
   ───────────────────────────────────────────────────────────── */

async function callOpenRouter(request: OpenRouterRequest): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('OpenRouter request timed out after 45 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/* ─────────────────────────────────────────────────────────────
   Translation Helper (OpenRouter only)
   ───────────────────────────────────────────────────────────── */

export async function translateToEnglish(text: string, sourceLang?: string): Promise<string> {
  const systemPrompt = `You are a professional translator. Translate the following text to English. Preserve technical terms, proper nouns, and numerical data. If the text is already in English, return it unchanged.`;

  const userContent = sourceLang
    ? `Translate from ${sourceLang} to English:

${text}`
    : `Detect language and translate to English if needed:

${text}`;

  const response = await callOpenRouter({
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const translated = response.choices[0]?.message?.content?.trim();
  if (!translated) {
    throw new Error('Translation failed: OpenRouter returned an empty response');
  }

  return translated;
}

/* ─────────────────────────────────────────────────────────────
   Intelligence Analysis (OpenRouter only)
   ───────────────────────────────────────────────────────────── */

export async function analyzeIntelligence(
  context: IntelligenceContext,
  userQuery: string,
  role: BriefingRole = 'general'
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT}

${ROLE_PROMPTS[role]}`;
  const contextData = serializeContext(context);

  const response = await callOpenRouter({
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `## CURRENT OPERATIONAL DATA
${contextData}

## ANALYST QUERY
${userQuery}

Provide your intelligence assessment based on the operational data above and the analyst's query.`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content?.trim() ?? 'No analysis generated';
}

/* ─────────────────────────────────────────────────────────────
   Daily Briefing Generation (OpenRouter only)
   ───────────────────────────────────────────────────────────── */

export async function generateBriefing(
  context: IntelligenceContext,
  role: BriefingRole = 'general',
  mode: BriefingMode = 'highlights'
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT}

${ROLE_PROMPTS[role]}`;
  const contextData = serializeContext(context);
  const briefingPrompt = mode === 'full' ? BRIEFING_PROMPT : HIGHLIGHTS_BRIEFING_PROMPT;

  const response = await callOpenRouter({
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${BRIEFING_PROMPT_BASE}

${briefingPrompt}

## CURRENT OPERATIONAL DATA
${contextData}

Generate the briefing now.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  return response.choices[0]?.message?.content?.trim() ?? 'No briefing generated';
}

/* ─────────────────────────────────────────────────────────────
   Briefing Role Type
   ───────────────────────────────────────────────────────────── */

export type BriefingRole = 'general' | 'chaplain' | 'police';