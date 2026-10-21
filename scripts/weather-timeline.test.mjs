#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TIMELINE, snapTime, timeToPosition, positionToTime, stepTime, nextPlayTime,
  frameIndexAt, framesToKeep, parseIsoDuration, expandTimeDimension, activeAt, formatOffset,
} from '../src/lib/weather-timeline.mjs';

const MIN = 60_000;
const HOUR = 60 * MIN;
const NOW = Date.parse('2026-10-21T04:37:00Z');

test('snapTime floors the past to 10 minutes and rounds the future to the hour', () => {
  assert.equal(snapTime(NOW - 23 * MIN, NOW), Date.parse('2026-10-21T04:10:00Z'));
  assert.equal(snapTime(NOW + 5 * HOUR + 20 * MIN, NOW), Date.parse('2026-10-21T10:00:00Z'));
  // Clamped to the window.
  assert.equal(snapTime(NOW - 10 * HOUR, NOW), NOW - TIMELINE.pastMs);
  assert.equal(snapTime(NOW + 100 * HOUR, NOW), NOW + TIMELINE.futureMs);
});

test('timeToPosition and positionToTime are inverses, with now at the past/future boundary', () => {
  assert.equal(timeToPosition(NOW, NOW), TIMELINE.pastShare);
  assert.equal(timeToPosition(NOW - TIMELINE.pastMs, NOW), 0);
  assert.equal(timeToPosition(NOW + TIMELINE.futureMs, NOW), 1);
  for (const t of [NOW - 2 * HOUR, NOW - 5 * MIN, NOW + 7 * HOUR, NOW + 50 * HOUR]) {
    assert.ok(Math.abs(positionToTime(timeToPosition(t, NOW), NOW) - t) < 1000);
  }
});

test('stepTime moves 10 minutes in the past, an hour in the future, and stops at now', () => {
  const past = Date.parse('2026-10-21T04:10:00Z');
  assert.equal(stepTime(past, NOW, -1), Date.parse('2026-10-21T04:00:00Z'));
  assert.equal(stepTime(Date.parse('2026-10-21T04:30:00Z'), NOW, 1), NOW);
  assert.equal(stepTime(NOW, NOW, 1), Date.parse('2026-10-21T06:00:00Z'));
  assert.equal(stepTime(Date.parse('2026-10-21T08:00:00Z'), NOW, -1), Date.parse('2026-10-21T07:00:00Z'));
});

test('nextPlayTime loops the last two hours in the past and wraps the forecast to now', () => {
  const lastPast = Date.parse('2026-10-21T04:30:00Z');
  assert.equal(nextPlayTime(lastPast, NOW), snapTime(NOW - TIMELINE.loopMs, NOW));
  assert.equal(nextPlayTime(Date.parse('2026-10-21T04:00:00Z'), NOW), Date.parse('2026-10-21T04:10:00Z'));
  assert.equal(nextPlayTime(NOW + TIMELINE.futureMs, NOW), NOW);
});

test('frameIndexAt picks the newest frame at or before t, within tolerance', () => {
  const frames = [0, 10, 20, 30].map((m) => m * MIN);
  assert.equal(frameIndexAt(frames, 25 * MIN, 15 * MIN), 2);
  assert.equal(frameIndexAt(frames, 30 * MIN, 15 * MIN), 3);
  assert.equal(frameIndexAt(frames, 60 * MIN, 15 * MIN), -1);
  assert.equal(frameIndexAt(frames, -1, 15 * MIN), -1);
  assert.equal(frameIndexAt([], 0, 15 * MIN), -1);
});

test('framesToKeep shows only the newest frame live, and preloads ahead (wrapping) otherwise', () => {
  const frames = [0, 10, 20, 30].map((m) => m * MIN);
  assert.deepEqual(framesToKeep(frames, null, 15 * MIN), { keep: [30 * MIN], current: 30 * MIN });
  assert.deepEqual(framesToKeep(frames, 21 * MIN, 15 * MIN, 2), { keep: [20 * MIN, 30 * MIN, 0], current: 20 * MIN });
  assert.deepEqual(framesToKeep(frames, 2 * HOUR, 15 * MIN, 2), { keep: [], current: null });
  assert.deepEqual(framesToKeep([], null, 15 * MIN), { keep: [], current: null });
});

test('parseIsoDuration handles WMS periods', () => {
  assert.equal(parseIsoDuration('PT10M'), 10 * MIN);
  assert.equal(parseIsoDuration('PT1H'), HOUR);
  assert.equal(parseIsoDuration('P1D'), 24 * HOUR);
  assert.equal(parseIsoDuration('nonsense'), 0);
});

test('expandTimeDimension expands lists and intervals inside the window only', () => {
  const from = Date.parse('2026-10-21T02:00:00Z');
  const to = Date.parse('2026-10-21T03:00:00Z');
  const intervals = expandTimeDimension('2020-09-01T00:00:00.000Z/2026-10-21T02:30:00.000Z/PT15M', from, to);
  assert.deepEqual(intervals.map((t) => new Date(t).toISOString().slice(11, 16)), ['02:00', '02:15', '02:30']);
  const list = expandTimeDimension('2026-10-21T01:45:00.000Z,2026-10-21T02:15:00.000Z,2026-10-21T02:45:00.000Z', from, to);
  assert.deepEqual(list.map((t) => new Date(t).toISOString().slice(11, 16)), ['02:15', '02:45']);
  const gibs = expandTimeDimension('2026-10-21T01:40:00Z/2026-10-21T02:20:00Z/PT10M,2026-10-21T02:40:00Z/2026-10-21T02:50:00Z/PT10M', from, to);
  assert.deepEqual(gibs.map((t) => new Date(t).toISOString().slice(11, 16)), ['02:00', '02:10', '02:20', '02:40', '02:50']);
});

test('activeAt treats the end as exclusive and a missing end as open', () => {
  const t = Date.parse('2026-10-21T05:00:00Z');
  assert.equal(activeAt('2026-10-21T04:00:00Z', '2026-10-21T06:00:00Z', t), true);
  assert.equal(activeAt('2026-10-21T04:00:00Z', '2026-10-21T05:00:00Z', t), false);
  assert.equal(activeAt('2026-10-21T06:00:00Z', null, t), false);
  assert.equal(activeAt(null, null, t), true);
});

test('formatOffset gives short relative labels', () => {
  assert.equal(formatOffset(NOW, NOW), 'Now');
  assert.equal(formatOffset(NOW - 80 * MIN, NOW), '−1h 20m');
  assert.equal(formatOffset(NOW + 5 * HOUR, NOW), '+5h');
  assert.equal(formatOffset(NOW + 51 * HOUR, NOW), '+2d 3h');
});
