#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCisaIcsAdvisoriesXml,
  normalizeCisaIcsAdvisory,
} from '../src/lib/ics-advisories.mjs';
import {
  parseNrcEventsJsonl,
  normalizeNrcEvent,
} from '../src/lib/nrc-events.mjs';

test('parseCisaIcsAdvisoriesXml normalizes advisory RSS items', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title>Brickcom Cameras</title>
      <link>https://www.cisa.gov/news-events/ics-advisories/icsa-26-162-03</link>
      <description><![CDATA[This advisory contains mitigations for improper authentication vulnerabilities.]]></description>
      <pubDate>Thu, 11 Jun 2026 12:00:00 +0000</pubDate>
      <guid>icsa-26-162-03</guid>
    </item>
  </channel></rss>`;

  const advisories = parseCisaIcsAdvisoriesXml(xml, new Date('2026-06-13T00:00:00Z'));

  assert.equal(advisories.length, 1);
  assert.deepEqual(advisories[0], {
    id: 'icsa-26-162-03',
    title: 'Brickcom Cameras',
    summary: 'This advisory contains mitigations for improper authentication vulnerabilities.',
    url: 'https://www.cisa.gov/news-events/ics-advisories/icsa-26-162-03',
    publishedAt: '2026-06-11T12:00:00.000Z',
    fetchedAt: '2026-06-13T00:00:00.000Z',
    severity: 'elevated',
    source: 'CISA ICS Advisories',
  });
});

test('normalizeCisaIcsAdvisory detects high-signal exploited advisories', () => {
  const advisory = normalizeCisaIcsAdvisory({
    title: 'Vendor PLC exploited in the wild',
    link: 'https://www.cisa.gov/news-events/ics-advisories/icsa-26-001-01',
    description: 'CISA is aware of public exploitation affecting industrial control systems.',
    pubDate: '2026-06-01T00:00:00Z',
    guid: 'icsa-26-001-01',
  }, new Date('2026-06-13T00:00:00Z'));

  assert.equal(advisory.severity, 'high');
});

test('parseNrcEventsJsonl returns newest normalized NRC event notifications', () => {
  const jsonl = [
    JSON.stringify({ event_number: 58104, category: 'Power Reactor', report_date: '2026-01-02', facility: 'Hatch', region: '2', state: 'GA', city: 'Baxley', county: 'Appling', notification_date: '2025-12-31', notification_time: '10:49', emergency_class: 'Non Emergency', event_text: 'INVALID SPECIFIED SYSTEM ACTUATION', page_url: 'https://www.nrc.gov/example/58104' }),
    JSON.stringify({ event_number: 58297, category: 'Agreement State', report_date: '2026-06-09', rep_org: 'MA Radiation Control Program', state: 'MA', city: 'Canton', notification_date: '2026-06-01', notification_time: '14:39', emergency_class: 'Non Emergency', event_text: 'AGREEMENT STATE REPORT - LOST SOURCE', page_url: 'https://www.nrc.gov/example/58297' }),
  ].join('\n');

  const events = parseNrcEventsJsonl(jsonl, { limit: 1, now: new Date('2026-06-13T00:00:00Z') });

  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    id: 'nrc-58297',
    eventNumber: 58297,
    category: 'Agreement State',
    title: 'Agreement State — MA Radiation Control Program',
    facility: 'MA Radiation Control Program',
    city: 'Canton',
    county: '',
    state: 'MA',
    region: '',
    emergencyClass: 'Non Emergency',
    severity: 'high',
    reportedAt: '2026-06-01T14:39:00.000Z',
    reportDate: '2026-06-09',
    summary: 'AGREEMENT STATE REPORT - LOST SOURCE',
    url: 'https://www.nrc.gov/example/58297',
    source: 'NRC Event Notifications',
    fetchedAt: '2026-06-13T00:00:00.000Z',
  });
});

test('normalizeNrcEvent marks unusual events as high severity', () => {
  const event = normalizeNrcEvent({
    event_number: 1,
    category: 'Power Reactor',
    report_date: '2026-06-01',
    facility: 'Fermi',
    state: 'MI',
    notification_date: '2026-06-01',
    notification_time: '09:00',
    emergency_class: 'Unusual Event',
    event_text: 'UNUSUAL EVENT DECLARED',
    page_url: 'https://example.com',
  }, new Date('2026-06-13T00:00:00Z'));

  assert.equal(event.severity, 'high');
});
