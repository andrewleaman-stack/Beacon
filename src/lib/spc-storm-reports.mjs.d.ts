export function normalizeSpcStormReport(options: { type: string; row: Record<string, string>; day?: string; now?: Date }): any | null;
export function parseSpcStormReportsCsv(csvText: string, day?: string, now?: Date): any[];
export function fetchSpcStormReports(options?: { days?: string[]; fetchImpl?: typeof fetch; now?: Date }): Promise<{ reports: any[]; sourceStatus: any[] }>;
