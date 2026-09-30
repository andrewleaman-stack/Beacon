export interface RadarFrame { time: string; tiles: string[]; maxzoom: number }
export interface WindPoint { lat: number; lng: number; speedKn: number; directionFrom: number; observedAt: string | null }
export function parseRainviewerFrames(payload: unknown): RadarFrame | null;
export function fetchRainviewerFrame(options?: { fetchImpl?: typeof fetch }): Promise<RadarFrame>;
export function lightningTiles(now?: Date): string[];
export const FOREST_ALERT_TILES: string[];
export function windGridPoints(step?: number): { lat: number; lng: number }[];
export function parseWindGrid(payload: unknown, points: { lat: number; lng: number }[]): WindPoint[];
export function fetchWindGrid(options?: { fetchImpl?: typeof fetch; step?: number }): Promise<WindPoint[]>;
