#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRainviewerFrames, lightningTiles, windGridPoints, parseWindGrid } from '../src/lib/weather-layers.mjs';

test('parseRainviewerFrames picks the newest past frame', () => {
  const frame = parseRainviewerFrames({
    host: 'https://tilecache.rainviewer.com',
    radar: { past: [{ time: 1790798400, path: '/v2/radar/old' }, { time: 1790805000, path: '/v2/radar/new' }], nowcast: [] },
  });
  assert.equal(frame.tiles[0], 'https://tilecache.rainviewer.com/v2/radar/new/256/{z}/{x}/{y}/2/1_1.png');
  assert.equal(frame.maxzoom, 7);
  assert.equal(frame.time, new Date(1790805000 * 1000).toISOString());
});

test('parseRainviewerFrames returns null without frames', () => {
  assert.equal(parseRainviewerFrames({ host: 'x', radar: { past: [] } }), null);
  assert.equal(parseRainviewerFrames(null), null);
});

test('lightningTiles is a WMS template that refreshes every 15 minutes', () => {
  const a = lightningTiles(new Date('2026-10-01T00:00:00Z'))[0];
  const b = lightningTiles(new Date('2026-10-01T00:14:59Z'))[0];
  const c = lightningTiles(new Date('2026-10-01T00:15:00Z'))[0];
  assert.match(a, /bbox=\{bbox-epsg-3857\}/);
  assert.equal(a, b);
  assert.notEqual(b, c);
});

test('windGridPoints covers 60S-80N at 10 degrees', () => {
  const points = windGridPoints();
  assert.equal(points.length, 15 * 36);
  assert.deepEqual(points[0], { lat: -60, lng: -180 });
});

test('parseWindGrid pairs responses with grid points and skips gaps', () => {
  const points = [{ lat: 0, lng: 0 }, { lat: 10, lng: 0 }];
  const out = parseWindGrid([
    { current: { time: '2026-09-30T22:00', wind_speed_10m: 12, wind_direction_10m: 270 } },
    { current: { wind_speed_10m: null } },
  ], points);
  assert.deepEqual(out, [{ lat: 0, lng: 0, speedKn: 12, directionFrom: 270, observedAt: '2026-09-30T22:00' }]);
});
