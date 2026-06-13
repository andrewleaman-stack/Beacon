export function normalizeNrcEvent(event: any, now?: Date): any;
export function parseNrcEventsJsonl(jsonlText: string, options?: { limit?: number; now?: Date }): any[];
export function fetchNrcEvents(options?: { year?: number; limit?: number; fetchImpl?: typeof fetch; now?: Date }): Promise<any[]>;
