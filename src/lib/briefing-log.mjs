/**
 * Shared persistence for the AI briefing backlog.
 *
 * One source of truth for where briefings are logged, what shape each record
 * has, how a stable id is derived, and how many are retained. Both the writer
 * (POST /api/ai/briefing) and the reader (GET /api/ai/briefings) import this so
 * the two can never drift apart again — previously they used different
 * directories, so the retrieval endpoint always returned nothing.
 *
 * Storage is newline-delimited JSON. The directory defaults to a writable temp
 * path; set BEACON_BRIEF_LOG_DIR to a mounted volume for cross-restart
 * persistence. Retention caps the file to the most recent N records.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export const DEFAULT_BRIEF_LOG_DIR = process.env.BEACON_BRIEF_LOG_DIR || '/tmp/beacon_briefs';
export const BRIEF_LOG_FILENAME = 'briefs.log';
export const BRIEF_RETENTION = Number(process.env.BEACON_BRIEF_RETENTION) || 500;

function logFilePath(dir) {
  return path.join(dir || DEFAULT_BRIEF_LOG_DIR, BRIEF_LOG_FILENAME);
}

/** Stable 8-char id for a briefing, derived from its content + metadata. */
export function briefingId({ briefing = '', timestamp = '', role = '', mode = '' }) {
  return createHash('sha256').update(`${briefing}${timestamp}${role}${mode}`).digest('hex').slice(0, 8);
}

async function enforceRetention(file, retention) {
  if (!retention || retention <= 0) return;
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch {
    return;
  }
  const lines = content.split('\n').filter(Boolean);
  if (lines.length <= retention) return;
  await fs.writeFile(file, lines.slice(-retention).join('\n') + '\n', 'utf8');
}

/**
 * Append one briefing to the log and trim to the retention limit.
 * Returns the stored record (including its derived id). Never throws on a
 * logging failure path the caller can't recover from — callers should still
 * wrap this in try/catch so a logging hiccup never breaks the briefing itself.
 */
export async function appendBriefing(entry, { dir = DEFAULT_BRIEF_LOG_DIR, retention = BRIEF_RETENTION } = {}) {
  const timestamp = entry.timestamp || new Date().toISOString();
  const record = {
    id: briefingId({ briefing: entry.briefing ?? '', timestamp, role: entry.role ?? '', mode: entry.mode ?? '' }),
    timestamp,
    role: entry.role,
    mode: entry.mode,
    briefing: entry.briefing,
    translated: Boolean(entry.translated),
  };
  await fs.mkdir(dir, { recursive: true });
  const file = logFilePath(dir);
  await fs.appendFile(file, JSON.stringify(record) + '\n', 'utf8');
  await enforceRetention(file, retention);
  return record;
}

/** Read briefings newest-first, with paging. Returns [] if nothing logged yet. */
export async function readBriefings({ limit = 50, offset = 0, dir = DEFAULT_BRIEF_LOG_DIR } = {}) {
  const file = logFilePath(dir);
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch {
    return [];
  }
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((record) => record !== null)
    .reverse()
    .slice(offset, offset + limit);
}
