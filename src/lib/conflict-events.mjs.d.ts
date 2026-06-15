export interface ConflictEvent {
  id: string;
  source: 'UCDP GED' | 'ACLED' | string;
  eventType: string;
  subType: string;
  title: string;
  summary: string;
  actor1: string;
  actor2: string;
  country: string;
  region: string;
  location: string;
  lat: number;
  lng: number;
  fatalities: number;
  severity: 'low' | 'elevated' | 'high' | 'critical';
  date: string | null;
  url: string;
  fetchedAt: string;
}

export function severityForFatalities(fatalities: unknown): ConflictEvent['severity'];
export function normalizeUcdpEvent(raw: Record<string, unknown>, now?: Date): ConflictEvent;
export function normalizeAcledEvent(raw: Record<string, unknown>, now?: Date): ConflictEvent;

export function fetchUcdpEvents(opts?: {
  token?: string;
  version?: string;
  pageSize?: number;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<ConflictEvent[]>;

export function fetchAcledEvents(opts?: {
  key?: string;
  email?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<ConflictEvent[]>;

export function fetchConflictEvents(opts?: {
  limit?: number;
  fetchImpl?: typeof fetch;
  now?: Date;
  ucdp?: { token?: string; version?: string; pageSize?: number };
  acled?: { key?: string; email?: string; limit?: number };
}): Promise<{
  events: ConflictEvent[];
  sources: string[];
  configured: { ucdp: boolean; acled: boolean };
  errors: string[];
}>;
