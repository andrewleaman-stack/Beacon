export interface BriefingRecord {
  id: string;
  timestamp: string;
  role?: string;
  mode?: string;
  briefing: string;
  translated: boolean;
}

export interface BriefingInput {
  briefing: string;
  role?: string;
  mode?: string;
  translated?: boolean;
  timestamp?: string;
}

export const DEFAULT_BRIEF_LOG_DIR: string;
export const BRIEF_LOG_FILENAME: string;
export const BRIEF_RETENTION: number;

export function briefingId(input: {
  briefing?: string;
  timestamp?: string;
  role?: string;
  mode?: string;
}): string;

export function appendBriefing(
  entry: BriefingInput,
  opts?: { dir?: string; retention?: number }
): Promise<BriefingRecord>;

export function readBriefings(
  opts?: { limit?: number; offset?: number; dir?: string }
): Promise<BriefingRecord[]>;
