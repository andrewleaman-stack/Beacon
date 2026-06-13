export function normalizeOpenSkyState(state: any[], fallbackTime?: number): any;
export function buildOpenSkyStatesUrl(region?: { lamin?: number; lomin?: number; lamax?: number; lomax?: number }): string;
export function fetchOpenSkyToken(options?: { clientId?: string; clientSecret?: string; fetchImpl?: typeof fetch }): Promise<string>;
export function fetchOpenSkyRegion(options?: { region?: any; token?: string; fetchImpl?: typeof fetch }): Promise<any[]>;
export function fetchOpenSkyFlights(options?: { clientId?: string; clientSecret?: string; regions?: any[]; fetchImpl?: typeof fetch }): Promise<{ flights: any[]; sourceStatus: any[]; authenticated: boolean }>;
