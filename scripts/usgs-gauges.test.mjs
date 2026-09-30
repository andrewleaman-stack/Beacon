#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRdbStations,
  normalizeUsgsRealtime,
  groupReadingsBySite,
} from '../src/lib/usgs-stream-gauges.mjs';

test('parseRdbStations parses RDB format and filters by state', () => {
  const rdb = `agency_cd\tsite_no\tstation_nm\tsite_tp_cd\tdec_lat_va\tdec_long_va\tcoord_acy_cd\tdec_coord_datum_cd\talt_va\talt_acy_va\talt_datum_cd\thuc_cd\tstate_cd\tcounty_cd
USGS\t04166000\tHURON RIVER AT MILAN, MI\tST\t42.1333\t-83.6833\t1\tNAD83\t200\t10\tNAVD88\t040800000101\tMI\t161
USGS\t04166500\tRIVER ROUGE AT DETROIT, MI\tST\t42.3314\t-83.0458\t1\tNAD83\t200\t10\tNAVD88\t040900000101\tMI\t163
USGS\t04167000\tCLINTON RIVER AT MOUNT CLEMENS, MI\tST\t42.5928\t-82.8763\t1\tNAD83\t200\t10\tNAVD88\t040800000101\tMI\t099
`;

  const stations = parseRdbStations(rdb, 'MI');

  assert.equal(stations.length, 3);
  assert.deepEqual(stations[0], {
    id: 'usgs-gauge-04166000',
    name: 'HURON RIVER AT MILAN, MI',
    siteId: '04166000',
    lat: 42.1333,
    lng: -83.6833,
    state: 'MI',
    county: '161',
    huc: '040800000101',
    siteType: 'ST',
    agency: 'USGS',
    source: 'USGS Water Services (nwis/site RDB)',
    sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/04166000',
    fetchedAt: stations[0].fetchedAt,
  });
});

test('parseRdbStations filters by state', () => {
  const rdb = `agency_cd\tsite_no\tstation_nm\tsite_tp_cd\tdec_lat_va\tdec_long_va\tcoord_acy_cd\tdec_coord_datum_cd\talt_va\talt_acy_va\talt_datum_cd\thuc_cd\tstate_cd\tcounty_cd
USGS\t04166000\tHURON RIVER AT MILAN, MI\tST\t42.1333\t-83.6833\t1\tNAD83\t200\t10\tNAVD88\t040800000101\tMI\t161
USGS\t04166500\tRIVER ROUGE AT DETROIT, MI\tST\t42.3314\t-83.0458\t1\tNAD83\t200\t10\tNAVD88\t040900000101\tMI\t163
USGS\t04167000\tOHIO RIVER AT CINCINNATI, OH\tST\t39.1031\t-84.5120\t1\tNAD83\t200\t10\tNAVD88\t050900000101\tOH\t001
`;

  const miStations = parseRdbStations(rdb, 'MI');
  const ohStations = parseRdbStations(rdb, 'OH');

  assert.equal(miStations.length, 2);
  assert.equal(ohStations.length, 1);
  assert.equal(miStations[0].state, 'MI');
  assert.equal(ohStations[0].state, 'OH');
});

test('parseRdbStations uses requested state when RDB omits state_cd', () => {
  const rdb = `agency_cd\tsite_no\tstation_nm\tsite_tp_cd\tdec_lat_va\tdec_long_va\tcoord_acy_cd\tdec_coord_datum_cd\talt_va\talt_acy_va\talt_datum_cd\thuc_cd\tcounty_cd
USGS\t04166000\tHURON RIVER AT MILAN, MI\tST\t42.1333\t-83.6833\t1\tNAD83\t200\t10\tNAVD88\t040800000101\t161
`;

  const stations = parseRdbStations(rdb, 'MI');

  assert.equal(stations.length, 1);
  assert.equal(stations[0].state, 'MI');
});

test('normalizeUsgsRealtime maps WaterServices time series to BEACON readings', () => {
  const feature = {
    properties: {
      sourceInfo: {
        siteCode: [{ value: '04166000', network: 'NWIS', agencyCode: 'USGS' }],
        siteName: 'HURON RIVER AT MILAN, MI',
        geoLocation: {
          geogLocation: { latitude: 42.1333, longitude: -83.6833 },
        },
      },
      variable: {
        variableCode: [{ value: '00060' }],
        variableName: 'Discharge, cubic feet per second',
        unit: { unitCode: 'ft3/s' },
      },
      values: [{
        value: [
          { value: '125.5', dateTime: '2026-06-13T10:00:00.000-04:00' },
        ],
      }],
    },
  };

  const reading = normalizeUsgsRealtime(feature);

  assert.equal(reading.siteId, '04166000');
  assert.equal(reading.parameterCode, '00060');
  assert.equal(reading.parameterName, 'Discharge, cubic feet per second');
  assert.equal(reading.value, 125.5);
  assert.equal(reading.unit, 'ft3/s');
  assert.equal(reading.time, '2026-06-13T10:00:00.000-04:00');
  assert.equal(reading.lat, 42.1333);
  assert.equal(reading.lng, -83.6833);
  assert.equal(reading.source, 'USGS Realtime (IV)');
  assert.ok(reading.sourceUrl.includes('04166000'));
});

test('normalizeUsgsRealtime reads the top-level WaterServices time-series shape', () => {
  const series = {
    sourceInfo: {
      siteName: 'HURON RIVER AT MILAN, MI',
      siteCode: [{ value: '04166000' }],
      geoLocation: { geogLocation: { latitude: 42.1333, longitude: -83.6833 } },
    },
    variable: { variableCode: [{ value: '00065' }], variableName: 'Gage height, ft', unit: { unitCode: 'ft' } },
    values: [{ value: [{ value: '4.21', dateTime: '2026-09-30T18:00:00.000-04:00' }] }],
  };
  const r = normalizeUsgsRealtime(series);
  assert.equal(r.siteId, '04166000');
  assert.equal(r.siteName, 'HURON RIVER AT MILAN, MI');
  assert.equal(r.value, 4.21);
});

test('groupReadingsBySite builds one gauge per site with height and flow, flood stage unknown', () => {
  const base = { siteId: '04166000', siteName: 'HURON RIVER AT MILAN, MI', lat: 42.13, lng: -83.68, sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/04166000' };
  const gauges = groupReadingsBySite([
    { ...base, parameterCode: '00060', value: 310, time: '2026-09-30T22:00:00Z' },
    { ...base, parameterCode: '00065', value: 4.2, time: '2026-09-30T22:15:00Z' },
  ], 'MI');
  assert.equal(gauges.length, 1);
  assert.equal(gauges[0].dischargeCfs, 310);
  assert.equal(gauges[0].gageHeightFt, 4.2);
  assert.equal(gauges[0].latestReading.parameterCode, '00065');
  assert.equal(gauges[0].floodStage, null);
});
