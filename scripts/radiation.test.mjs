#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cpmToNanoSievert,
  statusForNanoSievert,
  normalizeSafecastDevice,
  parseSafecastDevices,
} from '../src/lib/radiation.mjs';

const RAD_DEVICE = {
  device: 61099,
  device_urn: 'geigiecast:61099',
  loc_lat: 22.31807,
  loc_lon: 114.15771,
  lnd_7318u: 53,
  when_captured: '2026-06-10T12:00:00Z',
};

test('cpmToNanoSievert converts using the tube factor', () => {
  assert.equal(cpmToNanoSievert(334, 334), 1000); // 1 µSv/h = 1000 nSv/h
  assert.equal(cpmToNanoSievert(0, 334), null);
  assert.equal(cpmToNanoSievert(50, 0), null);
});

test('statusForNanoSievert buckets by dose rate', () => {
  assert.equal(statusForNanoSievert(120), 'NORMAL');
  assert.equal(statusForNanoSievert(500), 'WARNING');
  assert.equal(statusForNanoSievert(2000), 'DANGER');
  assert.equal(statusForNanoSievert(null), 'NORMAL');
});

test('normalizeSafecastDevice maps a radiation device to a station', () => {
  const s = normalizeSafecastDevice(RAD_DEVICE, new Date('2026-06-15T00:00:00Z'));
  assert.ok(s);
  assert.equal(s.id, 'safecast-61099');
  assert.equal(s.network, 'Safecast Realtime');
  assert.equal(s.lat, 22.31807);
  assert.equal(s.lng, 114.15771);
  assert.equal(s.cpm, 53);
  assert.equal(s.tube, 'lnd_7318u');
  assert.equal(s.reading, Math.round((53 / 334) * 1000)); // 159 nSv/h
  assert.equal(s.status, 'NORMAL');
  assert.equal(s.unit, 'nSv/h');
  assert.equal(s.capturedAt, '2026-06-10T12:00:00.000Z');
});

test('normalizeSafecastDevice flags elevated readings as DANGER', () => {
  const s = normalizeSafecastDevice({ ...RAD_DEVICE, lnd_7318u: 5000 });
  assert.equal(s.status, 'DANGER');
});

test('normalizeSafecastDevice ignores air-quality-only (PM2.5) devices', () => {
  assert.equal(normalizeSafecastDevice({ device: 1, loc_lat: 35.6, loc_lon: 139.7, pms_pm02_5: 12 }), null);
});

test('normalizeSafecastDevice rejects invalid / null-island coordinates', () => {
  assert.equal(normalizeSafecastDevice({ device: 2, loc_lat: 0, loc_lon: 0, lnd_7318u: 50 }), null);
  assert.equal(normalizeSafecastDevice({ device: 3, loc_lat: 'x', loc_lon: 10, lnd_7318u: 50 }), null);
});

test('normalizeSafecastDevice tolerates malformed timestamps', () => {
  const s = normalizeSafecastDevice({ ...RAD_DEVICE, when_captured: '2012-00-00T00:00:00Z' });
  assert.ok(s);
  assert.equal(s.capturedAt, null);
});

test('parseSafecastDevices filters non-radiation devices and honors limit', () => {
  const devices = [
    RAD_DEVICE,
    { device: 10, loc_lat: 35.6, loc_lon: 139.7, pms_pm02_5: 12 }, // air only -> skipped
    { ...RAD_DEVICE, device: 11, lnd_7318u: 167 }, // ~500 nSv/h -> WARNING
    { ...RAD_DEVICE, device: 12 },
  ];
  const all = parseSafecastDevices(devices);
  assert.equal(all.length, 3); // air-only dropped
  assert.equal(all.find((s) => s.id === 'safecast-11').status, 'WARNING');

  const capped = parseSafecastDevices(devices, { limit: 2 });
  assert.equal(capped.length, 2);
});

test('parseSafecastDevices handles non-array input', () => {
  assert.deepEqual(parseSafecastDevices(null), []);
});
