export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number;
export function contactsNear(center: { lat: number; lng: number }, groups: Record<string, any[]>, options?: { radiusKm?: number; limit?: number; excludeId?: string | number | null }): { kind: string; id: string; km: number; item: any }[];
export function nearest(center: { lat: number; lng: number }, items: any[]): { km: number; item: any } | null;
export function appendTrail(trail: [number, number][], point: { lat: number; lng: number }, options?: { minMoveKm?: number; max?: number }): [number, number][];
