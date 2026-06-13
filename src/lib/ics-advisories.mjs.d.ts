export function normalizeCisaIcsAdvisory(item: any, now?: Date): any;
export function parseCisaIcsAdvisoriesXml(xmlText: string, now?: Date): any[];
export function fetchCisaIcsAdvisories(options?: { limit?: number; fetchImpl?: typeof fetch; now?: Date }): Promise<any[]>;
