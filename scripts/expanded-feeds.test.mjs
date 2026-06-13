#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeVolcanoAlert } from '../src/lib/usgs-volcano-alerts.mjs';
import { parseEpaEchoCsv, normalizeEpaEchoFacility } from '../src/lib/epa-echo-facilities.mjs';
import { normalizeDteOutageSummary } from '../src/lib/power-outages.mjs';

test('normalizeVolcanoAlert maps USGS HANS CAP elevated volcano records', () => {
  const alert = normalizeVolcanoAlert({
    volcano_name_appended: 'Great Sitkin Volcano',
    latitude: 52.0765,
    longitude: -176.1109,
    vnum: '311120',
    alert_level: 'WATCH',
    color_code: 'ORANGE',
    synopsis: 'Slow eruption of lava within the summit crater continues.',
    notice_identifier: 'DOI-USGS-AVO-2026-06-13T17:39:04+00:00',
    sent_date_cap: '2026-06-13T11:11:48-08:00',
  });

  assert.equal(alert.name, 'Great Sitkin');
  assert.equal(alert.volcanoId, '311120');
  assert.equal(alert.severity, 'high');
  assert.equal(alert.lat, 52.0765);
});

test('EPA ECHO CSV parser normalizes CWA facility rows', () => {
  const csv = '"CWPName","SourceID","CWPStreet","CWPCity","CWPState","Statute","FacStdCountyName","FacLong","CWPEffectiveDate"\n"11011 ALLISON ROAD-MILAN","MIG490355","11011 ALLISON RD","MILAN","MI","CWA","MONROE COUNTY",-83.582945,"09/12/2023"';
  const rows = parseEpaEchoCsv(csv);
  const facility = normalizeEpaEchoFacility({ ...rows[0], FacLat: '42.0001' });

  assert.equal(rows.length, 1);
  assert.equal(facility.name, '11011 ALLISON ROAD-MILAN');
  assert.equal(facility.county, 'MONROE COUNTY');
  assert.equal(facility.lng, -83.582945);
});

test('normalizeDteOutageSummary maps regional outage summary', () => {
  const outage = normalizeDteOutageSummary({
    apiPayload: {
      summaryFileData: {
        totals: [{ total_cust_a: { val: 624 }, total_cust_s: 2264804, total_outages: 230, total_percent_cust_active: { val: 99.97 } }],
        date_generated: '2026-06-13T19:52:10Z',
      },
    },
    homePayload: {
      customersAffected: '727',
      totalCustomers: '2280420',
      customersWithPower: '2279693',
      percentageWithPower: '99.97',
      currentSituations: [{ key: 'crews', displayValue: '481' }],
    },
  });

  assert.equal(outage.provider, 'DTE Energy');
  assert.equal(outage.customersAffected, 727);
  assert.equal(outage.crews, 481);
  assert.equal(outage.severity, 'low');
});
