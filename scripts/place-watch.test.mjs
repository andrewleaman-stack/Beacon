#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNwsAlerts, parseCurrentWeather, nearbyFromFeeds, placeStatus } from '../src/lib/place-watch.mjs';

const MONROE = { lat: 41.9164, lng: -83.3977 };

test('parseNwsAlerts keeps event, severity and headline', () => {
  const alerts = parseNwsAlerts({ features: [{ properties: { id: 'x', event: 'Tornado Warning', severity: 'Extreme', headline: 'Tornado Warning for Monroe County', expires: '2026-10-01T00:00:00Z' } }] });
  assert.equal(alerts[0].event, 'Tornado Warning');
  assert.equal(alerts[0].severity, 'Extreme');
  assert.deepEqual(parseNwsAlerts(null), []);
});

test('parseCurrentWeather maps WMO codes to words', () => {
  const w = parseCurrentWeather({ timezone: 'America/Detroit', current: { temperature_2m: 66.7, weather_code: 95, is_day: 1, wind_speed_10m: 9 } });
  assert.equal(w.conditions, 'Thunderstorm');
  assert.equal(w.tempF, 66.7);
  assert.equal(parseCurrentWeather({}), null);
});

test('nearbyFromFeeds keeps only items inside the radius, nearest first', () => {
  const n = nearbyFromFeeds(MONROE, 50, {
    earthquakes: [{ place: 'far', magnitude: 3, lat: 35, lng: -90 }, { place: 'near', magnitude: 2.6, lat: 42.0, lng: -83.5 }],
    fires: [{ lat: 41.95, lng: -83.4 }, { lat: 44, lng: -85 }],
    incidents: [{ name: 'Protest — Toledo', lat: 41.65, lng: -83.54 }],
    wikiSurges: [],
    outages: [{ provider: 'DTE Energy', customersAffected: 6000, lat: 42.33, lng: -83.05 }],
  });
  assert.deepEqual(n.earthquakes.map((q) => q.place), ['near']);
  assert.equal(n.fireCount, 1);
  assert.equal(n.incidents.length, 1);
  assert.equal(n.outages[0].customersAffected, 6000);
});

test('placeStatus escalates to the most serious signal', () => {
  assert.equal(placeStatus({}).level, 'clear');
  assert.equal(placeStatus({ alerts: [{ event: 'Frost Advisory', severity: 'Minor' }] }).level, 'watch');
  assert.equal(placeStatus({ alerts: [{ event: 'Wind Advisory', severity: 'Moderate' }] }).level, 'advisory');
  const s = placeStatus({
    alerts: [{ event: 'Severe Thunderstorm Warning', severity: 'Severe' }],
    nearby: { earthquakes: [], fireCount: 0, nearestFireKm: null, incidents: [], wikiSurges: [], outages: [{ provider: 'DTE Energy', customersAffected: 800 }] },
  });
  assert.equal(s.level, 'warning');
  assert.equal(s.reasons.length, 2);
});
