#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRainviewerFrames, lightningTiles, windGridPoints, parseWindGrid, parseWmsLayerTimes, meteosatTiles, fetchMeteosatTimes } from '../src/lib/weather-layers.mjs';
import { fetchWeatherFrames, settledGibsTimes } from '../src/lib/weather-frames.mjs';

test('parseRainviewerFrames lists every past frame and leads with the newest', () => {
  const frame = parseRainviewerFrames({
    host: 'https://tilecache.rainviewer.com',
    radar: { past: [{ time: 1790798400, path: '/v2/radar/old' }, { time: 1790805000, path: '/v2/radar/new' }], nowcast: [] },
  });
  assert.equal(frame.tiles[0], 'https://tilecache.rainviewer.com/v2/radar/new/256/{z}/{x}/{y}/2/1_1.png');
  assert.equal(frame.maxzoom, 7);
  assert.equal(frame.time, new Date(1790805000 * 1000).toISOString());
  assert.equal(frame.frames.length, 2);
  assert.equal(frame.frames[0].tiles[0], 'https://tilecache.rainviewer.com/v2/radar/old/256/{z}/{x}/{y}/2/1_1.png');
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

test('lightningTiles asks for a specific map when given a time', () => {
  const [url] = lightningTiles(new Date('2026-10-01T00:00:00Z'), '2026-09-30T23:45:00.000Z');
  assert.match(url, /&time=2026-09-30T23:45:00\.000Z$/);
  assert.doesNotMatch(url, /&t=/);
});

test('parseWmsLayerTimes reads one layer\'s time dimension inside a window', () => {
  const xml = `<WMS_Capabilities><Capability><Layer><Name>other</Name><Dimension name="time">2026-10-21T00:00:00Z</Dimension></Layer>
    <Layer><Name>ir108</Name><Dimension name="time" default="2026-10-21T04:15:00Z" units="ISO8601" nearestValue="1">2020-09-01T00:00:00.000Z/2026-10-21T04:15:00.000Z/PT15M</Dimension></Layer></Capability></WMS_Capabilities>`;
  const times = parseWmsLayerTimes(xml, 'ir108', Date.parse('2026-10-21T03:50:00Z'), Date.parse('2026-10-21T05:00:00Z'));
  assert.deepEqual(times.map((t) => new Date(t).toISOString().slice(11, 16)), ['04:00', '04:15']);
  assert.deepEqual(parseWmsLayerTimes(xml, 'missing', 0, Date.now()), []);
});

test('meteosatTiles is a bounded EUMETSAT WMS template, optionally timed', () => {
  assert.match(meteosatTiles()[0], /layers=msg_fes:ir108.*bbox=\{bbox-epsg-3857\}$/);
  assert.match(meteosatTiles('2026-10-21T04:15:00.000Z')[0], /&time=2026-10-21T04:15:00\.000Z$/);
});

test('fetchMeteosatTimes reads the unprefixed layer name from the per-layer capabilities', async () => {
  const xml = '<Layer><Name>ir108</Name><Dimension name="time">2026-10-21T04:00:00Z/2026-10-21T04:15:00Z/PT15M</Dimension></Layer>';
  const times = await fetchMeteosatTimes({ fetchImpl: async () => ({ ok: true, text: async () => xml }), from: 0, to: Date.parse('2026-10-22T00:00:00Z') });
  assert.equal(times.length, 2);
});

test('settledGibsTimes drops the newest frame, which may still be missing tiles', () => {
  assert.deepEqual(settledGibsTimes([1, 2, 3]), [1, 2]);
  assert.deepEqual(settledGibsTimes([1]), [1]);
});

test('fetchWeatherFrames keeps the previous list for a provider that fails', async () => {
  const now = Date.parse('2026-10-21T04:37:00Z');
  const previous = { radar: { maxzoom: 7, frames: [{ time: now - 600_000, tiles: ['old'] }] }, lightning: [now - 900_000], clouds: { 'goes-east': [now - 3_600_000] }, errors: [], fetchedAt: now - 300_000 };
  const fetchImpl = async (url) => {
    if (url.includes('rainviewer')) return { ok: false, status: 503 };
    if (url.includes('nowcoast')) return { ok: true, text: async () => '<Layer><Name>ldn_lightning_strike_density</Name><Dimension name="time">2026-10-21T04:15:00.000Z,2026-10-21T04:30:00.000Z</Dimension></Layer>' };
    if (url.includes('eumetsat')) return { ok: true, text: async () => '<Layer><Name>ir108</Name><Dimension name="time">2026-10-21T04:00:00Z/2026-10-21T04:30:00Z/PT15M</Dimension></Layer>' };
    return { ok: true, text: async () => '<Domains><DimensionDomain><ows:Identifier>time</ows:Identifier><Domain>2026-10-21T03:00:00Z/2026-10-21T03:20:00Z/PT10M</Domain></DimensionDomain></Domains>' };
  };
  const frames = await fetchWeatherFrames({ fetchImpl, now, previous });
  assert.equal(frames.radar.frames[0].tiles[0], 'old');
  assert.equal(frames.lightning.length, 2);
  assert.equal(frames.clouds.meteosat.length, 3);
  // GIBS lists 03:00-03:20; the newest (03:20) is held back.
  assert.equal(frames.clouds['goes-east'].length, 2);
  assert.equal(frames.errors.length, 1);
  assert.match(frames.errors[0], /^radar:/);
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
