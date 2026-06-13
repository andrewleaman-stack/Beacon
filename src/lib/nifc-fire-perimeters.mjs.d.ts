export function buildNifcQueryUrl(options?: { limit?: number }): string;
export function normalizeNifcFeature(feature: any): any | null;
export function fetchNifcFirePerimeters(options?: { limit?: number; fetchImpl?: typeof fetch }): Promise<any[]>;
