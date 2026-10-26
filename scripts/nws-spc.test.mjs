#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { simplifyGeometry, douglasPeucker, mergePolygons, createZoneCache, normalizeAlert, fetchNwsAlerts, alertArea, zoneId } from '../src/lib/nws-alerts.mjs';
import { parseOutlook, fetchOutlooks } from '../src/lib/spc-outlook.mjs';

const square = (x, y) => [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]];
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

test('simplifyGeometry rounds to 3 decimals and drops repeated points', () => {
  const g = simplifyGeometry({ type: 'Polygon', coordinates: [[[0.00012, 0], [0.0001, 0], [1, 0], [1, 1], [0, 0]]] });
  assert.deepEqual(g.coordinates[0], [[0, 0], [1, 0], [1, 1], [0, 0]]);
  assert.equal(simplifyGeometry({ type: 'Point', coordinates: [0, 0] }), null);
  assert.equal(simplifyGeometry(null), null);
});

test('douglasPeucker drops points that barely deviate and keeps the corners', () => {
  const line = [[0, 0], [1, 0.001], [2, 0], [2, 2], [0, 2], [0, 0]];
  assert.deepEqual(douglasPeucker(line, 0.01), [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]);
  assert.deepEqual(douglasPeucker(line, 0), line);
  // A ring that collapses below 4 points is dropped by simplifyGeometry.
  assert.equal(simplifyGeometry({ type: 'Polygon', coordinates: [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0]]] }, 0.01), null);
});

test('mergePolygons combines polygons and multipolygons', () => {
  const merged = mergePolygons([{ type: 'Polygon', coordinates: square(0, 0) }, null, { type: 'MultiPolygon', coordinates: [square(2, 2), square(4, 4)] }]);
  assert.equal(merged.type, 'MultiPolygon');
  assert.equal(merged.coordinates.length, 3);
  assert.equal(mergePolygons([{ type: 'Polygon', coordinates: square(0, 0) }]).type, 'Polygon');
  assert.equal(mergePolygons([]), null);
});

test('normalizeAlert keeps the alert polygon, or lists its zones, and colours by severity', () => {
  const zones = new Map([['z/A', { type: 'Polygon', coordinates: square(0, 0) }], ['z/B', { type: 'Polygon', coordinates: square(1, 1) }]]);
  const cache = { get: (u) => zones.get(u) };
  const outlines = { A: zones.get('z/A'), B: zones.get('z/B') };
  const own = normalizeAlert({ geometry: { type: 'Polygon', coordinates: square(5, 5) }, properties: { id: 'a', event: 'Tornado Warning', severity: 'Extreme', onset: '2026-10-21T04:00:00Z', ends: '2026-10-21T05:00:00Z' } }, cache);
  assert.equal(own.areaSource, 'alert');
  assert.equal(own.color, '#D32F2F');
  assert.equal(own.ends, '2026-10-21T05:00:00Z');
  const zoned = normalizeAlert({ geometry: null, properties: { id: 'b', event: 'Gale Warning', severity: 'Moderate', affectedZones: ['z/A', 'z/B'], effective: 'x', expires: 'y' } }, cache);
  assert.equal(zoned.areaSource, 'zones');
  assert.equal(zoned.geometry, null);
  assert.deepEqual(zoned.zones, ['A', 'B']);
  assert.equal(alertArea(zoned, outlines).type, 'MultiPolygon');
  assert.equal(alertArea(own, outlines).type, 'Polygon');
  assert.equal(alertArea({ geometry: null, zones: ['missing'] }, outlines), null);
  assert.equal(zoneId('https://api.weather.gov/zones/forecast/ANZ050'), 'ANZ050');
  // Without onset/ends it falls back to the message times.
  assert.equal(zoned.onset, 'x');
  assert.equal(zoned.ends, 'y');
  const unknown = normalizeAlert({ properties: { severity: 'Weird' } }, cache);
  assert.equal(unknown.severity, 'Unknown');
  assert.equal(unknown.geometry, null);
});

test('normalizeAlert only keeps https links', () => {
  assert.equal(normalizeAlert({ properties: { '@id': 'javascript:alert(1)' } }).url, '');
  assert.equal(normalizeAlert({ properties: { '@id': 'https://api.weather.gov/alerts/x' } }).url, 'https://api.weather.gov/alerts/x');
});

test('zone cache fetches each zone once and caches outlines', async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return json({ geometry: { type: 'Polygon', coordinates: square(0, 0) } }); };
  const cache = createZoneCache({ fetchImpl });
  await cache.ensure(['https://api.weather.gov/zones/forecast/A', 'https://api.weather.gov/zones/forecast/A'], 1000);
  await cache.ensure(['https://api.weather.gov/zones/forecast/A'], 1000);
  assert.equal(calls.length, 1);
  assert.equal(cache.size, 1);
  assert.equal(cache.pending, 0);
  assert.equal(cache.get('https://api.weather.gov/zones/forecast/A').type, 'Polygon');
});

test('zone cache does not cache failures, so they are retried', async () => {
  let n = 0;
  const cache = createZoneCache({ fetchImpl: async () => { n++; return json({}, 503); } });
  await cache.ensure(['z'], 1000);
  await cache.ensure(['z'], 1000);
  assert.equal(n, 2);
  assert.equal(cache.has('z'), false);
});

test('fetchNwsAlerts returns each zone outline once and sorts alerts weakest first', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/alerts/active')) {
      return json({ features: [
        { geometry: { type: 'Polygon', coordinates: square(0, 0) }, properties: { id: '1', event: 'Tornado Warning', severity: 'Extreme' } },
        { geometry: null, properties: { id: '2', event: 'Small Craft Advisory', severity: 'Minor', affectedZones: ['https://api.weather.gov/zones/forecast/PKZ1'] } },
      ] });
    }
    return json({ geometry: { type: 'Polygon', coordinates: square(9, 9) } });
  };
  const { alerts, zones } = await fetchNwsAlerts({ fetchImpl, zoneCache: createZoneCache({ fetchImpl }) });
  assert.deepEqual(alerts.map((a) => a.id), ['2', '1']);
  assert.equal(alerts[0].areaSource, 'zones');
  assert.deepEqual(Object.keys(zones), ['PKZ1']);
});

test('parseOutlook keeps valid areas, sorted by risk, with colours', () => {
  const props = (dn, label) => ({ DN: dn, LABEL: label, LABEL2: `${label} risk`, VALID_ISO: '2026-10-21T12:00:00+00:00', EXPIRE_ISO: '2026-10-22T12:00:00+00:00', fill: '#123456', stroke: 'not-a-colour' });
  const out = parseOutlook({ features: [
    { geometry: { type: 'Polygon', coordinates: square(0, 0) }, properties: props(4, 'SLGT') },
    { geometry: { type: 'Polygon', coordinates: square(0, 0) }, properties: props(2, 'TSTM') },
    { geometry: null, properties: props(5, 'ENH') },
  ] }, 2);
  assert.deepEqual(out.map((f) => f.properties.label), ['TSTM', 'SLGT']);
  assert.equal(out[1].properties.day, 2);
  assert.equal(out[1].properties.valid, '2026-10-21T12:00:00.000Z');
  assert.equal(out[1].properties.fill, '#123456');
  assert.equal(out[1].properties.stroke, '#DDAA00');
});

test('fetchOutlooks skips a failed day but fails when every day fails', async () => {
  const ok = { features: [{ geometry: { type: 'Polygon', coordinates: square(0, 0) }, properties: { DN: 2, LABEL: 'TSTM', VALID_ISO: '2026-10-21T12:00:00Z', EXPIRE_ISO: '2026-10-22T12:00:00Z' } }] };
  const partial = await fetchOutlooks({ fetchImpl: async (url) => (url.includes('day2') ? json({}, 500) : json(ok)) });
  assert.equal(partial.features.length, 2);
  assert.equal(partial.errors.length, 1);
  await assert.rejects(fetchOutlooks({ fetchImpl: async () => json({}, 500) }), /unavailable/);
});
