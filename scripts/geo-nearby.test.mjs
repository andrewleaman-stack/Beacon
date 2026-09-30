#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { distanceKm, contactsNear, nearest, appendTrail } from '../src/lib/geo-nearby.mjs';

const DETROIT = { lat: 42.3314, lng: -83.0458 };
const TOLEDO = { lat: 41.6528, lng: -83.5379 };

test('distanceKm matches the Detroit-Toledo great-circle distance', () => {
  const km = distanceKm(DETROIT, TOLEDO);
  assert.ok(km > 84 && km < 88, `got ${km}`);
});

test('contactsNear filters by radius, sorts nearest first and skips the tracked target', () => {
  const out = contactsNear(DETROIT, {
    flight: [{ icao24: 'self', lat: 42.33, lng: -83.04 }, { icao24: 'a1', ...TOLEDO }],
    ship: [{ mmsi: 1, lat: 42.25, lng: -83.12 }],
    camera: [{ id: 'far', lat: 51.5, lng: -0.12 }],
  }, { radiusKm: 250, excludeId: 'self' });
  assert.deepEqual(out.map((c) => c.id), ['1', 'a1']);
});

test('nearest returns the closest item with its distance', () => {
  const best = nearest(DETROIT, [{ id: 'toledo', ...TOLEDO }, { id: 'windsor', lat: 42.3149, lng: -83.0364 }]);
  assert.equal(best.item.id, 'windsor');
  assert.ok(best.km < 3);
});

test('appendTrail ignores tiny moves and caps length', () => {
  let trail = appendTrail([], DETROIT);
  trail = appendTrail(trail, { lat: 42.33141, lng: -83.04581 });
  assert.equal(trail.length, 1);
  trail = appendTrail(trail, TOLEDO, { max: 1 });
  assert.deepEqual(trail, [[TOLEDO.lng, TOLEDO.lat]]);
});
