/**
 * Extra context for the right-click region dossier:
 *   - local time zone, sunrise and sunset (Open-Meteo, CC BY 4.0, no key)
 *   - headline development indicators (World Bank Indicators API, CC BY 4.0, no key)
 */

export const WORLD_BANK_INDICATORS = [
  { id: 'SP.POP.TOTL', key: 'population', label: 'Population', unit: 'count', summary: true },
  { id: 'AG.SRF.TOTL.K2', key: 'area', label: 'Area', unit: 'km2', summary: true },
  { id: 'NY.GDP.PCAP.CD', key: 'gdpPerCapita', label: 'GDP per capita', unit: 'usd' },
  { id: 'NY.GDP.MKTP.KD.ZG', key: 'gdpGrowth', label: 'GDP growth', unit: 'pct' },
  { id: 'FP.CPI.TOTL.ZG', key: 'inflation', label: 'Inflation', unit: 'pct' },
  { id: 'SL.UEM.TOTL.ZS', key: 'unemployment', label: 'Unemployment', unit: 'pct' },
  { id: 'SI.POV.DDAY', key: 'extremePoverty', label: 'Extreme poverty', unit: 'pct' },
  { id: 'SP.DYN.LE00.IN', key: 'lifeExpectancy', label: 'Life expectancy', unit: 'years' },
  { id: 'EG.ELC.ACCS.ZS', key: 'electricityAccess', label: 'Electricity access', unit: 'pct' },
  { id: 'IT.NET.USER.ZS', key: 'internetUsers', label: 'Internet users', unit: 'pct' },
];

const UA = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' };

/** Normalize a World Bank multi-indicator response into labelled latest values. */
export function parseWorldBankIndicators(payload) {
  const rows = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1] : [];
  const byId = new Map(rows.filter((r) => r && r.value !== null && r.value !== undefined).map((r) => [r.indicator?.id, r]));
  return WORLD_BANK_INDICATORS
    .filter((ind) => byId.has(ind.id))
    .map((ind) => {
      const row = byId.get(ind.id);
      return { key: ind.key, label: ind.label, unit: ind.unit, value: Number(row.value), year: Number(row.date), summary: !!ind.summary };
    });
}

export async function fetchWorldBankIndicators(iso2, { fetchImpl = fetch } = {}) {
  if (!/^[A-Za-z]{2}$/.test(String(iso2 || ''))) return [];
  const ids = WORLD_BANK_INDICATORS.map((i) => i.id).join(';');
  const url = `https://api.worldbank.org/v2/country/${iso2.toUpperCase()}/indicator/${ids}?source=2&format=json&mrnev=1&per_page=50`;
  const res = await fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`World Bank returned HTTP ${res.status}`);
  return parseWorldBankIndicators(await res.json());
}

/** Normalize an Open-Meteo forecast response into sun and time-zone facts. */
export function parseLocalSun(payload) {
  if (!payload || typeof payload !== 'object' || !payload.timezone) return null;
  return {
    timezone: payload.timezone,
    timezoneAbbreviation: payload.timezone_abbreviation || '',
    utcOffsetSeconds: Number(payload.utc_offset_seconds) || 0,
    isDay: payload.current?.is_day === 1,
    // Local wall-clock times, e.g. "2026-10-01T06:57".
    sunrise: payload.daily?.sunrise?.[0] || null,
    sunset: payload.daily?.sunset?.[0] || null,
  };
}

export async function fetchLocalSun(lat, lng, { fetchImpl = fetch } = {}) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&daily=sunrise,sunset&current=is_day&timezone=auto&forecast_days=1`;
  const res = await fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo returned HTTP ${res.status}`);
  return parseLocalSun(await res.json());
}

/** Emoji flag from an ISO 3166-1 alpha-2 code ("PE" -> 🇵🇪). */
export function flagEmoji(iso2) {
  if (!/^[A-Za-z]{2}$/.test(String(iso2 || ''))) return '';
  return String.fromCodePoint(...iso2.toUpperCase().split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Normalize World Bank country metadata (name, capital, region, income level). */
export function parseWorldBankCountry(payload) {
  const row = Array.isArray(payload) && Array.isArray(payload[1]) ? payload[1][0] : null;
  if (!row || !row.name) return null;
  const clean = (v) => String(v || '').trim();
  return {
    name: clean(row.name),
    iso2: clean(row.iso2Code),
    iso3: clean(row.id),
    capital: clean(row.capitalCity) || null,
    region: clean(row.region?.value) || null,
    incomeLevel: clean(row.incomeLevel?.value) || null,
  };
}

export async function fetchWorldBankCountry(iso2, { fetchImpl = fetch } = {}) {
  if (!/^[A-Za-z]{2}$/.test(String(iso2 || ''))) return null;
  const res = await fetchImpl(`https://api.worldbank.org/v2/country/${iso2.toUpperCase()}?format=json`, { headers: UA, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`World Bank returned HTTP ${res.status}`);
  return parseWorldBankCountry(await res.json());
}
