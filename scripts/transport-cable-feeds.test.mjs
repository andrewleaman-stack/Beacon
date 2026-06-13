#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePhmsaIncident } from '../src/lib/phmsa-incidents.mjs';
import { normalizeFraRailIncident } from '../src/lib/fra-rail-incidents.mjs';
import { normalizeSubmarineCableFault } from '../src/lib/submarine-cable-faults.mjs';

test('normalizePhmsaIncident maps DOT/PHMSA incident rows', () => {
  const incident = normalizePhmsaIncident({
    incident_number: '20260001',
    incident_date: '2026-05-01T12:00:00',
    state: 'MI',
    county: 'MONROE',
    operator_name: 'Example Pipeline Co',
    commodity_released: 'Natural Gas',
    cause: 'Equipment Failure',
    fatalities: '0',
    injuries: '1',
    total_property_damage: '$125,000',
    latitude: '41.9164',
    longitude: '-83.3977',
  });

  assert.equal(incident.id, 'phmsa-20260001');
  assert.equal(incident.type, 'pipeline');
  assert.equal(incident.state, 'MI');
  assert.equal(incident.propertyDamage, 125000);
  assert.equal(incident.severity, 'high');
  assert.equal(incident.mappable, true);
});

test('normalizeFraRailIncident maps FRA Form 54 rows', () => {
  const incident = normalizeFraRailIncident({
    report_number: 'FRA-1',
    accident_date: '2026-03-31',
    state: 'MI',
    railroad_name: 'Example Rail',
    accident_type: 'Derailment',
    total_injured: '0',
    total_killed: '0',
    total_damage: '300000',
    latitude: '42.3314',
    longitude: '-83.0458',
  });

  assert.equal(incident.id, 'fra-FRA-1');
  assert.equal(incident.type, 'rail');
  assert.equal(incident.accidentType, 'Derailment');
  assert.equal(incident.severity, 'high');
  assert.equal(incident.mappable, true);
});

test('normalizeSubmarineCableFault extracts cable names and severity from GDELT articles', () => {
  const fault = normalizeSubmarineCableFault({
    title: 'AAE-1 and SEAMEWE-5 submarine cable cuts disrupt service',
    url: 'https://example.com/cable-cut',
    domain: 'example.com',
    language: 'English',
    seendate: '20260613T120000Z',
  });

  assert.equal(fault.type, 'submarine_cable_fault');
  assert.deepEqual(fault.cables, ['AAE-1', 'SEAMEWE-5']);
  assert.equal(fault.severity, 'high');
  assert.equal(fault.url, 'https://example.com/cable-cut');
});
