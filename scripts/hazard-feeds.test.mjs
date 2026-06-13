#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeNifcFeature,
  buildNifcQueryUrl,
} from '../src/lib/nifc-fire-perimeters.mjs';
import {
  parseSpcStormReportsCsv,
  normalizeSpcStormReport,
} from '../src/lib/spc-storm-reports.mjs';

test('normalizeNifcFeature maps WFIGS ArcGIS features to BEACON fire perimeters', () => {
  const feature = normalizeNifcFeature({
    attributes: {
      OBJECTID: 123,
      poly_IncidentName: 'South Fork',
      poly_GISAcres: 32818,
      poly_DateCurrent: 1781328493000,
      attr_IncidentSize: 28878,
      attr_PercentContained: 45,
      attr_FireDiscoveryDateTime: 1781044938000,
      attr_POOCounty: 'Sioux',
      attr_POOState: 'US-NE',
      attr_FireCause: 'Natural',
    },
    centroid: { x: -103.54129, y: 42.69073 },
  });

  assert.deepEqual(feature, {
    id: 'nifc-123',
    name: 'South Fork',
    lat: 42.69073,
    lng: -103.54129,
    acres: 32818,
    incidentSize: 28878,
    containment: 45,
    county: 'Sioux',
    state: 'US-NE',
    cause: 'Natural',
    discoveredAt: '2026-06-09T22:42:18.000Z',
    updatedAt: '2026-06-13T05:28:13.000Z',
    source: 'NIFC WFIGS',
    sourceUrl: 'https://data-nifc.opendata.arcgis.com/',
    status: 'active',
  });
});

test('buildNifcQueryUrl requests geometry centroids and recent perimeters', () => {
  const url = buildNifcQueryUrl({ limit: 25 });
  assert.match(url, /FeatureServer\/0\/query/);
  assert.match(url, /returnCentroid=true/);
  assert.match(url, /resultRecordCount=25/);
});

test('parseSpcStormReportsCsv handles sectioned SPC today CSV', () => {
  const csv = [
    'Time,F_Scale,Location,County,State,Lat,Lon,Comments',
    '2237,UNK,3 S Sisemore,Lonoke,AR,34.73,-91.84,[Landspout] Broadcast media shared picture. (LZK)',
    'Time,Speed,Location,County,State,Lat,Lon,Comments',
    '1215,UNK,2 W De Queen,Sevier,AR,34.04,-94.38,Tree blocking US 70. (SHV)',
    'Time,Size,Location,County,State,Lat,Lon,Comments',
    '1300,1.75,Monroe,Monroe,MI,41.92,-83.40,Quarter hail reported. (DTX)',
  ].join('\n');

  const reports = parseSpcStormReportsCsv(csv, 'today', new Date('2026-06-13T12:00:00Z'));

  assert.equal(reports.length, 3);
  assert.equal(reports[0].type, 'tornado');
  assert.equal(reports[1].type, 'wind');
  assert.equal(reports[2].type, 'hail');
  assert.equal(reports[2].magnitude, '1.75');
  assert.equal(reports[2].reportedAt, '2026-06-13T13:00:00.000Z');
});

test('normalizeSpcStormReport creates stable ids and severity', () => {
  const report = normalizeSpcStormReport({
    type: 'wind',
    row: {
      Time: '1215',
      Speed: '65',
      Location: '2 W De Queen',
      County: 'Sevier',
      State: 'AR',
      Lat: '34.04',
      Lon: '-94.38',
      Comments: 'Measured wind gust. (SHV)',
    },
    day: 'today',
    now: new Date('2026-06-13T12:00:00Z'),
  });

  assert.equal(report.id, 'spc-today-wind-1215-34.04--94.38');
  assert.equal(report.severity, 'high');
  assert.equal(report.source, 'NOAA SPC');
});
