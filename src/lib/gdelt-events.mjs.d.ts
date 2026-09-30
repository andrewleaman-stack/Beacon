export function unzipFirstEntry(buffer: ArrayBuffer | Uint8Array): Buffer;
export function parseGdeltExport(csvText: string, options?: { now?: Date; maxAgeDays?: number }): any[];
export function exportUrlsFrom(lastUpdateText: string, count?: number): string[];
export function fetchGdeltEvents(options?: { intervals?: number; limit?: number; fetchImpl?: typeof fetch; now?: Date }): Promise<{ events: any[]; intervalsFetched: number; intervalsFailed: number }>;
