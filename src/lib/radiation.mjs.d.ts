export interface RadiationStation {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  reading: number | null;
  cpm: number;
  tube: string;
  unit: 'nSv/h';
  status: 'NORMAL' | 'WARNING' | 'DANGER';
  network: string;
  capturedAt: string | null;
  fetchedAt: string;
}

export function cpmToNanoSievert(cpm: number, factor: number): number | null;
export function statusForNanoSievert(nSvh: number | null): RadiationStation['status'];
export function normalizeSafecastDevice(device: Record<string, unknown>, now?: Date): RadiationStation | null;
export function parseSafecastDevices(devices: unknown, opts?: { limit?: number; now?: Date }): RadiationStation[];
export function fetchRadiationStations(opts?: {
  url?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<RadiationStation[]>;
