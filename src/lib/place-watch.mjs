/**
 * "My places" watch: what is happening at and around a saved location.
 *   - NWS active alerts for the exact point (US only)
 *   - current conditions from Open-Meteo
 *   - anything from BEACON's own feeds within the place's radius
 */
import { distanceKm } from './geo-nearby.mjs';

const WMO = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers',
  82: 'Violent rain showers', 85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
  96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail',
};

export function parseNwsAlerts(geojson) {
  return (geojson?.features || []).map((f) => {
    const p = f?.properties || {};
    return {
      id: p.id || f.id || '',
      event: p.event || 'Alert',
      severity: p.severity || 'Unknown', // Extreme | Severe | Moderate | Minor | Unknown
      urgency: p.urgency || '',
      headline: p.headline || p.event || '',
      expires: p.expires || p.ends || null,
      url: typeof p['@id'] === 'string' ? p['@id'] : null,
    };
  });
}

export function parseCurrentWeather(payload) {
  const c = payload?.current;
  if (!c) return null;
  return {
    tempF: c.temperature_2m ?? null,
    feelsLikeF: c.apparent_temperature ?? null,
    windMph: c.wind_speed_10m ?? null,
    gustMph: c.wind_gusts_10m ?? null,
    precipMm: c.precipitation ?? null,
    conditions: WMO[c.weather_code] || 'Unknown',
    weatherCode: c.weather_code ?? null,
    isDay: c.is_day === 1,
    timezone: payload.timezone || null,
    observedAt: c.time || null,
  };
}

function within(center, items, radiusKm) {
  return (items || [])
    .filter((i) => Number.isFinite(Number(i?.lat)) && Number.isFinite(Number(i?.lng)))
    .map((i) => ({ ...i, km: distanceKm(center, { lat: Number(i.lat), lng: Number(i.lng) }) }))
    .filter((i) => i.km <= radiusKm)
    .sort((a, b) => a.km - b.km);
}

/**
 * Filter BEACON feed payloads to a place. `feeds` holds the raw arrays:
 * { earthquakes, fires, incidents, wikiSurges, outages }.
 */
export function nearbyFromFeeds(center, radiusKm, feeds = {}) {
  const quakes = within(center, feeds.earthquakes, radiusKm)
    .map((q) => ({ place: q.place || q.title || 'Earthquake', magnitude: Number(q.magnitude ?? q.mag), km: q.km, time: q.time || null }));
  const fires = within(center, feeds.fires, radiusKm);
  const incidents = within(center, feeds.incidents, radiusKm).map((e) => ({ name: e.name, km: e.km, url: e.url || '' }));
  const wikiSurges = within(center, feeds.wikiSurges, radiusKm).map((w) => ({ title: w.article || w.title, km: w.km, url: w.url || '' }));
  // Utility outage feeds are service-territory summaries, so match on a wider 150 km.
  const outages = within(center, feeds.outages, Math.max(radiusKm, 150))
    .filter((o) => Number(o.customersAffected) > 0)
    .map((o) => ({ provider: o.provider, customersAffected: Number(o.customersAffected), region: o.region || '' }));
  return {
    earthquakes: quakes.slice(0, 5),
    fireCount: fires.length,
    nearestFireKm: fires[0]?.km ?? null,
    incidents: incidents.slice(0, 5),
    wikiSurges: wikiSurges.slice(0, 3),
    outages,
  };
}

const RANK = { clear: 0, watch: 1, advisory: 2, warning: 3 };

/**
 * One overall status for the place, with the reasons behind it.
 * @param {{ alerts?: any[], nearby?: any }} [input]
 */
export function placeStatus({ alerts = [], nearby = null } = {}) {
  let level = 'clear';
  const reasons = [];
  const raise = (to, reason) => {
    if (RANK[to] > RANK[level]) level = to;
    reasons.push(reason);
  };
  for (const a of alerts) {
    if (a.severity === 'Extreme' || a.severity === 'Severe') raise('warning', a.event);
    else if (a.severity === 'Moderate') raise('advisory', a.event);
    else raise('watch', a.event);
  }
  if (nearby) {
    const bigQuake = nearby.earthquakes.find((q) => q.magnitude >= 4.5);
    if (bigQuake) raise('advisory', `M${bigQuake.magnitude.toFixed(1)} earthquake ${Math.round(bigQuake.km)} km away`);
    else if (nearby.earthquakes.length) raise('watch', `${nearby.earthquakes.length} earthquake(s) nearby`);
    if (nearby.nearestFireKm != null) raise(nearby.nearestFireKm <= 10 ? 'advisory' : 'watch', `${nearby.fireCount} fire detection(s), nearest ${Math.round(nearby.nearestFireKm)} km`);
    if (nearby.incidents.length) raise('watch', `${nearby.incidents.length} reported incident(s) nearby`);
    if (nearby.wikiSurges.length) raise('watch', 'Wikipedia edit surge nearby');
    for (const o of nearby.outages) {
      if (o.customersAffected >= 5000) raise('advisory', `${o.customersAffected.toLocaleString('en-US')} ${o.provider} customers without power`);
      else if (o.customersAffected >= 500) raise('watch', `${o.customersAffected.toLocaleString('en-US')} ${o.provider} customers without power`);
    }
  }
  return { level, reasons };
}
