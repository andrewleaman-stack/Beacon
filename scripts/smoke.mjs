#!/usr/bin/env node

const baseUrl = process.env.BEACON_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30_000);
const intervalMs = Number(process.env.SMOKE_INTERVAL_MS || 1_000);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'User-Agent': 'BEACON-smoke-test/1.0' },
  });
  const body = await response.text();
  return { response, body };
}

async function waitForServer() {
  const started = Date.now();
  let lastError = '';

  while (Date.now() - started < timeoutMs) {
    try {
      const { response } = await fetchText('/api/health');
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${baseUrl}/api/health: ${lastError}`);
}

async function assertHomePage() {
  const { response, body } = await fetchText('/');
  if (!response.ok) {
    throw new Error(`GET / failed: HTTP ${response.status}`);
  }
  if (!body.includes('__next') && !body.toLowerCase().includes('beacon')) {
    throw new Error('GET / did not look like a BEACON/Next.js HTML page');
  }
}

async function assertHealth() {
  const { response, body } = await fetchText('/api/health');
  if (!response.ok) {
    throw new Error(`GET /api/health failed: HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`/api/health did not return JSON: ${body.slice(0, 120)}`);
  }

  if (payload.status !== 'operational' || payload.platform !== 'BEACON') {
    throw new Error(`/api/health returned unexpected payload: ${JSON.stringify(payload)}`);
  }
}

// The dashboard calls data routes like this from the browser with no auth
// header. A 401/403 here means the dashboard would render with no data.
async function assertDataRouteReachable() {
  const { response } = await fetchText('/api/earthquakes');
  if (response.status === 401 || response.status === 403) {
    throw new Error(`GET /api/earthquakes was refused (HTTP ${response.status}); the dashboard would show no data`);
  }
}

try {
  await waitForServer();
  await assertHomePage();
  await assertHealth();
  await assertDataRouteReachable();
  console.log(`BEACON smoke test passed for ${baseUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
