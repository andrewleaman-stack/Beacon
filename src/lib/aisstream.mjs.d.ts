export const DEFAULT_AIS_BOUNDING_BOXES: number[][][];
export function parseAisBoundingBoxes(value?: string): number[][][];
export function shipTypeFromCode(typeCode: unknown): string;
export function normalizeAisStreamMessage(parsed: any, existing?: any): any | null;
export function buildAisSubscription(options?: { apiKey?: string; boundingBoxes?: number[][][] }): any;
