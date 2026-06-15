#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  appendBriefing,
  readBriefings,
  briefingId,
} from '../src/lib/briefing-log.mjs';

async function tmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'beacon-briefs-test-'));
}

test('briefingId is stable and 8 chars', () => {
  const a = briefingId({ briefing: 'x', timestamp: 't', role: 'analyst', mode: 'standard' });
  const b = briefingId({ briefing: 'x', timestamp: 't', role: 'analyst', mode: 'standard' });
  assert.equal(a, b);
  assert.equal(a.length, 8);
  assert.notEqual(a, briefingId({ briefing: 'y', timestamp: 't', role: 'analyst', mode: 'standard' }));
});

test('readBriefings returns [] when nothing logged', async () => {
  const dir = await tmpDir();
  assert.deepEqual(await readBriefings({ dir }), []);
});

test('appendBriefing writes a record with an id and round-trips via readBriefings', async () => {
  const dir = await tmpDir();
  const rec = await appendBriefing({ role: 'analyst', mode: 'standard', briefing: 'hello', translated: false }, { dir });
  assert.equal(rec.briefing, 'hello');
  assert.equal(rec.translated, false);
  assert.match(rec.id, /^[0-9a-f]{8}$/);
  assert.ok(rec.timestamp);

  const all = await readBriefings({ dir });
  assert.equal(all.length, 1);
  assert.equal(all[0].id, rec.id);
  assert.equal(all[0].briefing, 'hello');
});

test('readBriefings returns newest-first and honors limit/offset', async () => {
  const dir = await tmpDir();
  for (const n of [1, 2, 3]) {
    await appendBriefing({ role: 'analyst', mode: 'standard', briefing: `b${n}`, timestamp: `2026-01-0${n}T00:00:00Z` }, { dir });
  }
  const newestFirst = await readBriefings({ dir });
  assert.deepEqual(newestFirst.map((e) => e.briefing), ['b3', 'b2', 'b1']);

  const paged = await readBriefings({ dir, limit: 1, offset: 1 });
  assert.deepEqual(paged.map((e) => e.briefing), ['b2']);
});

test('appendBriefing enforces the retention limit', async () => {
  const dir = await tmpDir();
  for (let n = 0; n < 7; n += 1) {
    await appendBriefing({ role: 'analyst', mode: 'standard', briefing: `r${n}`, timestamp: `2026-02-0${n + 1}T00:00:00Z` }, { dir, retention: 3 });
  }
  const kept = await readBriefings({ dir, limit: 100 });
  assert.equal(kept.length, 3);
  // The three most recent survive (r6, r5, r4), oldest are trimmed.
  assert.deepEqual(kept.map((e) => e.briefing), ['r6', 'r5', 'r4']);
});

test('malformed lines are skipped, not fatal', async () => {
  const dir = await tmpDir();
  await appendBriefing({ role: 'analyst', mode: 'standard', briefing: 'good' }, { dir });
  await fs.appendFile(path.join(dir, 'briefs.log'), 'not json\n', 'utf8');
  const all = await readBriefings({ dir });
  assert.equal(all.length, 1);
  assert.equal(all[0].briefing, 'good');
});
