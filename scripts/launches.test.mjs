#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLaunch, groupByPad } from '../src/lib/launches.mjs';

const row = (id, net, pad = { name: 'SLC-40', latitude: '28.5619', longitude: '-80.5773', location: { name: 'Cape Canaveral SFS, FL, USA' } }) => ({
  id, name: `Falcon 9 | ${id}`, net, status: { abbrev: 'Go', name: 'Go for Launch' },
  launch_service_provider: { name: 'SpaceX' }, mission: { name: id, type: 'Communications', orbit: { abbrev: 'LEO' } }, pad, webcast_live: false,
});

test('normalizeLaunch keeps pad coordinates, provider and orbit', () => {
  const l = normalizeLaunch(row('a', '2026-10-01T15:10:06Z'));
  assert.equal(l.lat, 28.5619);
  assert.equal(l.provider, 'SpaceX');
  assert.equal(l.orbit, 'LEO');
  assert.equal(l.status, 'Go');
});

test('normalizeLaunch drops launches without pad coordinates', () => {
  assert.equal(normalizeLaunch(row('b', '2026-10-02T00:00:00Z', { name: 'TBD' })), null);
});

test('groupByPad lists every launch at a pad, soonest first', () => {
  const pads = groupByPad([normalizeLaunch(row('late', '2026-10-09T00:00:00Z')), normalizeLaunch(row('soon', '2026-10-01T00:00:00Z'))]);
  assert.equal(pads.length, 1);
  assert.deepEqual(pads[0].launches.map((l) => l.mission), ['soon', 'late']);
});
