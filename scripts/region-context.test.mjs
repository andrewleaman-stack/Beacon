#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseWorldBankIndicators, parseLocalSun, fetchWorldBankIndicators, parseWorldBankCountry, flagEmoji } from '../src/lib/region-context.mjs';

test('parseWorldBankIndicators keeps labelled latest values and skips nulls', () => {
  const payload = [
    { page: 1, total: 3 },
    [
      { indicator: { id: 'NY.GDP.PCAP.CD' }, date: '2025', value: 5865.88 },
      { indicator: { id: 'FP.CPI.TOTL.ZG' }, date: '2025', value: 12.73 },
      { indicator: { id: 'SL.UEM.TOTL.ZS' }, date: '2021', value: null },
    ],
  ];
  const out = parseWorldBankIndicators(payload);
  assert.deepEqual(out.map((i) => i.key), ['gdpPerCapita', 'inflation']);
  assert.equal(out[0].year, 2025);
  assert.equal(out[1].unit, 'pct');
});

test('parseWorldBankIndicators tolerates error payloads', () => {
  assert.deepEqual(parseWorldBankIndicators([{ message: [{ id: '120' }] }]), []);
  assert.deepEqual(parseWorldBankIndicators(null), []);
});

test('fetchWorldBankIndicators ignores invalid country codes without calling out', async () => {
  let called = false;
  const out = await fetchWorldBankIndicators('USA; DROP', { fetchImpl: async () => { called = true; } });
  assert.deepEqual(out, []);
  assert.equal(called, false);
});

test('parseLocalSun extracts time zone and sun times', () => {
  const sun = parseLocalSun({
    utc_offset_seconds: 10800, timezone: 'Europe/Kyiv', timezone_abbreviation: 'GMT+3',
    current: { is_day: 0 }, daily: { sunrise: ['2026-10-01T06:57'], sunset: ['2026-10-01T18:36'] },
  });
  assert.equal(sun.timezone, 'Europe/Kyiv');
  assert.equal(sun.utcOffsetSeconds, 10800);
  assert.equal(sun.isDay, false);
  assert.equal(sun.sunrise, '2026-10-01T06:57');
});

test('parseLocalSun returns null for unusable payloads', () => {
  assert.equal(parseLocalSun({ error: true, reason: 'bad' }), null);
});

test('parseWorldBankCountry maps name, capital, region and income level', () => {
  const payload = [{ page: 1 }, [{ id: 'PER', iso2Code: 'PE', name: 'Peru', region: { value: 'Latin America & Caribbean ' }, incomeLevel: { value: 'Upper middle income' }, capitalCity: 'Lima' }]];
  assert.deepEqual(parseWorldBankCountry(payload), {
    name: 'Peru', iso2: 'PE', iso3: 'PER', capital: 'Lima', region: 'Latin America & Caribbean', incomeLevel: 'Upper middle income',
  });
  assert.equal(parseWorldBankCountry([{ message: [] }]), null);
});

test('flagEmoji builds regional-indicator flags and rejects junk', () => {
  assert.equal(flagEmoji('pe'), '🇵🇪');
  assert.equal(flagEmoji('PER'), '');
});

test('parseWorldBankIndicators marks population and area as summary figures', () => {
  const out = parseWorldBankIndicators([{}, [{ indicator: { id: 'SP.POP.TOTL' }, date: '2025', value: 34576665 }]]);
  assert.equal(out[0].key, 'population');
  assert.equal(out[0].summary, true);
});
