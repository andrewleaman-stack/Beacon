import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(parseInt(limitParam, 10), 500)) : 50;
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

    const logDir = path.join('/var/log', 'beacon_briefs');
    const logPath = path.join(logDir, 'briefs.log');

    let fileContent = '';
    try {
      fileContent = await fs.readFile(logPath, 'utf8');
    } catch (err) {
      // If file does not exist, return empty list
      return NextResponse.json([]);
    }

    const lines = fileContent.trim().split('\n').filter(Boolean);
    // Parse each line as JSON
    const entries = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      // Most recent first (assuming log is appended chronologically)
      .reverse()
      .slice(offset, offset + limit);

    return NextResponse.json(entries);
  } catch (err) {
    console.error('[BEACON AI] Error retrieving briefing log:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve briefing log' },
      { status: 500 }
    );
  }
}