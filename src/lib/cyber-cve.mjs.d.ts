export function normalizeKevCatalog(payload: any): any[];
export function normalizeOsvVulnerability(item: any): any;
export function mergeCves(items: any[]): any[];
export function sortCvesByPriority(items: any[]): any[];
export function fetchKevCatalog(fetchImpl?: typeof fetch): Promise<any[]>;
export function fetchOsvByIds(ids: string[], fetchImpl?: typeof fetch): Promise<any[]>;
export function fetchCyberCveFeed(options?: { fetchImpl?: typeof fetch }): Promise<{ cves: any[]; sourceStatus: any[] }>;
