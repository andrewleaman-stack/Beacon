#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeFemaDeclaration } from '../src/lib/fema-disasters.mjs';

test('normalizeFemaDeclaration maps FEMA disaster to BEACON format', () => {
  const raw = {
    femaDeclarationString: 'DR-4607-MI',
    disasterNumber: 4607,
    state: 'MI',
    declarationType: 'DR',
    declarationDate: '2021-07-15T00:00:00.000Z',
    incidentType: 'Severe Storm',
    declarationTitle: 'SEVERE STORMS, FLOODING, AND TORNADOES',
    incidentBeginDate: '2021-06-25T00:00:00.000Z',
    incidentEndDate: '2021-06-26T00:00:00.000Z',
    fipsStateCode: '26',
    fipsCountyCode: '161',
    designatedArea: 'Washtenaw (County)',
    region: 5,
    iaProgramDeclared: false,
    paProgramDeclared: true,
    hmProgramDeclared: true,
    latitude: '42.2808',
    longitude: '-83.7430',
  };

  const disaster = normalizeFemaDeclaration(raw);

  assert.deepEqual(disaster, {
    id: 'fema-4607-26-161',
    disasterNumber: 4607,
    femaDeclarationString: 'DR-4607-MI',
    declarationType: 'DR',
    declarationDate: '2021-07-15T00:00:00.000Z',
    incidentType: 'Severe Storm',
    incidentTitle: 'SEVERE STORMS, FLOODING, AND TORNADOES',
    incidentBeginDate: '2021-06-25T00:00:00.000Z',
    incidentEndDate: '2021-06-26T00:00:00.000Z',
    state: 'MI',
    stateFips: '26',
    county: 'Washtenaw (County)',
    countyFips: '161',
    region: 5,
    iaProgram: false,
    paProgram: true,
    hmProgram: true,
    lat: 42.2808,
    lng: -83.743,
    source: 'FEMA Disaster Declarations',
    sourceUrl: 'https://www.fema.gov/disaster/4607',
    fetchedAt: disaster.fetchedAt,
  });
});

test('normalizeFemaDeclaration handles missing coordinates gracefully', () => {
  const raw = {
    femaDeclarationString: 'EM-3610-PR',
    disasterNumber: 3610,
    state: 'PR',
    declarationType: 'EM',
    declarationDate: '2024-08-13T00:00:00.000Z',
    incidentType: 'Severe Storm',
    declarationTitle: 'TROPICAL STORM ERNESTO',
    incidentBeginDate: '2024-08-13T00:00:00.000Z',
    incidentEndDate: '2024-08-16T00:00:00.000Z',
    fipsStateCode: '72',
    fipsCountyCode: '001',
    designatedArea: 'Adjuntas (Municipio)',
    region: 2,
    iaProgramDeclared: false,
    paProgramDeclared: true,
    hmProgramDeclared: false,
    latitude: null,
    longitude: null,
  };

  const disaster = normalizeFemaDeclaration(raw);

  assert.equal(disaster.lat, 0);
  assert.equal(disaster.lng, 0);
  assert.equal(disaster.state, 'PR');
  assert.equal(disaster.county, 'Adjuntas (Municipio)');
});
