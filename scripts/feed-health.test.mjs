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
  assert.equal(snapshot.summary.totalFeeds, 17);
  assert.equal(snapshot.summary.healthy, 2);
  assert.equal(snapshot.summary.offline, 1);
  assert.equal(snapshot.summary.stale, 1);
  assert.equal(snapshot.summary.idle, 13);
  assert.equal(snapshot.summary.activeFeeds, 4);
  assert.equal(snapshot.status, 'degraded');

  const byKey = Object.fromEntries(snapshot.feeds.map((feed) => [feed.key, feed]));
  assert.equal(byKey.news.status, 'healthy');
  assert.equal(byKey.earthquakes.status, 'healthy');
  assert.equal(byKey.gdelt.status, 'offline');
  assert.equal(byKey.maritime.status, 'stale');
  assert.equal(byKey.nws_alerts.status, 'idle');
  assert.equal(byKey.fires.status, 'idle');
  assert.equal(byKey.fire_perimeters.status, 'idle');
  assert.equal(byKey.storm_reports.status, 'idle');
  assert.equal(byKey.infra_incidents.status, 'idle');
  assert.equal(byKey.cyber_cve.status, 'idle');
  assert.equal(byKey.ics_advisories.status, 'idle');
  assert.equal(byKey.nrc_events.status, 'idle');
  assert.equal(byKey.openmhz.status, 'idle');
});

test('buildFeedHealthSnapshot emits operational events for healthy, stale, and offline feeds', () => {
  const now = 1_700_000_000_000;
  const snapshot = buildFeedHealthSnapshot({
    data: {
      news: [{ published: new Date(now - 30_000).toISOString(), title: 'item' }],
      gdelt: [],
      maritime_ships: [{ timestamp: now - 120_000 }],
    },
    activeLayers: {
      news_intel: true,
      global_incidents: true,
      maritime: true,
    },
    backendStatus: 'connected',
    probeResults: [
      { path: '/api/gdelt', ok: false, error: 'This operation was aborted' },
    ],
    now,
  });

  assert.ok(Array.isArray(snapshot.events));
  assert.deepEqual(
    snapshot.events.map((event) => [event.type, event.feedKey, event.severity]),
    [
      ['probe_failed', 'gdelt', 'error'],
      ['feed_offline', 'gdelt', 'error'],
      ['feed_stale', 'maritime', 'warning'],
      ['feed_refreshed', 'news', 'info'],
    ],
  );
  assert.match(snapshot.events[0].message, /GDELT/);
  assert.match(snapshot.events[0].message, /aborted/);
  assert.match(snapshot.events[2].message, /2m ago/);
});
