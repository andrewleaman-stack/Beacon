#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { gibsDate, gibsTime, refreshToken, trueColorTiles, liveCloudTiles, describeDomainsUrl, parseDescribeDomains, LIVE_CLOUD_LAYERS } from '../src/lib/nasa-imagery.mjs';

const NOW = new Date('2026-10-01T00:30:00Z');

test('gibsDate uses the previous UTC day', () => {
  assert.equal(gibsDate(NOW), '2026-09-30');
});

test('trueColorTiles builds a dated VIIRS WMTS template', () => {
  assert.equal(
    trueColorTiles(NOW)[0],
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-09-30/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
  );
});

test('refreshToken changes every 10 minutes and not within one', () => {
  assert.equal(refreshToken(new Date('2026-10-01T00:30:00Z')), refreshToken(new Date('2026-10-01T00:39:59Z')));
  assert.notEqual(refreshToken(new Date('2026-10-01T00:39:59Z')), refreshToken(new Date('2026-10-01T00:40:00Z')));
});

test('liveCloudTiles requests the newest time for each geostationary layer', () => {
  for (const def of LIVE_CLOUD_LAYERS) {
    const [url] = liveCloudTiles(def, NOW);
    assert.match(url, new RegExp(`/${def.layer}/default/default/${def.matrix}/\\{z\\}/\\{y\\}/\\{x\\}\\.png\\?t=\\d+$`));
  }
});

test('live clouds use infrared, which GIBS keeps publishing overnight', () => {
  for (const def of LIVE_CLOUD_LAYERS) assert.match(def.layer, /Band13_Clean_Infrared$/);
});

test('liveCloudTiles requests an exact frame when given a time', () => {
  const t = Date.parse('2026-10-21T03:40:00Z');
  const [url] = liveCloudTiles(LIVE_CLOUD_LAYERS[1], NOW, t);
  assert.equal(url, `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LIVE_CLOUD_LAYERS[1].layer}/default/2026-10-21T03:40:00Z/${LIVE_CLOUD_LAYERS[1].matrix}/{z}/{y}/{x}.png`);
  assert.equal(gibsTime(t), '2026-10-21T03:40:00Z');
});

test('describeDomainsUrl and parseDescribeDomains list a layer\'s frames', () => {
  const from = Date.parse('2026-10-21T01:00:00Z');
  const to = Date.parse('2026-10-21T04:00:00Z');
  assert.match(describeDomainsUrl(LIVE_CLOUD_LAYERS[0], from, to), /\/1\.0\.0\/GOES-West_ABI_Band13_Clean_Infrared\/default\/GoogleMapsCompatible_Level6\/all\/2026-10-21T01:00:00Z--2026-10-21T04:00:00Z\.xml$/);
  const xml = "<Domains xmlns:ows='http://www.opengis.net/ows/1.1'><DimensionDomain><ows:Identifier>time</ows:Identifier><Domain>2026-10-21T01:40:00Z/2026-10-21T02:00:00Z/PT10M,2026-10-21T03:50:00Z/2026-10-21T04:00:00Z/PT10M</Domain><Size>2</Size></DimensionDomain></Domains>";
  const times = parseDescribeDomains(xml, from, to);
  assert.deepEqual(times.map((t) => new Date(t).toISOString().slice(11, 16)), ['01:40', '01:50', '02:00', '03:50', '04:00']);
  assert.deepEqual(parseDescribeDomains('<Domains/>', from, to), []);
});
