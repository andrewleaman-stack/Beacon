#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseLivePage, mapLimit } from '../src/lib/live-resolve.mjs';
import { LIVE_CHANNELS, DEFAULT_WALL, REGIONS, LANGUAGE_NAMES } from '../src/lib/live-channels.mjs';

const CH = 'UCNye-wNBqNL5ZzHSJj3l8Bg';
const page = (extra) => `<html><link rel="canonical" href="https://www.youtube.com/watch?v=gCNeDWCI0vo"><script>{"channelId":"${CH}",${extra}}</script></html>`;

test('live, embeddable channel resolves to its current video', () => {
  assert.deepEqual(parseLivePage(page('"isLive":true,"playableInEmbed":true'), CH), { videoId: 'gCNeDWCI0vo', live: true, embeddable: true, title: null });
});

test('live but embedding blocked', () => {
  assert.deepEqual(parseLivePage(page('"isLive":true,"playableInEmbed":false'), CH), { videoId: 'gCNeDWCI0vo', live: true, embeddable: false, title: null });
});

test('a past video is not live and never embeddable', () => {
  assert.equal(parseLivePage(page('"playableInEmbed":true'), CH).live, false);
  assert.equal(parseLivePage(page('"playableInEmbed":true'), CH).embeddable, false);
});

test('offline channel page has no watch canonical', () => {
  const html = '<link rel="canonical" href="https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg">"isLive":true';
  assert.deepEqual(parseLivePage(html, CH), { videoId: null, live: false, embeddable: false, title: null });
});

test('a page owned by another channel is rejected', () => {
  assert.equal(parseLivePage(page('"isLive":true,"playableInEmbed":true'), 'UCaaaaaaaaaaaaaaaaaaaaaa').videoId, null);
});

test('garbage input is safe', () => {
  assert.equal(parseLivePage('', CH).videoId, null);
  assert.equal(parseLivePage(/** @type {any} */ (null), CH).videoId, null);
});

test('mapLimit keeps order, isolates failures and respects the limit', async () => {
  let inFlight = 0, peak = 0;
  const res = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
    inFlight++; peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    if (n === 3) throw new Error('boom');
    return n * 10;
  });
  assert.equal(peak, 2);
  assert.deepEqual(res.map((r) => r.status), ['fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  assert.equal(/** @type {any} */ (res[4]).value, 50);
});

test('channel catalog is consistent', () => {
  const ids = new Set();
  for (const c of LIVE_CHANNELS) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`); ids.add(c.id);
    assert.match(c.channelId, /^UC[\w-]{22}$/, c.name);
    assert.ok(REGIONS.includes(c.region), `${c.name} region`);
    assert.ok(LANGUAGE_NAMES[c.language], `${c.name} language`);
    assert.ok(Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180, `${c.name} coords`);
  }
  for (const id of DEFAULT_WALL) assert.ok(ids.has(id), `default wall ${id}`);
});

test('the live title is read and unescaped', () => {
  const html = page('"isLive":true,"playableInEmbed":true').replace('<script>', '<meta name="title" content="Strikes on Gaza &amp; Lebanon: LIVE"><script>');
  assert.equal(parseLivePage(html, CH).title, 'Strikes on Gaza & Lebanon: LIVE');
});
