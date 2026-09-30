export interface LiveCloudLayer { id: string; layer: string; matrix: string; maxzoom: number; bounds?: [number, number, number, number] }
export function gibsDate(now?: Date, daysBack?: number): string;
export function refreshToken(now?: Date, minutes?: number): string;
export function trueColorTiles(now?: Date): string[];
export const LIVE_CLOUD_LAYERS: LiveCloudLayer[];
export function liveCloudTiles(layerDef: LiveCloudLayer, now?: Date): string[];
export const GIBS_ATTRIBUTION: string;
