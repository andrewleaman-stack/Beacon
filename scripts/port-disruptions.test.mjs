#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePortDisruption,
  parsePortWatchFeatures,
} from '../src/lib/port-disruptions.mjs';

const NOW = new Date('2026-06-15T00:00:00Z');

const BEIRA = {
  portid: 'port137',
  portname: 'Beira',
  country: 'Mozambique',
  lat: -19.81107,
  long: 34.83984,
  eventid: '1000552',
  eventname: 'IDAI-19',
  fromdate: 1552111200000, // 2019-03
  todate: 1552608000000,   // 2019-03
  distance_km: 23.84,
  ObjectId: 1,
};

test('normalizePortDisruption maps an ArcGIS feature to a BEACON record', () => {
  const d = normalizePortDisruption(BEIRA, NOW);
  assert.ok(d);
  assert.equal(d.id, 'portwatch-port137-1000552');
  assert.equal(d.portName, 'Beira');
  assert.equal(d.country, 'Mozambique');
  assert.equal(d.eventName, 'IDAI-19');
  assert.equal(d.lat, -19.81107);
  assert.equal(d.lng, 34.83984);
  assert.equal(d.distanceKm, 24);
  assert.equal(d.source, 'IMF PortWatch');
  assert.equal(d.fromDate, '2019-03-09T06:00:00.000Z');
  assert.equal(d.status, 'PAST'); // 2019 todate is before NOW
  assert.equal(d.active, false);
});

test('a disruption with a future toDate is ACTIVE', () => {
  const future = NOW.getTime() + 86_400_000;
  const d = normalizePortDisruption({ ...BEIRA, todate: future }, NOW);
  assert.equal(d.active, true);
  assert.equal(d.status, 'ACTIVE');
});

test('normalizePortDisruption rejects invalid / null-island coordinates', () => {
  assert.equal(normalizePortDisruption({ ...BEIRA, lat: 0, long: 0 }, NOW), null);
  assert.equal(normalizePortDisruption({ ...BEIRA, lat: 'x', long: 5 }, NOW), null);
});

test('normalizePortDisruption tolerates missing dates', () => {
  const d = normalizePortDisruption({ ...BEIRA, fromdate: null, todate: null }, NOW);
  assert.ok(d);
  assert.equal(d.fromDate, null);
  assert.equal(d.toDate, null);
  assert.equal(d.active, false);
});

test('parsePortWatchFeatures extracts attributes, filters, and honors limit', () => {
  const payload = {
    features: [
      { attributes: BEIRA },
      { attributes: { ...BEIRA, portid: 'p0', lat: 0, long: 0 } }, // invalid -> dropped
      { attributes: { ...BEIRA, portid: 'p2', eventid: 'e2' } },
      { attributes: { ...BEIRA, portid: 'p3', eventid: 'e3' } },
    ],
  };
  const all = parsePortWatchFeatures(payload, { now: NOW });
  assert.equal(all.length, 3); // null-island dropped

  const capped = parsePortWatchFeatures(payload, { now: NOW, limit: 2 });
  assert.equal(capped.length, 2);
});

test('parsePortWatchFeatures handles non-feature payloads', () => {
  assert.deepEqual(parsePortWatchFeatures(null), []);
  assert.deepEqual(parsePortWatchFeatures({}), []);
});
