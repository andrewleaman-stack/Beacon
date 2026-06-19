// Eval harness for briefing quality regression testing
// Run with: node scripts/eval-briefings.mjs

const GOLDEN_BRIEFINGS = [
  {
    id: 'high-mag-quake',
    context: {
      earthquakes: [{ magnitude: 7.2, location: 'Japan', latitude: 35.6, longitude: 139.7, depth: 30, timestamp: new Date().toISOString(), tsunami: true, felt: 1000, alert: 'red' }],
      news: [],
      threats: [],
      cyberAlerts: [],
      timestamp: new Date().toISOString(),
    },
    expectedContains: ['M7.2', 'Japan', 'TSUNAMI', 'CRITICAL', 'tsunami'],
    expectedNotContains: [],
    minConfidence: 'HIGH',
  },
  {
    id: 'compound-risk',
    context: {
      earthquakes: [{ magnitude: 5.8, location: 'Turkey', latitude: 38.0, longitude: 38.0, depth: 10, timestamp: new Date().toISOString(), tsunami: false, felt: 500, alert: 'orange' }],
      news: [{ title: 'Conflict escalation in region', risk_score: 8, source: 'Reuters', published: new Date().toISOString(), link: 'https://reuters.com', description: '...', coords: [38, 38], machine_assessment: null }],
      threats: [{ severity: 'HIGH', type: 'CONFLICT', title: 'Border clashes', region: 'Turkey/Syria', latitude: 38, longitude: 38, timestamp: new Date().toISOString(), source: 'GDELT' }],
      cyberAlerts: [],
      timestamp: new Date().toISOString(),
    },
    expectedContains: ['compound', 'Turkey', 'conflict', 'escalation', 'earthquake'],
    expectedNotContains: [],
    minConfidence: 'MODERATE',
  },
  {
    id: 'cyber-critical',
    context: {
      earthquakes: [],
      news: [],
      threats: [],
      cyberAlerts: [{ id: 'CVE-2024-12345', name: 'Critical RCE', vendor: 'Microsoft', product: 'Exchange', severity: 'CRITICAL', date: '2024-01-15', due: '2024-01-20', source: 'CISA' }],
      timestamp: new Date().toISOString(),
    },
    expectedContains: ['CVE-2024-12345', 'Exchange', 'CRITICAL', 'RCE'],
    expectedNotContains: [],
    minConfidence: 'HIGH',
  },
];

function generateMockBriefing(context) {
  const parts = [];

  if (context.earthquakes?.length) {
    for (const eq of context.earthquakes) {
      parts.push(`M${eq.magnitude} | ${eq.location}`);
      if (eq.tsunami) parts.push('TSUNAMI');
      if (eq.alert) parts.push(`ALERT:${eq.alert}`);
    }
  }

  if (context.news?.length) {
    for (const n of context.news) {
      parts.push(`RISK:${n.risk_score}/10 | ${n.title}`);
    }
  }

  if (context.threats?.length) {
    for (const t of context.threats) {
      parts.push(`${t.severity} | ${t.title} | ${t.region}`);
    }
  }

  if (context.cyberAlerts?.length) {
    for (const c of context.cyberAlerts) {
      parts.push(`${c.id} | ${c.severity} | ${c.vendor}/${c.product}`);
    }
  }

  // Add confidence assessment
  parts.push('\nASSESSMENT CONFIDENCE: HIGH');

  HIGH');

  return parts.join('\n');
}

function checkBriefing(briefing, golden) {
  const errors = [];

  for (const expected of golden.expectedContains) {
    if (!briefing.toLowerCase().includes(expected.toLowerCase())) {
      errors.push(`Missing expected: "${expected}"`);
    }
  }

  for (const unexpected of golden.expectedNotContains) {
    if (briefing.toLowerCase().includes(unexpected.toLowerCase())) {
      errors.push(`Contains unexpected: "${unexpected}"`);
    }
  }

  const hasConfidence = /\b(HIGH|MODERATE|LOW)\b/.test(briefing);
  if (!hasConfidence) {
    errors.push('Missing confidence assessment');
  }

  return { passed: errors.length === 0, errors };
}

function runEval() {
  console.log('🧪 Starting briefing eval suite...\n');

  let passed = 0;
  const total = GOLDEN_BRIEFINGS.length;

  for (const golden of GOLDEN_BRIEFINGS) {
    const briefing = generateMockBriefing(golden.context);
    const result = checkBriefing(briefing, golden);

    if (result.passed) {
      console.log(`  ✅ ${golden.id}`);
      passed++;
    } else {
      console.log(`  ❌ ${golden.id}: ${result.errors.join(', ')}`);
    }
  }

  console.log(`\n📊 Results: ${passed}/${total} passed`);

  if (passed < total) {
    process.exitCode = 1;
  } else {
    console.log('  ✅ All golden briefings passed');
  }
}

runEval();