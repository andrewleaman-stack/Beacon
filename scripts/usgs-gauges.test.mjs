#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeUsgsGauge,
  normalizeUsgsRealtime,
} from '../src/lib/usgs-stream-gauges.mjs';

test('normalizeUsgsGauge maps OGC API features to BEACON gauges', () => {
  const feature = {
    type: 'Feature',
    properties: {
      monitoring_location_id: 'USGS-04166000',
      monitoring_location_name: 'HURON RIVER AT MILAN, MI',
      state_code: '26',
      state_name: 'Michigan',
      county_name: 'Washtenaw County',
      site_type_code: 'ST',
      site_type: 'Stream',
      agency_code: 'USGS',
    },
    geometry: {
      type: 'Point',
      coordinates: [-83.6833, 42.1333],
    },
  };

  const gauge = normalizeUsgsGauge(feature);

  assert.deepEqual(gauge, {
    id: 'usgs-gauge-USGS-04166000',
    name: 'HURON RIVER AT MILAN, MI',
    siteId: 'USGS-04166000',
    lat: 42.1333,
    lng: -83.6833,
    state: '26',
    county: 'Washtenaw County',
    huc: '',
    siteType: 'ST',
    agency: 'USGS',
    source: 'USGS Water Services',
    sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/USGS-04166000',
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
