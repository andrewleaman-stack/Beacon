#!/usr/bin/env node

const port = process.env.PORT || '3000';
const host = process.env.HEALTHCHECK_HOST || '127.0.0.1';
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 5_000);
const url = `http://${host}:${port}/api/health`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

timeout.unref?.();

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': 'BEACON-container-healthcheck/1.0' },
  });

  if (!response.ok) {
    console.error(`Healthcheck failed: HTTP ${response.status}`);
    process.exit(1);
  }

  const payload = await response.json();
  if (payload.status !== 'operational' || payload.platform !== 'BEACON') {
    console.error(`Healthcheck payload mismatch: ${JSON.stringify(payload)}`);
    process.exit(1);
  }

  process.exit(0);
} catch (error) {
  const message = error instanceof Error && error.name === 'AbortError'
    ? `Healthcheck timed out after ${timeoutMs}ms: ${url}`
    : error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
