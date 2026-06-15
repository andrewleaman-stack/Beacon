#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  haversineKm,
  severityWeight,
  usableEvents,
  clusterEvents,
  scoreSituation,
  buildSituations,
} from '../src/lib/situations.mjs';

const T = '2026-06-15T00:00:00Z';
function ev(over) {
  return { id: 'e', source: 'src', type: 'x', title: 't', lat: 0, lng: 0, time: T, severity: 'low', country: '', ...over };
}

test('haversineKm computes great-circle distance', () => {
  // ~111 km per degree of latitude at the equator
  assert.ok(Math.abs(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) - 111) < 2);
  assert.equal(Math.round(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })), 0);
});

test('severityWeight ranks severities', () => {
  assert.ok(severityWeight('critical') > severityWeight('high'));
  assert.ok(severityWeight('high') > severityWeight('elevated'));
  assert.ok(severityWeight('elevated') > severityWeight('low'));
});

test('usableEvents drops items without valid coordinates', () => {
  const out = usableEvents([ev(), ev({ lat: undefined }), ev({ lat: 200 }), { foo: 1 }]);
  assert.equal(out.length, 1);
});

test('clusterEvents groups nearby contemporaneous events and splits distant ones', () => {
  const near = clusterEvents([
    ev({ id: 'a', lat: 10, lng: 10 }),
    ev({ id: 'b', lat: 10.1, lng: 10.1 }), // ~15 km away
  ], { radiusKm: 300, windowHours: 72 });
  assert.equal(near.length, 1);
  assert.equal(near[0].events.length, 2);

  const far = clusterEvents([
    ev({ id: 'a', lat: 10, lng: 10 }),
    ev({ id: 'b', lat: 40, lng: 40 }),
  ], { radiusKm: 300 });
  assert.equal(far.length, 2);
});

test('clusterEvents splits same-place events outside the time window', () => {
  const clusters = clusterEvents([
    ev({ id: 'a', lat: 10, lng: 10, time: '2026-06-15T00:00:00Z' }),
    ev({ id: 'b', lat: 10, lng: 10, time: '2026-06-01T00:00:00Z' }), // 14 days earlier
  ], { radiusKm: 300, windowHours: 72 });
  assert.equal(clusters.length, 2);
});

test('scoreSituation rewards corroboration and recency', () => {
  const now = new Date(T).getTime();
  const multiSource = clusterEvents([
    ev({ lat: 5, lng: 5, source: 'A', severity: 'high' }),
    ev({ lat: 5.05, lng: 5.05, source: 'B', severity: 'high' }),
    ev({ lat: 5.02, lng: 5.02, source: 'C', severity: 'high' }),
  ])[0];
  const singleSource = clusterEvents([
    ev({ lat: 5, lng: 5, source: 'A', severity: 'high' }),
  ])[0];
  assert.ok(scoreSituation(multiSource, { now }) > scoreSituation(singleSource, { now }));

  // recency: an old single event scores lower than a fresh identical one
  const old = clusterEvents([ev({ lat: 1, lng: 1, time: '2026-05-01T00:00:00Z' })])[0];
  const fresh = clusterEvents([ev({ lat: 1, lng: 1, time: T })])[0];
  assert.ok(scoreSituation(fresh, { now }) > scoreSituation(old, { now }));
});

test('buildSituations ranks by score and carries member events for grounding', () => {
  const events = [
    // Significant: 3 feeds, critical, near Manila
    ev({ id: 'm1', lat: 14.6, lng: 121.0, source: 'Quakes', severity: 'critical', country: 'Philippines' }),
    ev({ id: 'm2', lat: 14.65, lng: 121.02, source: 'PortWatch', severity: 'high', country: 'Philippines' }),
    ev({ id: 'm3', lat: 14.58, lng: 120.98, source: 'Conflict', severity: 'high', country: 'Philippines' }),
    // Minor: 1 feed, low, far away
    ev({ id: 's1', lat: -33.9, lng: 18.4, source: 'Fires', severity: 'low', country: 'South Africa' }),
  ];
  const situations = buildSituations(events, { now: new Date(T).getTime() });
  assert.equal(situations.length, 2);
  assert.equal(situations[0].country, 'Philippines'); // highest score first
  assert.equal(situations[0].sourceCount, 3);
  assert.equal(situations[0].topSeverity, 'critical');
  assert.equal(situations[0].events.length, 3); // grounding preserved
  assert.ok(situations[0].score > situations[1].score);
});

test('buildSituations honors the limit', () => {
  const events = Array.from({ length: 10 }, (_, i) => ev({ id: `x${i}`, lat: i * 20 - 90, lng: 0 }));
  assert.equal(buildSituations(events, { limit: 3 }).length, 3);
});
