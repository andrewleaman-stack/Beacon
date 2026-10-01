#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTourStops, greatCircle, distanceKm } from '../src/lib/globe-tour.mjs';

/** @param {number} lat @param {number} lng @param {string} sev @param {string} title */
const sit = (lat, lng, sev, title) => ({ centroid: { lat, lng }, topSeverity: sev, score: 8, eventCount: 2, sources: ['USGS Quakes'], events: [{ severity: sev, title }] });

test('stops mix situations, news and risky chokepoints, strongest first', () => {
  const stops = buildTourStops({
    situations: [sit(36.4, 70.1, 'high', 'M5.2 earthquake — Afghanistan')],
    gdelt: [{ lat: 25.05, lng: 121.53, place: "Taipei, T'ai-pei, Taiwan", type: 'unrest', count: 38, sources: 3, goldstein: -6.5 }],
    chokepoints: [
      { name: 'Strait of Hormuz', lat: 26.57, lng: 56.25, risk: 'CRITICAL', risk_evidence: ['Transits 64% below normal'] },
      { name: 'Panama Canal', lat: 9.08, lng: -79.68, risk: 'LOW' },
    ],
  });
  assert.equal(stops.length, 3);
  assert.equal(stops[0].kind, 'chokepoint', 'critical chokepoint leads');
  assert.equal(stops[0].label, 'Strait of Hormuz: shipping risk critical');
  assert.ok(stops.some((s) => s.label === 'Unrest — Taipei, Taiwan'));
  assert.ok(!stops.some((s) => s.label.startsWith('Panama')), 'LOW chokepoints are not stops');
});

test('stops are spread out and capped', () => {
  const many = Array.from({ length: 30 }, (_, i) => sit(10 + (i % 3) * 0.1, 20 + i * 15, 'elevated', `S${i}`));
  const stops = buildTourStops({ situations: many }, { max: 8, minSpacingKm: 700 });
  assert.equal(stops.length, 8);
  for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) {
    assert.ok(distanceKm(stops[i].lat, stops[i].lng, stops[j].lat, stops[j].lng) >= 700);
  }
});

test('route visits the nearest next stop', () => {
  const stops = buildTourStops({ situations: [sit(0, 0, 'critical', 'A'), sit(0, 100, 'high', 'far'), sit(0, 20, 'elevated', 'near')] });
  assert.deepEqual(stops.map((s) => s.label), ['A', 'near', 'far']);
});

test('bad input is ignored', () => {
  assert.deepEqual(buildTourStops({ situations: [{ centroid: { lat: NaN, lng: 1 } }], gdelt: [null], chokepoints: [{}] }), []);
  assert.deepEqual(buildTourStops(/** @type {any} */ ({})), []);
});

test('great-circle arc starts and ends at the stops and stays continuous across 180°', () => {
  const pts = greatCircle({ lat: 35, lng: 170 }, { lat: 40, lng: -170 }, 32);
  assert.equal(pts.length, 33);
  assert.deepEqual(pts[0].map((v) => Math.round(v)), [170, 35]);
  assert.ok(Math.abs(pts[32][0] - 190) < 1e-6, 'end longitude unwrapped to 190');
  for (let i = 1; i < pts.length; i++) assert.ok(Math.abs(pts[i][0] - pts[i - 1][0]) < 5);
});

test('place-only situation titles read as news', () => {
  const [stop] = buildTourStops({ situations: [sit(28.4, 36.6, 'elevated', 'Tabuk, Tabuk, Saudi Arabia')] });
  assert.equal(stop.label, 'In the news — Tabuk, Saudi Arabia');
});
