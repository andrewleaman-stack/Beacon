#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_VIEW_PRESETS,
  DEFAULT_HOME_LOCATION,
  getDashboardViewPresetId,
  normalizeDashboardViewSettings,
  normalizeHomeLocation,
} from '../src/lib/dashboard-settings.mjs';

test('dashboard view settings normalize and clamp unsafe values', () => {
  assert.deepEqual(normalizeDashboardViewSettings({ fontScale: 2, iconScale: 0.1, density: 'huge' }), {
    fontScale: 1.3,
    iconScale: 0.8,
    density: 'standard',
  });
});

test('dashboard view preset id resolves presets and custom settings', () => {
  assert.equal(getDashboardViewPresetId(DASHBOARD_VIEW_PRESETS[0]), 'compact');
  assert.equal(getDashboardViewPresetId({ fontScale: 1.08, iconScale: 1, density: 'standard' }), 'custom');
});

test('home location normalizes label, coordinates, and zoom bounds', () => {
  const home = normalizeHomeLocation({ label: '  Ops Desk  ', lat: 120, lng: -250, zoom: 25 });
  assert.deepEqual(home, { label: 'Ops Desk', lat: 85, lng: -180, zoom: 14 });
});

test('empty home location falls back to global overview', () => {
  assert.deepEqual(normalizeHomeLocation({}), DEFAULT_HOME_LOCATION);
});
