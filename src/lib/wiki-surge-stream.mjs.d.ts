export function ensureWikiSurgeStream(): void;
export function getWikiSurges(options?: { limit?: number }): Promise<{ surges: any[]; stream: { startedAt: string | null; connectedAt: string | null; lastEventAt: string | null; trackedArticles: number; reconnects: number; lastError: string | null; warmingUp: boolean } }>;
