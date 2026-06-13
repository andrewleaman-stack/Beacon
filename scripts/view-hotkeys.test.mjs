#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOTKEY_VIEW_PRESETS, applyHotkeyViewPreset, getHotkeyPresetByShortcut } from '../src/lib/view-hotkeys.mjs';

const baseLayers = {
  flights: false,
  private: false,
  jets: false,
  military: false,
  maritime: true,
  satellites: false,
  cctv: true,
  live_news: true,
  news_intel: true,
  earthquakes: true,
  fires: false,
  weather: false,
  radiation: false,
  infrastructure: false,
  global_incidents: true,
  war_alerts: false,
  gps_jamming: false,
  day_night: true,
  cables: true,
  sdk_sea: true,
  sdk_air: true,
  sdk_naval: true,
  malware: false,
  custom_overlay: true,
};

test('hotkey presets expose six unique numeric shortcuts and labels', () => {
  assert.equal(HOTKEY_VIEW_PRESETS.length, 6);
  assert.deepEqual(HOTKEY_VIEW_PRESETS.map(p => p.shortcut), ['1', '2', '3', '4', '5', '6']);
  assert.equal(new Set(HOTKEY_VIEW_PRESETS.map(p => p.id)).size, HOTKEY_VIEW_PRESETS.length);
  assert.ok(HOTKEY_VIEW_PRESETS.every(p => p.label && p.description && p.layerKeys.length > 0));
});

test('getHotkeyPresetByShortcut resolves configured shortcuts only', () => {
  assert.equal(getHotkeyPresetByShortcut('3')?.id, 'hazards');
  assert.equal(getHotkeyPresetByShortcut('7'), undefined);
});

test('applyHotkeyViewPreset activates only preset-controlled feeds and preserves passive overlays', () => {
  const next = applyHotkeyViewPreset(baseLayers, 'hazards');
  assert.equal(next.earthquakes, true);
  assert.equal(next.fires, true);
  assert.equal(next.weather, true);
  assert.equal(next.flights, false);
  assert.equal(next.maritime, false);
  assert.equal(next.live_news, false);
  assert.equal(next.day_night, true);
  assert.equal(next.cables, true);
  assert.equal(next.custom_overlay, true);
});

test('all preset enables every controlled feed layer without disabling passive overlays', () => {
  const next = applyHotkeyViewPreset(baseLayers, 'all');
  for (const key of HOTKEY_VIEW_PRESETS.find(p => p.id === 'all').layerKeys) {
    assert.equal(next[key], true, `${key} should be enabled`);
  }
  assert.equal(next.day_night, true);
  assert.equal(next.cables, true);
});

test('unknown preset returns the original object unchanged', () => {
  const next = applyHotkeyViewPreset(baseLayers, 'missing');
  assert.equal(next, baseLayers);
});
