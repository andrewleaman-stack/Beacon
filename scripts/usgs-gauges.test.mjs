#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeUsgsGauge,
  normalizeUsgsRealtime,
} from '../src/lib/usgs-stream-gauges.mjs';

test('normalizeUsgsGauge maps WaterServices features to BEACON gauges', () => {
  const feature = {
    type: 'Feature',
    properties: {
      sourceInfo: {
        siteCode: [{ value: '04166000', network: 'NWIS', agencyCode: 'USGS' }],
        siteName: 'HURON RIVER AT MILAN, MI',
        geoLocation: {
          geogLocation: { latitude: 42.1333, longitude: -83.6833 },
        },
        siteProperty: [
          { name: 'siteTypeCd', value: 'ST' },
          { name: 'stateCd', value: '26' },
          { name: 'countyCd', value: '161' },
          { name: 'hucCd', value: '040800000101' },
        ],
        agencyCode: 'USGS',
      },
    },
  };

  const gauge = normalizeUsgsGauge(feature);

  assert.deepEqual(gauge, {
    id: 'usgs-gauge-04166000',
    name: 'HURON RIVER AT MILAN, MI',
    siteId: '04166000',
    lat: 42.1333,
    lng: -83.6833,
    state: '26',
    county: '161',
    huc: '040800000101',
    siteType: 'ST',
    agency: 'USGS',
    source: 'USGS Water Services',
    sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/04166000',
    fetchedAt: gauge.fetchedAt,
  });
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
  assert.equal(reading.source, 'USGS Realtime');
  assert.ok(reading.sourceUrl.includes('04166000'));
});
