#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, crc32 } from 'node:zlib';

import { unzipFirstEntry, parseGdeltExport, exportUrlsFrom } from '../src/lib/gdelt-events.mjs';

function makeZip(name, content) {
  const data = Buffer.from(content);
  const deflated = deflateRawSync(data);
  const nameBuf = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(deflated.length, 18); local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(deflated.length, 20); central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28); central.writeUInt32LE(0, 42);
  const cdOffset = local.length + nameBuf.length + deflated.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + nameBuf.length, 12); eocd.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([local, nameBuf, deflated, central, nameBuf, eocd]);
}

// Build a 61-column GDELT export row.
function row({ id = '1', date = '20260930', isRoot = '1', code = '145', root = '14', geoType = '4', place = 'Tbilisi, Tbilisi, Georgia', country = 'GG', lat = '41.725', lng = '44.7908', mentions = '4', sources = '2', url = 'https://example.org/a' } = {}) {
  const c = new Array(61).fill('');
  c[0] = id; c[1] = date; c[25] = isRoot; c[26] = code; c[27] = code; c[28] = root; c[29] = '3';
  c[30] = '-6.5'; c[31] = mentions; c[32] = sources; c[33] = mentions; c[34] = '-3.1';
  c[51] = geoType; c[52] = place; c[53] = country; c[56] = lat; c[57] = lng;
  c[59] = '20260930220000'; c[60] = url;
  return c.join('\t');
}

const NOW = new Date('2026-09-30T22:10:00Z');

test('unzipFirstEntry inflates a single-file export archive', () => {
  const zip = makeZip('20260930220000.export.CSV', 'hello\tgdelt\n');
  assert.equal(unzipFirstEntry(zip).toString('utf8'), 'hello\tgdelt\n');
});

test('unzipFirstEntry rejects non-zip input', () => {
  assert.throws(() => unzipFirstEntry(Buffer.from('not a zip at all, just some text padding')), /Not a ZIP/);
});

test('parseGdeltExport keeps specific, recent, city-level root events', () => {
  const events = parseGdeltExport(row(), { now: NOW });
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'Protest — Tbilisi, Tbilisi, Georgia');
  assert.equal(events[0].type, 'unrest');
  assert.equal(events[0].lat, 41.725);
  assert.equal(events[0].reportedAt, '2026-09-30T22:00:00Z');
});

test('parseGdeltExport drops noisy, vague, stale and non-root rows', () => {
  const text = [
    row({ code: '190', root: '19' }),            // generic military force
    row({ geoType: '1' }),                       // country centroid
    row({ geoType: '2' }),                       // US state
    row({ isRoot: '0' }),                        // passing mention
    row({ date: '20250930' }),                   // a year-old event re-mentioned
    row({ code: '040', root: '04' }),            // consultation, not an incident
  ].join('\n');
  assert.equal(parseGdeltExport(text, { now: NOW }).length, 0);
});

test('parseGdeltExport merges reports of one incident and keeps the most-cited URL', () => {
  const text = [
    row({ id: '1', mentions: '2', sources: '1', url: 'https://a.example/1' }),
    row({ id: '2', mentions: '9', sources: '3', url: 'https://b.example/2' }),
  ].join('\n');
  const [event] = parseGdeltExport(text, { now: NOW });
  assert.equal(event.count, 11);
  assert.equal(event.sources, 4);
  assert.equal(event.url, 'https://b.example/2');
});

test('exportUrlsFrom walks back in 15-minute steps over HTTPS', () => {
  const urls = exportUrlsFrom('78749 abc http://data.gdeltproject.org/gdeltv2/20260930220000.export.CSV.zip\n', 3);
  assert.deepEqual(urls, [
    'https://data.gdeltproject.org/gdeltv2/20260930220000.export.CSV.zip',
    'https://data.gdeltproject.org/gdeltv2/20260930214500.export.CSV.zip',
    'https://data.gdeltproject.org/gdeltv2/20260930213000.export.CSV.zip',
  ]);
});
