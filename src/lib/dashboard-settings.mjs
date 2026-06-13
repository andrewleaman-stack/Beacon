export const DASHBOARD_VIEW_PRESETS = Object.freeze([
  { id: 'compact', label: 'COMPACT', fontScale: 0.95, iconScale: 0.9, density: 'compact' },
  { id: 'standard', label: 'STANDARD', fontScale: 1, iconScale: 1, density: 'standard' },
  { id: 'readable', label: 'READABLE', fontScale: 1.15, iconScale: 1.12, density: 'comfortable' },
]);

export const DEFAULT_DASHBOARD_VIEW_SETTINGS = Object.freeze({
  fontScale: 1,
  iconScale: 1,
  density: 'standard',
});

export const DEFAULT_HOME_LOCATION = Object.freeze({
  label: 'Global Overview',
  lat: 20,
  lng: 0,
  zoom: 2.5,
});

export const HOME_LOCATION_PRESETS = Object.freeze([
  DEFAULT_HOME_LOCATION,
  { label: 'North America', lat: 39.5, lng: -98.35, zoom: 3.5 },
  { label: 'Europe', lat: 48.8, lng: 12.5, zoom: 4 },
  { label: 'Middle East', lat: 29.5, lng: 44.0, zoom: 4 },
  { label: 'Indo-Pacific', lat: 15.0, lng: 120.0, zoom: 3.6 },
  { label: 'Monroe / SE Michigan', lat: 41.9164, lng: -83.3977, zoom: 8.5 },
  { label: 'User Home', lat: 41.9164, lng: -83.3977, zoom: 8.5 },
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finiteNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function normalizeDashboardViewSettings(settings = {}) {
  return {
    fontScale: Number(clamp(finiteNumber(settings.fontScale, DEFAULT_DASHBOARD_VIEW_SETTINGS.fontScale), 0.9, 1.3).toFixed(2)),
    iconScale: Number(clamp(finiteNumber(settings.iconScale, DEFAULT_DASHBOARD_VIEW_SETTINGS.iconScale), 0.8, 1.4).toFixed(2)),
    density: ['compact', 'standard', 'comfortable'].includes(settings.density)
      ? settings.density
      : DEFAULT_DASHBOARD_VIEW_SETTINGS.density,
  };
}

export function normalizeHomeLocation(location = {}) {
  const lat = clamp(finiteNumber(location.lat, DEFAULT_HOME_LOCATION.lat), -85, 85);
  const lng = clamp(finiteNumber(location.lng, DEFAULT_HOME_LOCATION.lng), -180, 180);
  const zoom = clamp(finiteNumber(location.zoom, DEFAULT_HOME_LOCATION.zoom), 1.5, 14);
  const label = typeof location.label === 'string' && location.label.trim()
    ? location.label.trim().slice(0, 48)
    : DEFAULT_HOME_LOCATION.label;

  return {
    label,
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    zoom: Number(zoom.toFixed(2)),
  };
}

export function getDashboardViewPresetId(settings = {}) {
  const normalized = normalizeDashboardViewSettings(settings);
  return DASHBOARD_VIEW_PRESETS.find((preset) => (
    preset.fontScale === normalized.fontScale &&
    preset.iconScale === normalized.iconScale &&
    preset.density === normalized.density
  ))?.id || 'custom';
}
