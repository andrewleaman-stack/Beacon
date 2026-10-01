#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { transitRisk, securityRisk, combineRisk } from '../src/lib/chokepoint-risk.mjs';

/** @param {number[]} counts newest first */
const days = (counts) => counts.map((n, i) => ({ date: new Date(Date.UTC(2026, 8, 30) - i * 86400_000).toISOString().slice(0, 10), n_total: n }));

test('normal traffic is LOW, not a fixed HIGH', () => {
  assert.equal(transitRisk(days(Array(100).fill(40))).level, 'LOW');
});

test('a traffic drop raises the level', () => {
  const drop = (recent) => transitRisk(days([...Array(7).fill(recent), ...Array(90).fill(40)])).level;
  assert.equal(drop(30), 'ELEVATED');
  assert.equal(drop(20), 'HIGH');
  assert.equal(drop(10), 'CRITICAL');
});

test('too little data is UNKNOWN', () => {
  assert.equal(transitRisk(days(Array(10).fill(40))).level, 'UNKNOWN');
  assert.equal(transitRisk(/** @type {any} */ (null)).level, 'UNKNOWN');
});

test('security reports need the place and an attack word, and must be recent', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  const h = [
    { title: 'Three vessels were attacked in the Strait of Hormuz', published: '2026-09-30T12:00:00Z' },
    { title: 'Oil prices steady as Hormuz traffic flows', published: '2026-09-30T12:00:00Z' },
    { title: 'Tanker seized near Hormuz', published: '2026-09-20T12:00:00Z' },
  ];
  const r = securityRisk(h, ['hormuz'], now);
  assert.equal(r.reports.length, 1);
  assert.equal(r.level, 'ELEVATED');
});

test('combined: agreeing signals step up; no data and no reports stays UNKNOWN', () => {
  const traffic = { level: 'ELEVATED', ratio: 0.7, latest: '2026-09-27' };
  const sec = { level: 'ELEVATED', reports: ['x'] };
  const c = combineRisk(traffic, sec);
  assert.equal(c.risk, 'HIGH');
  assert.match(c.evidence[0], /30% below normal/);
  assert.equal(combineRisk({ level: 'UNKNOWN', ratio: null, latest: null }, { level: 'LOW', reports: [] }).risk, 'UNKNOWN');
  assert.equal(combineRisk({ level: 'LOW', ratio: 1, latest: '2026-09-27' }, { level: 'LOW', reports: [] }).risk, 'LOW');
});

test('very quiet chokepoints cannot reach HIGH on traffic alone', () => {
  assert.equal(transitRisk(days([...Array(7).fill(0), ...Array(90).fill(3)])).level, 'ELEVATED');
});
