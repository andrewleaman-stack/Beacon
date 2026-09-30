export function normalizeLaunch(row: any): any | null;
export function groupByPad(launches: any[]): any[];
export function fetchLaunches(options?: { now?: Date; fetchImpl?: typeof fetch }): Promise<any[]>;
