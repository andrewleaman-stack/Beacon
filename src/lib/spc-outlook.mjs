/**
 * NOAA Storm Prediction Center convective outlooks, days 1-3 (categorical
 * risk: thunderstorms, marginal, slight, enhanced, moderate, high). Each area
 * carries the period it is valid for, so the map timeline shows the outlook
 * that covers the chosen time. U.S. government product, public domain.
 */

import { simplifyGeometry } from './nws-alerts.mjs';

const SPC = 'https://www.spc.noaa.gov/products/outlook';
const UA = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' };

export const SPC_DAYS = [1, 2, 3];

/** SPC's own risk colours, used when a feature lacks them. */
const RISK_COLORS = {
  TSTM: { fill: '#C1E9C1', stroke: '#55BB55' },
  MRGL: { fill: '#66A366', stroke: '#005500' },
  SLGT: { fill: '#FFE066', stroke: '#DDAA00' },
  ENH: { fill: '#FFA366', stroke: '#FF6600' },
  MDT: { fill: '#E06666', stroke: '#CC0000' },
  HIGH: { fill: '#EE99EE', stroke: '#CC00CC' },
};

export function outlookUrl(day) {
  return `${SPC}/day${day}otlk_cat.lyr.geojson`;
}

/** One day's GeoJSON → map features, lowest risk first so higher risks draw on top. */
export function parseOutlook(payload, day) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return features
    .map((f) => {
      const p = f?.properties || {};
      const geometry = simplifyGeometry(f?.geometry);
      const label = String(p.LABEL || '');
      if (!geometry || !p.VALID_ISO || !p.EXPIRE_ISO) return null;
      const colors = RISK_COLORS[label] || { fill: '#90A4AE', stroke: '#607D8B' };
      return {
        type: 'Feature',
        geometry,
        properties: {
          day,
          risk: Number(p.DN) || 0,
          label,
          name: String(p.LABEL2 || label),
          valid: new Date(p.VALID_ISO).toISOString(),
          expire: new Date(p.EXPIRE_ISO).toISOString(),
          issued: p.ISSUE_ISO ? new Date(p.ISSUE_ISO).toISOString() : null,
          forecaster: String(p.FORECASTER || ''),
          fill: /^#[0-9a-f]{6}$/i.test(p.fill) ? p.fill : colors.fill,
          stroke: /^#[0-9a-f]{6}$/i.test(p.stroke) ? p.stroke : colors.stroke,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.properties.risk - b.properties.risk);
}

/** All three days; a day that fails to load is skipped and reported. */
export async function fetchOutlooks({ fetchImpl = fetch } = {}) {
  const errors = [];
  const days = await Promise.all(SPC_DAYS.map(async (day) => {
    try {
      const res = await fetchImpl(outlookUrl(day), { headers: UA, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseOutlook(await res.json(), day);
    } catch (error) {
      errors.push(`day ${day}: ${error?.message || error}`);
      return [];
    }
  }));
  if (errors.length === SPC_DAYS.length) throw new Error(`SPC outlooks unavailable (${errors.join('; ')})`);
  return { features: days.flat(), errors };
}
