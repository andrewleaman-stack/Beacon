// Request deduplication for feed fetching
// Wraps fetch to prevent duplicate in-flight requests for the same URL

interface InFlightRequest<T> {
  promise: Promise<T>;
  abortController: AbortController;
  timestamp: number;
}

const inFlightRequests = new Map<string, InFlightRequest<any>>();
const REQUEST_TIMEOUT_MS = 30_000;

export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { signal?: AbortSignal; timeout?: number }
): Promise<T> {
  const now = Date.now();
  for (const [k, v] of inFlightRequests.entries()) {
    if (now - v.timestamp > REQUEST_TIMEOUT_MS) {
      v.abortController.abort();
      inFlightRequests.delete(k);
    }
  }

  const existing = inFlightRequests.get(key);
  if (existing) {
    try {
      return await existing.promise;
    } catch (e) {
      inFlightRequests.delete(key);
      throw e;
    }
  }

  const abortController = new AbortController();
  const timeout = options?.timeout ?? 10_000;
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  const onAbort = () => abortController.abort();
  options?.signal?.addEventListener('abort', onAbort);

  const promise = fetcher()
    .finally(() => {
      clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', onAbort);
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, { promise, abortController, timestamp: now });

  try {
    return await promise;
  } catch (e) {
    inFlightRequests.delete(key);
    throw e;
  }
}

export function createFetchKey(url: string, init?: RequestInit): string {
  return (init?.method || 'GET') + ':' + url;
}

export async function deduplicatedFetchEndpoint<T>(
  url: string,
  transform?: (d: any) => any,
  options?: RequestInit
): Promise<T | null> {
  const key = createFetchKey(url, options);
  
  return deduplicatedFetch(key, async () => {
    const res = await fetch(url, { ...options, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return transform ? transform(json) : json;
  }, options);
}