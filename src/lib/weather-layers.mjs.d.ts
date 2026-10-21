export interface RadarFrame { time: string; tiles: string[] }
export interface RadarFrames extends RadarFrame { maxzoom: number; frames: RadarFrame[] }
export interface WindPoint { lat: number; lng: number; speedKn: number; directionFrom: number; observedAt: string | null }
export function parseRainviewerFrames(payload: unknown): RadarFrames | null;
export function fetchRainviewerFrame(options?: { fetchImpl?: typeof fetch }): Promise<RadarFrames>;
export function parseWmsLayerTimes(xml: string, layerName: string, from: number, to: number): number[];
export function lightningTiles(now?: Date, time?: string | null): string[];
export function fetchLightningTimes(options: { fetchImpl?: typeof fetch; from: number; to: number }): Promise<number[]>;
export const METEOSAT_LAYER: { id: string; layer: string; maxzoom: number; bounds: [number, number, number, number] };
export const METEOSAT_ATTRIBUTION: string;
export function meteosatTiles(time?: string | null): string[];
export function fetchMeteosatTimes(options: { fetchImpl?: typeof fetch; from: number; to: number }): Promise<number[]>;
export const FOREST_ALERT_TILES: string[];
export function windGridPoints(step?: number): { lat: number; lng: number }[];
export function parseWindGrid(payload: unknown, points: { lat: number; lng: number }[]): WindPoint[];
export function fetchWindGrid(options?: { fetchImpl?: typeof fetch; step?: number }): Promise<WindPoint[]>;
