#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { regionOf, familyOf, buildHotspots, pickAuto } from '../src/lib/auto-lineup.mjs';

/** @param {string} id @param {string} name @param {string} country @param {string} region @param {number} lat @param {number} lng @param {object} [extra] */
const ch = (id, name, country, region, lat, lng, extra = {}) => ({ id, name, country, region, lat, lng, language: 'en', live: true, embed_allowed: true, ...extra });
const CHANNELS = [
  ch('aljazeera', 'Al Jazeera English', 'QA', 'Middle East', 25.29, 51.53),
  ch('aljazeeraarabic', 'Al Jazeera Arabic', 'QA', 'Middle East', 25.29, 51.53, { language: 'ar' }),
  ch('skynews', 'Sky News', 'GB', 'Europe', 51.5, -0.12),
  ch('gbnews', 'GB News', 'GB', 'Europe', 51.51, -0.13),
  ch('cbsnews', 'CBS News 24/7', 'US', 'Americas', 40.76, -73.97),
  ch('nhkworld', 'NHK World-Japan', 'JP', 'Asia-Pacific', 35.67, 139.7),
  ch('offair', 'Off Air TV', 'FR', 'Europe', 48.85, 2.35, { live: false }),
];

test('regions', () => {
  assert.equal(regionOf(40.7, -74), 'Americas');
  assert.equal(regionOf(31.5, 34.5), 'Middle East');
  assert.equal(regionOf(51.5, -0.1), 'Europe');
  assert.equal(regionOf(9.06, 7.49), 'Africa');
  assert.equal(regionOf(35.7, 139.7), 'Asia-Pacific');
});

test('network families', () => {
  assert.equal(familyOf('Al Jazeera English'), familyOf('Al Jazeera Mubasher'));
  assert.equal(familyOf('France 24 English'), familyOf('France 24 Arabic'));
  assert.notEqual(familyOf('Sky News'), familyOf('GB News'));
});

test('hotspots: city terms only, and one country cannot flood the list', () => {
  const g = Array.from({ length: 9 }, (_, i) => ({ lat: 12.97, lng: 77.59, place: 'Bengaluru, Karnataka, India', country: 'IN', count: 10, sources: 3, goldstein: -5, name: `e${i}` }));
  g.push({ lat: 31.77, lng: 35.21, place: 'Jerusalem, Israel', country: 'IS', count: 10, sources: 3, goldstein: -5 });
  const hs = buildHotspots({ gdelt: g });
  const india = hs.find((h) => h.label.includes('Bengaluru'));
  const jlm = hs.find((h) => h.label.includes('Jerusalem'));
  assert.deepEqual(india.terms, ['bengaluru']);
  assert.equal(india.label, 'News near Bengaluru, India');
  assert.ok(jlm.weight > india.weight, 'a lone country event outweighs each of nine from one country');
});

test('picks follow the news, one per network, only playable channels', () => {
  const hs = buildHotspots({ gdelt: [{ lat: 31.77, lng: 35.21, place: 'Jerusalem, Israel', country: 'IS', count: 40, sources: 8, goldstein: -8 }] });
  const picks = pickAuto(CHANNELS, hs, { count: 4 });
  assert.equal(picks[0].id, 'aljazeera');
  assert.ok(!picks.some((p) => p.id === 'aljazeeraarabic'), 'second Al Jazeera skipped');
  assert.ok(!picks.some((p) => p.id === 'offair'));
  assert.ok(picks.filter((p) => ['skynews', 'gbnews'].includes(p.id)).length <= 1, 'one per country on a 2×2');
});

test('a live title that names the place wins', () => {
  const hs = buildHotspots({ gdelt: [{ lat: 35.68, lng: 139.69, place: 'Tokyo, Japan', country: 'JA', count: 20, sources: 5 }] });
  const channels = CHANNELS.map((c) => (c.id === 'cbsnews' ? { ...c, live_title: 'LIVE: Tokyo earthquake coverage' } : c));
  const picks = pickAuto(channels, hs, { count: 2 });
  const cbs = picks.find((p) => p.id === 'cbsnews');
  assert.ok(cbs, 'CBS is picked for naming Tokyo');
  assert.match(cbs.reason, /^Covering Tokyo/);
});

test('channels still picked keep their screen', () => {
  const hs = buildHotspots({ gdelt: [{ lat: 51.5, lng: -0.1, place: 'London, United Kingdom', country: 'UK', count: 20, sources: 5 }] });
  const first = pickAuto(CHANNELS, hs, { count: 3 }).map((p) => p.id);
  const rotated = [first[2], first[0], first[1]];
  const again = pickAuto(CHANNELS, hs, { count: 3, previous: rotated }).map((p) => p.id);
  assert.deepEqual(again, rotated);
});
