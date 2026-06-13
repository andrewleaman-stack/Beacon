#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeNvdVulnerability,
  normalizeGhsaAdvisory,
  mergeCves,
} from '../src/lib/cyber-cve.mjs';
import {
  normalizeOpenSkyState,
  buildOpenSkyStatesUrl,
} from '../src/lib/opensky.mjs';
import {
  normalizeAisStreamMessage,
  parseAisBoundingBoxes,
} from '../src/lib/aisstream.mjs';

test('normalizeNvdVulnerability extracts CVSS severity and references', () => {
  const item = normalizeNvdVulnerability({
    cve: {
      id: 'CVE-2026-1111',
      published: '2026-06-01T00:00:00.000',
      lastModified: '2026-06-12T00:00:00.000',
      descriptions: [{ lang: 'en', value: 'A critical thing broke.' }],
      references: { referenceData: [{ url: 'https://example.test/cve' }] },
      weaknesses: [{ description: [{ lang: 'en', value: 'CWE-787' }] }],
      metrics: {
        cvssMetricV31: [{ cvssData: { baseScore: 9.8, baseSeverity: 'CRITICAL' } }],
      },
      configurations: [{ nodes: [{ cpeMatch: [{ criteria: 'cpe:2.3:a:example:widget:1.0:*:*:*:*:*:*:*' }] }] }],
    },
  });

  assert.equal(item.cve, 'CVE-2026-1111');
  assert.equal(item.severity, 'critical');
  assert.equal(item.priority, 90);
  assert.equal(item.vendor, 'example');
  assert.equal(item.product, 'widget');
  assert.deepEqual(item.references, ['https://example.test/cve']);
  assert.deepEqual(item.cwes, ['CWE-787']);
  assert.equal(item.source, 'NVD');
});

test('normalizeGhsaAdvisory normalizes GitHub global advisory shape', () => {
  const item = normalizeGhsaAdvisory({
    ghsa_id: 'GHSA-abcd-1234',
    cve_id: 'CVE-2026-2222',
    summary: 'Bad package bug',
    description: 'A dependency is unsafe.',
    severity: 'high',
    published_at: '2026-06-11T10:00:00Z',
    updated_at: '2026-06-12T10:00:00Z',
    html_url: 'https://github.com/advisories/GHSA-abcd-1234',
    vulnerabilities: [{ package: { ecosystem: 'npm', name: 'badpkg' } }],
    cwes: [{ cwe_id: 'CWE-79' }],
  });

  assert.equal(item.id, 'GHSA-abcd-1234');
  assert.equal(item.cve, 'CVE-2026-2222');
  assert.equal(item.severity, 'high');
  assert.equal(item.priority, 70);
  assert.equal(item.vendor, 'npm');
  assert.equal(item.product, 'badpkg');
  assert.equal(item.source, 'GHSA');
  assert.deepEqual(item.cwes, ['CWE-79']);
});

test('mergeCves preserves exploitation while enriching from NVD and GHSA', () => {
  const [merged] = mergeCves([
    { id: 'CVE-2026-3333', cve: 'CVE-2026-3333', source: 'CISA KEV', exploited: true, priority: 100, references: [], cwes: [] },
    { id: 'CVE-2026-3333', cve: 'CVE-2026-3333', source: 'NVD', exploited: false, priority: 90, severity: 'critical', references: ['https://nvd.test'], cwes: ['CWE-20'] },
  ]);

  assert.equal(merged.exploited, true);
  assert.equal(merged.priority, 100);
  assert.equal(merged.severity, 'critical');
  assert.equal(merged.source, 'CISA KEV + NVD');
  assert.deepEqual(merged.references, ['https://nvd.test']);
  assert.deepEqual(merged.cwes, ['CWE-20']);
});

test('normalizeOpenSkyState maps state vector arrays into BEACON flight records', () => {
  const flight = normalizeOpenSkyState([
    'abc123', 'TEST123 ', 'United States', 1710000000, 1710000005,
    -83.1, 41.9, 3000, false, 120, 270, 0, null, 3100, '1200', false, 0, 3,
  ], 1710000005);

  assert.equal(flight.callsign, 'TEST123');
  assert.equal(flight.icao24, 'abc123');
  assert.equal(flight.lat, 41.9);
  assert.equal(flight.lng, -83.1);
  assert.equal(flight.speed_knots, 233.3);
  assert.equal(flight.source, 'OpenSky');
});

test('buildOpenSkyStatesUrl encodes bbox parameters', () => {
  assert.equal(
    buildOpenSkyStatesUrl({ lamin: 40, lomin: -84, lamax: 43, lomax: -80 }),
    'https://opensky-network.org/api/states/all?extended=1&lamin=40&lomin=-84&lamax=43&lomax=-80',
  );
});

test('normalizeAisStreamMessage maps AISStream position reports', () => {
  const ship = normalizeAisStreamMessage({
    MessageType: 'PositionReport',
    MetaData: { MMSI: 366123456, ShipName: ' TEST VESSEL ', time_utc: '2026-06-13T08:00:00Z' },
    Message: { PositionReport: { Latitude: 41.8, Longitude: -83.2, Sog: 12.3, Cog: 95.1, TrueHeading: 96, NavigationalStatus: 0 } },
  });

  assert.equal(ship.mmsi, 366123456);
  assert.equal(ship.name, 'TEST VESSEL');
  assert.equal(ship.lat, 41.8);
  assert.equal(ship.lng, -83.2);
  assert.equal(ship.speed, 12.3);
  assert.equal(ship.source, 'AISStream');
});

test('parseAisBoundingBoxes uses Great Lakes default and custom JSON', () => {
  assert.ok(parseAisBoundingBoxes('').length >= 1);
  assert.deepEqual(parseAisBoundingBoxes('[[[40,-84],[43,-80]]]'), [[[40, -84], [43, -80]]]);
});
