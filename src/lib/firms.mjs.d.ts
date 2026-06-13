export function getFirmsSources(): string[];
export function parseCsv(csvText: string): Record<string, string>[];
export function parseFirmsCsv(csvText: string, source: string): any[];
export function normalizeFirmsRecord(row: Record<string, unknown>, source: string): any;
export function buildFirmsTimestamp(acqDate: string, acqTime: string): string | null;
export function fetchFirmsSource(options: { mapKey: string; source: string; area?: string; days?: number; fetchImpl?: typeof fetch }): Promise<any[]>;
export function fetchFirmsFeeds(options?: { mapKey?: string; sources?: string[]; area?: string; days?: number; fetchImpl?: typeof fetch }): Promise<{ fires: any[]; sourceStatus: any[] }>;
