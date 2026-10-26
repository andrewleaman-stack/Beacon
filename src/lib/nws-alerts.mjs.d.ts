export type NwsSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
export const NWS_SEVERITY_COLORS: Record<NwsSeverity, string>;
export interface NwsAlert {
  id: string;
  event: string;
  headline: string;
  severity: NwsSeverity;
  rank: number;
  color: string;
  urgency: string;
  certainty: string;
  area: string;
  sender: string;
  onset: string | null;
  ends: string | null;
  sent: string | null;
  url: string;
  instruction: string;
  areaSource: 'alert' | 'zones' | null;
  /** The alert's own polygon; null when its area is made of zones. */
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any } | null;
  /** Zone ids making up the area when there is no own polygon. */
  zones: string[];
}
export interface ZoneCache {
  get(url: string): any;
  has(url: string): boolean;
  readonly size: number;
  readonly pending: number;
  ensure(urls: string[], deadlineMs: number): Promise<void>;
}
export function douglasPeucker(points: number[][], tolerance: number): number[][];
export function simplifyGeometry(geometry: any, tolerance?: number): any;
export function zoneId(url: string): string;
export function alertArea(alert: { geometry: any; zones?: string[] }, zones: Record<string, any>): any;
export function mergePolygons(geometries: any[]): any;
export function createZoneCache(options?: { fetchImpl?: typeof fetch; limit?: number; concurrency?: number }): ZoneCache;
export function normalizeAlert(feature: any, zoneCache?: ZoneCache | null): NwsAlert;
export function fetchNwsAlerts(options?: { fetchImpl?: typeof fetch; zoneCache?: ZoneCache; zoneDeadlineMs?: number }): Promise<{ alerts: NwsAlert[]; zones: Record<string, any> }>;
