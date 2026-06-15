#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  severityForFatalities,
  normalizeUcdpEvent,
  normalizeAcledEvent,
  fetchConflictEvents,
} from '../src/lib/conflict-events.mjs';

const UCDP_SAMPLE = {
  id: 12345,
  relid: 'UKR-2024-1',
  year: 2024,
  type_of_violence: 1,
  conflict_name: 'Russia - Ukraine',
  side_a: 'Government of Russia',
  side_b: 'Government of Ukraine',
  country: 'Ukraine',
  region: 'Europe',
  latitude: 48.5,
  longitude: 37.8,
  best: 23,
  date_start: '2024-03-01 00:00:00.000',
  date_end: '2024-03-01 00:00:00.000',
  source_article: 'Heavy shelling reported near the front.',
  where_coordinates: 'Donetsk',
};

const ACLED_SAMPLE = {
  event_id_cnty: 'SDN1234',
  event_date: '2024-05-01',
  event_type: 'Battles',
  sub_event_type: 'Armed clash',
  actor1: 'Military Forces',
  actor2: 'Rebel Group',
  country: 'Sudan',
  region: 'Eastern Africa',
  location: 'El Fasher',
  latitude: 13.6,
  longitude: 25.3,
  fatalities: 7,
  notes: 'Clashes between forces in the city.',
  source: 'Local media',
};

function fakeFetch(payloadByHost) {
  return async (url) => {
    const host = url.includes('ucdp') ? 'ucdp' : 'acled';
    const entry = payloadByHost[host];
    if (entry instanceof Error) throw entry;
    return { ok: entry.ok !== false, status: entry.status || 200, json: async () => entry.body };
  };
}

test('severityForFatalities buckets by count', () => {
  assert.equal(severityForFatalities(0), 'low');
  assert.equal(severityForFatalities(3), 'elevated');
  assert.equal(severityForFatalities(20), 'high');
  assert.equal(severityForFatalities(80), 'critical');
});

test('normalizeUcdpEvent maps a GED record to BEACON shape', () => {
  const e = normalizeUcdpEvent(UCDP_SAMPLE, new Date('2026-06-15T00:00:00Z'));
  assert.equal(e.id, 'ucdp-12345');
  assert.equal(e.source, 'UCDP GED');
  assert.equal(e.eventType, 'State-based conflict');
  assert.equal(e.title, 'Government of Russia vs Government of Ukraine — Ukraine');
  assert.equal(e.fatalities, 23);
  assert.equal(e.severity, 'high');
  assert.equal(e.lat, 48.5);
  assert.equal(e.lng, 37.8);
  assert.equal(e.date, '2024-03-01T00:00:00.000Z');
  assert.equal(e.fetchedAt, '2026-06-15T00:00:00.000Z');
});

test('normalizeAcledEvent maps an ACLED record to BEACON shape', () => {
  const e = normalizeAcledEvent(ACLED_SAMPLE, new Date('2026-06-15T00:00:00Z'));
  assert.equal(e.id, 'acled-SDN1234');
  assert.equal(e.source, 'ACLED');
  assert.equal(e.eventType, 'Battles');
  assert.equal(e.subType, 'Armed clash');
  assert.equal(e.title, 'Military Forces vs Rebel Group — El Fasher');
  assert.equal(e.fatalities, 7);
  assert.equal(e.severity, 'elevated');
  assert.equal(e.date, '2024-05-01T00:00:00.000Z');
});

test('non-fatal ACLED protest stays low severity', () => {
  const e = normalizeAcledEvent({ ...ACLED_SAMPLE, event_type: 'Protests', sub_event_type: 'Peaceful protest', fatalities: 0 });
  assert.equal(e.severity, 'low');
});

test('fetchConflictEvents returns empty + unconfigured when no credentials', async () => {
  const { events, configured, sources } = await fetchConflictEvents({
    fetchImpl: async () => { throw new Error('should not be called'); },
  });
  assert.deepEqual(events, []);
  assert.equal(configured.ucdp, false);
  assert.equal(configured.acled, false);
  assert.deepEqual(sources, []);
});

test('fetchConflictEvents merges both providers, newest-first, honors limit', async () => {
  const fetchImpl = fakeFetch({
    ucdp: { body: { Result: [UCDP_SAMPLE] } },
    acled: { body: { data: [ACLED_SAMPLE] } },
  });
  const all = await fetchConflictEvents({
    fetchImpl,
    ucdp: { token: 'T' },
    acled: { key: 'K', email: 'e@x.io' },
  });
  assert.equal(all.events.length, 2);
  // ACLED (2024-05) is newer than UCDP (2024-03)
  assert.equal(all.events[0].source, 'ACLED');
  assert.equal(all.events[1].source, 'UCDP GED');
  assert.deepEqual(all.sources.sort(), ['ACLED', 'UCDP GED']);

  const capped = await fetchConflictEvents({
    fetchImpl,
    limit: 1,
    ucdp: { token: 'T' },
    acled: { key: 'K', email: 'e@x.io' },
  });
  assert.equal(capped.events.length, 1);
  assert.equal(capped.events[0].source, 'ACLED');
});

test('one provider failing does not suppress the other', async () => {
  const fetchImpl = fakeFetch({
    ucdp: new Error('UCDP down'),
    acled: { body: { data: [ACLED_SAMPLE] } },
  });
  const result = await fetchConflictEvents({
    fetchImpl,
    ucdp: { token: 'T' },
    acled: { key: 'K', email: 'e@x.io' },
  });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].source, 'ACLED');
  assert.equal(result.sources.includes('ACLED'), true);
  assert.equal(result.errors.some((e) => e.startsWith('UCDP:')), true);
});
