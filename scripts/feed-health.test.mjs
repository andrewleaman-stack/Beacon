#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFeedHealthSnapshot,
  classifyFeedStatus,
} from '../src/lib/feed-health.mjs';

test('classifyFeedStatus marks missing required feeds as offline', () => {
  assert.equal(classifyFeedStatus({ count: 0, lastEventAt: null, required: true, staleAfterMs: 60_000, now: 1_700_000_000_000 }), 'offline');
});

test('classifyFeedStatus marks stale feeds by last event age', () => {
  assert.equal(classifyFeedStatus({ count: 3, lastEventAt: 1_699_999_000_000, required: true, staleAfterMs: 60_000, now: 1_700_000_000_000 }), 'stale');
});

test('classifyFeedStatus marks populated fresh feeds as healthy', () => {
  assert.equal(classifyFeedStatus({ count: 3, lastEventAt: 1_699_999_970_000, required: true, staleAfterMs: 60_000, now: 1_700_000_000_000 }), 'healthy');
});

test('buildFeedHealthSnapshot summarizes current BEACON cache state', () => {
  const now = 1_700_000_000_000;
  const snapshot = buildFeedHealthSnapshot({
    data: {
      news: [{ published: new Date(now - 30_000).toISOString(), title: 'item' }],
      earthquakes: [{ time: now - 10_000, magnitude: 3.1 }],
      gdelt: [],
      maritime_ships: [{ timestamp: now - 120_000 }],
    },
    activeLayers: {
      news_intel: true,
      earthquakes: true,
      global_incidents: true,
      maritime: true,
    },
    backendStatus: 'connected',
    now,
  });

  assert.equal(snapshot.platform, 'BEACON');
  assert.equal(snapshot.summary.totalFeeds, 8);
  assert.equal(snapshot.summary.healthy, 2);
  assert.equal(snapshot.summary.offline, 1);
  assert.equal(snapshot.summary.stale, 1);
  assert.equal(snapshot.summary.activeFeeds, 4);
  assert.equal(snapshot.status, 'degraded');

  const byKey = Object.fromEntries(snapshot.feeds.map((feed) => [feed.key, feed]));
  assert.equal(byKey.news.status, 'healthy');
  assert.equal(byKey.earthquakes.status, 'healthy');
  assert.equal(byKey.gdelt.status, 'offline');
  assert.equal(byKey.maritime.status, 'stale');
});
