#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { gibsDate, refreshToken, trueColorTiles, liveCloudTiles, LIVE_CLOUD_LAYERS } from '../src/lib/nasa-imagery.mjs';

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
