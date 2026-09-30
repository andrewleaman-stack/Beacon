export function parseNwsAlerts(geojson: unknown): { id: string; event: string; severity: string; urgency: string; headline: string; expires: string | null; url: string | null }[];
export function parseCurrentWeather(payload: unknown): any | null;
export function nearbyFromFeeds(center: { lat: number; lng: number }, radiusKm: number, feeds?: Record<string, any[]>): any;
export function placeStatus(input?: { alerts?: any[]; nearby?: any }): { level: 'clear' | 'watch' | 'advisory' | 'warning'; reasons: string[] };
