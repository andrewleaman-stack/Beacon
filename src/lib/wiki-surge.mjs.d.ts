export const WATCHED_WIKIS: Set<string>;
export const DEFAULTS: Record<string, number>;
export class SurgeTracker {
  constructor(options?: Record<string, unknown>);
  pages: Map<string, any>;
  opts: typeof DEFAULTS;
  ingest(event: any): boolean;
  sweep(force: boolean): void;
  surges(): any[];
}
export function classifyArticle(surge: any, info: any): { keep: boolean; reason: string };
export function severityForSurge(surge: any): 'elevated' | 'high';
export function parseSseChunk(buffer: string): { events: string[]; rest: string };
