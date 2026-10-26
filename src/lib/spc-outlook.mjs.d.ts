export interface OutlookFeature {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
  properties: {
    day: number;
    risk: number;
    label: string;
    name: string;
    valid: string;
    expire: string;
    issued: string | null;
    forecaster: string;
    fill: string;
    stroke: string;
  };
}
export const SPC_DAYS: number[];
export function outlookUrl(day: number): string;
export function parseOutlook(payload: unknown, day: number): OutlookFeature[];
export function fetchOutlooks(options?: { fetchImpl?: typeof fetch }): Promise<{ features: OutlookFeature[]; errors: string[] }>;
