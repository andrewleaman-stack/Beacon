export interface WorldBankIndicator { key: string; label: string; unit: 'usd' | 'pct' | 'years' | 'count' | 'km2'; value: number; year: number; summary: boolean }
export interface WorldBankCountry { name: string; iso2: string; iso3: string; capital: string | null; region: string | null; incomeLevel: string | null }
export interface LocalSun { timezone: string; timezoneAbbreviation: string; utcOffsetSeconds: number; isDay: boolean; sunrise: string | null; sunset: string | null }
export const WORLD_BANK_INDICATORS: { id: string; key: string; label: string; unit: string; summary?: boolean }[];
export function parseWorldBankIndicators(payload: unknown): WorldBankIndicator[];
export function fetchWorldBankIndicators(iso2: string, options?: { fetchImpl?: typeof fetch }): Promise<WorldBankIndicator[]>;
export function parseLocalSun(payload: unknown): LocalSun | null;
export function fetchLocalSun(lat: number, lng: number, options?: { fetchImpl?: typeof fetch }): Promise<LocalSun | null>;
export function flagEmoji(iso2: string): string;
export function parseWorldBankCountry(payload: unknown): WorldBankCountry | null;
export function fetchWorldBankCountry(iso2: string, options?: { fetchImpl?: typeof fetch }): Promise<WorldBankCountry | null>;
