/**
 * ════════════════════════════════════════════════════════════════
 *  BEACON — AI Intelligence Briefing Endpoint
 *  POST /api/ai/briefing
 *  Generates structured threat briefings via OpenRouter
 *  Supports role-based briefings and automatic translation
 * ════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateBriefing,
  translateToEnglish,
  type IntelligenceContext,
  type BriefingRole,
  type BriefingMode,
} from '@/lib/ai-engine';
import { promises as fs } from 'fs';
    console.log('[BEACON AI] Briefing generated, length:', briefing.length);
    // Log briefing for backlog/trend tracking
    try {
      const logDir = path.join('/var/log', 'beacon_briefs');
      await fs.mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, 'briefs.log');
      const timestamp = new Date().toISOString();
      const hash = createHash('sha256')
        .update(briefing + timestamp + role + mode)
        .digest('hex')
        .substring(0, 8);
      const logEntry = JSON.stringify({
        timestamp,
        role,
        mode,
        briefing,
        translated,
        id: hash,
      }) + '
';
      await fs.appendFile(logPath, logEntry, 'utf8');
      // Optional: retain only last 500 entries
      const data = await fs.readFile(logPath, 'utf8');
      const lines = data.trim().split('
').filter(Boolean);
      if (lines.length > 500) {
        const trimmed = lines.slice(-500).join('
') + '
';
        await fs.writeFile(logPath, trimmed, 'utf8');
      }
    } catch (logErr) {
      console.warn('[BEACON AI] Failed to log briefing:', logErr);
    }
        role,
        mode,
        briefing,
        translated,
    console.log('[BEACON AI] Briefing generated, length:', briefing.length);
    // Log briefing for backlog/trend tracking
    try {
      const logDir = path.join('/var/log', 'beacon_briefs');
      await fs.mkdir(logDir, { recursive: true });
      const logPath = path.join(logDir, 'briefs.log');
      const timestamp = new Date().toISOString();
      const hash = createHash('sha256')
        .update(briefing + timestamp + role + mode)
        .digest('hex')
        .substring(0, 8);
      const logEntry = JSON.stringify({
        timestamp,
        role,
        mode,
        briefing,
        translated,
        id: hash,
      }) + '
';
      await fs.appendFile(logPath, logEntry, 'utf8');
      // Optional: retain only last 500 entries
      const data = await fs.readFile(logPath, 'utf8');
      const lines = data.trim().split('
').filter(Boolean);
      if (lines.length > 500) {
        const trimmed = lines.slice(-500).join('
') + '
';
        await fs.writeFile(logPath, trimmed, 'utf8');
      }
    } catch (logErr) {
      console.warn('[BEACON AI] Failed to log briefing:', logErr);
    }
      console.warn('[BEACON AI] Failed to log briefing:', logErr);
    }

    return NextResponse.json(
      {
        briefing,
        generatedAt: new Date().toISOString(),
        roleUsed: role,
        translated,
        modeUsed: mode,
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
    if (message.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json(
        {
          error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
          code: 'NO_OPENROUTER_KEY',
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