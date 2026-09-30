/**
 * fetch() with a hard timeout and an honest User-Agent that identifies BEACON.
 * Some public APIs (NWS among them) require a descriptive UA with contact info.
 */

const BEACON_UA = 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)';
const DEFAULT_TIMEOUT_MS = 10_000;

export async function timedFetch(
  url: string | URL | Request,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!headers.has('User-Agent')) headers.set('User-Agent', BEACON_UA);
  if (!headers.has('Accept-Language')) headers.set('Accept-Language', 'en-US,en;q=0.9');

  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = rest.signal ? AbortSignal.any([rest.signal, timeout]) : timeout;
  return fetch(url, { ...rest, headers, signal });
}
