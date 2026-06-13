#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseFirmsCsv,
  normalizeFirmsRecord,
} from '../src/lib/firms.mjs';

import {
  normalizeKevCatalog,
  normalizeOsvVulnerability,
  sortCvesByPriority,
} from '../src/lib/cyber-cve.mjs';

test('parseFirmsCsv parses quoted CSV rows and normalizes FIRMS records', () => {
  const csv = [
    'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
    '41.901,-83.397,342.1,0.45,0.39,2026-06-13,0530,N20,VIIRS,n,2.0NRT,288.2,18.7,N',
    '34.0522,-118.2437,360.4,0.52,0.41,2026-06-13,1430,"Suomi-NPP",VIIRS,h,2.0NRT,295.5,45.2,D',
  ].join('\n');

  const records = parseFirmsCsv(csv, 'VIIRS_NOAA20_NRT');

  assert.equal(records.length, 2);
  assert.deepEqual(records[0], {
    id: 'firms-VIIRS_NOAA20_NRT-41.901--83.397-2026-06-13-0530',
    lat: 41.901,
    lng: -83.397,
    brightness: 342.1,
    scan: 0.45,
    track: 0.39,
    acq_date: '2026-06-13',
    acq_time: '0530',
    satellite: 'NOAA-20',
    instrument: 'VIIRS',
    confidence: 'nominal',
    version: '2.0NRT',
    bright_t31: 288.2,
    frp: 18.7,
    daynight: 'N',
    source: 'VIIRS_NOAA20_NRT',
    timestamp: '2026-06-13T05:30:00.000Z',
  });
});

test('normalizeFirmsRecord supports MODIS brightness/confidence fields', () => {
  const record = normalizeFirmsRecord({
    latitude: '45.1',
    longitude: '-122.6',
    brightness: '331.2',
    scan: '1.1',
    track: '1.0',
    acq_date: '2026-06-13',
    acq_time: '915',
    satellite: 'Terra',
    instrument: 'MODIS',
    confidence: '82',
    version: '6.1NRT',
    bright_t31: '289.7',
    frp: '27.3',
    daynight: 'D',
  }, 'MODIS_NRT');

  assert.equal(record.brightness, 331.2);
  assert.equal(record.confidence, 'high');
  assert.equal(record.acq_time, '0915');
  assert.equal(record.timestamp, '2026-06-13T09:15:00.000Z');
});

test('normalizeKevCatalog emits exploited CVEs with due dates and source metadata', () => {
  const cves = normalizeKevCatalog({
    catalogVersion: '2026.06.13',
    dateReleased: '2026-06-13T00:00:00Z',
    vulnerabilities: [{
      cveID: 'CVE-2026-1234',
      vendorProject: 'ExampleCorp',
      product: 'Widget',
      vulnerabilityName: 'Example Widget RCE',
      dateAdded: '2026-06-12',
      shortDescription: 'Remote code execution in Widget.',
      requiredAction: 'Apply mitigations.',
      dueDate: '2026-07-03',
      knownRansomwareCampaignUse: 'Known',
      notes: 'https://example.test/advisory',
      cwes: ['CWE-787'],
    }],
  });

  assert.equal(cves.length, 1);
  assert.deepEqual(cves[0], {
    id: 'CVE-2026-1234',
    cve: 'CVE-2026-1234',
    title: 'Example Widget RCE',
    description: 'Remote code execution in Widget.',
    severity: 'critical',
    priority: 100,
    exploited: true,
    ransomwareUse: 'Known',
    vendor: 'ExampleCorp',
    product: 'Widget',
    published: '2026-06-12',
    dueDate: '2026-07-03',
    source: 'CISA KEV',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    references: ['https://example.test/advisory'],
    cwes: ['CWE-787'],
  });
});

test('normalizeOsvVulnerability extracts CVE aliases and severity priority', () => {
  const cve = normalizeOsvVulnerability({
    id: 'GHSA-abcd-1234',
    aliases: ['CVE-2026-9999'],
    summary: 'Package takeover',
    details: 'A package can be hijacked.',
    modified: '2026-06-13T01:02:03Z',
    published: '2026-06-10T00:00:00Z',
    severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }],
    affected: [{ package: { ecosystem: 'npm', name: 'left-pad-but-worse' } }],
    references: [{ url: 'https://osv.dev/vulnerability/GHSA-abcd-1234' }],
  });

  assert.equal(cve.cve, 'CVE-2026-9999');
  assert.equal(cve.severity, 'critical');
  assert.equal(cve.priority, 90);
  assert.equal(cve.vendor, 'npm');
  assert.equal(cve.product, 'left-pad-but-worse');
  assert.equal(cve.source, 'OSV');
});

test('sortCvesByPriority orders exploited and high severity records first', () => {
  const sorted = sortCvesByPriority([
    { id: 'low', priority: 20, published: '2026-06-12' },
    { id: 'kev', priority: 100, published: '2026-06-01' },
    { id: 'high', priority: 70, published: '2026-06-13' },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['kev', 'high', 'low']);
});
