export interface PortDisruption {
  id: string;
  portId: string;
  portName: string;
  country: string;
  lat: number;
  lng: number;
  eventId: string;
  eventName: string;
  fromDate: string | null;
  toDate: string | null;
  active: boolean;
  status: 'ACTIVE' | 'PAST';
  distanceKm: number | null;
  source: 'IMF PortWatch';
  fetchedAt: string;
}

export function normalizePortDisruption(attributes: Record<string, unknown>, now?: Date): PortDisruption | null;
export function parsePortWatchFeatures(payload: unknown, opts?: { limit?: number; now?: Date }): PortDisruption[];
export function fetchPortDisruptions(opts?: {
  url?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<PortDisruption[]>;
