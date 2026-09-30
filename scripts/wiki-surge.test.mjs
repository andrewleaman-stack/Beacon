#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { SurgeTracker, classifyArticle, severityForSurge, parseSseChunk } from '../src/lib/wiki-surge.mjs';

const T0 = Date.parse('2026-09-30T20:00:00Z');

function edit({ title = 'Port of Odesa', wiki = 'enwiki', user = 'u1', t = T0, type = 'edit', bot = false, namespace = 0 } = {}) {
  return { wiki, title, user, type, bot, namespace, timestamp: t / 1000, server_url: 'https://en.wikipedia.org' };
}

function tracker(now = T0 + 20 * 60_000) {
  return new SurgeTracker({ now: () => now });
}

test('flags a surge: many edits from many editors inside the window', () => {
  const tr = tracker();
  for (let i = 0; i < 14; i++) tr.ingest(edit({ user: `u${i % 6}`, t: T0 + i * 60_000 }));
  const [s] = tr.surges();
  assert.equal(s.kind, 'surge');
  assert.equal(s.edits, 14);
  assert.equal(s.editors, 6);
});

test('does not flag one editor making many edits', () => {
  const tr = tracker();
  for (let i = 0; i < 30; i++) tr.ingest(edit({ user: 'solo', t: T0 + i * 30_000 }));
  assert.equal(tr.surges().length, 0);
});

test('ignores bots, talk pages and unwatched wikis', () => {
  const tr = tracker();
  for (let i = 0; i < 20; i++) {
    tr.ingest(edit({ user: `b${i}`, bot: true }));
    tr.ingest(edit({ user: `t${i}`, namespace: 1 }));
    tr.ingest(edit({ user: `c${i}`, wiki: 'commonswiki' }));
  }
  assert.equal(tr.pages.size, 0);
});

test('flags a new article that fills up quickly', () => {
  const tr = tracker();
  tr.ingest(edit({ title: '2026 Hualien earthquake', type: 'new', user: 'a', t: T0 }));
  for (let i = 1; i < 9; i++) tr.ingest(edit({ title: '2026 Hualien earthquake', user: `u${i % 4}`, t: T0 + i * 60_000 }));
  const [s] = tr.surges();
  assert.equal(s.kind, 'new-article');
  assert.equal(severityForSurge(s), 'high');
});

test('flags protection after an edit rush', () => {
  const tr = tracker();
  for (let i = 0; i < 4; i++) tr.ingest(edit({ user: `u${i}`, t: T0 + i * 60_000 }));
  tr.ingest({ wiki: 'enwiki', title: 'Port of Odesa', type: 'log', log_type: 'protect', log_action: 'protect', namespace: 0, bot: false, timestamp: (T0 + 5 * 60_000) / 1000 });
  assert.equal(tr.surges()[0].kind, 'protected');
});

test('edits older than the window stop counting', () => {
  const tr = tracker(T0 + 90 * 60_000);
  for (let i = 0; i < 14; i++) tr.ingest(edit({ user: `u${i % 6}`, t: T0 + i * 60_000 }));
  assert.equal(tr.surges().length, 0);
  tr.sweep(false);
  assert.equal(tr.pages.size, 0);
});

test('classifyArticle keeps located or event-like articles and drops sport/entertainment', () => {
  assert.equal(classifyArticle({ title: 'Port of Odesa' }, { coordinates: { lat: 46.5, lon: 30.7 }, description: 'seaport in Ukraine' }).keep, true);
  assert.equal(classifyArticle({ title: '2026 Kerch Bridge explosion' }, { coordinates: null, description: '' }).keep, true);
  assert.equal(classifyArticle({ title: 'Jane Doe' }, { coordinates: null, description: 'American singer' }).keep, false);
  assert.equal(classifyArticle({ title: 'Wembley Stadium' }, { coordinates: { lat: 51.5, lon: -0.28 }, description: 'football stadium hosting the cup final' }).keep, false);
  assert.equal(classifyArticle({ title: 'Some Person' }, { coordinates: null, description: 'British politician' }).keep, false);
});

test('parseSseChunk returns complete data payloads and keeps the remainder', () => {
  const { events, rest } = parseSseChunk('event: message\nid: 1\ndata: {"a":1}\n\n:ok\n\nevent: message\ndata: {"b"');
  assert.deepEqual(events, ['{"a":1}']);
  assert.equal(rest, 'event: message\ndata: {"b"');
});
