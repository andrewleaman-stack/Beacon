#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNwsTsunamiAlerts, parseNwsTsunamiFeature } from '../src/lib/nws-tsunami.mjs';

test('parseNwsTsunamiAlerts parses GeoJSON FeatureCollection', () => {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'urn:oid:2.49.0.1.840.0.1.101.2.3.4.5',
        properties: {
          '@id': 'urn:oid:2.49.0.1.840.0.1.101.2.3.4.5',
          event: 'Tsunami Warning',
          severity: 'Severe',
          certainty: 'Observed',
          urgency: 'Immediate',
          areaDesc: 'Pacific Coast; Hawaii',
          geocode: { UGC: ['HIZ001', 'HIZ002'] },
          onset: '2026-06-13T20:00:00+00:00',
          expires: '2026-06-13T22:00:00+00:00',
          sent: '2026-06-13T19:55:00+00:00',
          status: 'Actual',
          messageType: 'Alert',
          category: 'Geo',
          description: 'Tsunami waves expected...',
          instruction: 'Move to high ground...',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-155.0, 19.0], [-155.0, 20.0], [-154.0, 20.0], [-154.0, 19.0], [-155.0, 19.0]
          ]],
        },
      },
    ],
  };

  const alerts = parseNwsTsunamiAlerts(JSON.stringify(geojson));
  assert.equal(alerts.length, 1);
  const a = alerts[0];
  assert.equal(a.event, 'Tsunami Warning');
  assert.equal(a.severity, 'Severe');
  assert.equal(a.areas, 'Pacific Coast; Hawaii');
  assert.ok(a.lat !== null && a.lng !== null);
  assert.equal(a.source, 'NWS CAP');
});

test('parseNwsTsunamiFeature handles Point geometry', () => {
  const feature = {
    properties: {
      event: 'Tsunami Watch',
      severity: 'Moderate',
      areaDesc: 'California Coast',
    },
    geometry: {
      type: 'Point',
      coordinates: [-122.4, 37.7],
    },
  };

  const alert = parseNwsTsunamiFeature(feature);
  assert.equal(alert.lat, 37.7);
  assert.equal(alert.lng, -122.4);
});
