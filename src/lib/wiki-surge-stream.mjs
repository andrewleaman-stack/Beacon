/**
 * Long-lived connection to Wikimedia EventStreams feeding a SurgeTracker.
 * Runs inside the Next.js server process (the Pi's standalone container);
 * serverless hosts such as Vercel can't hold the connection open.
 */
import { SurgeTracker, classifyArticle, severityForSurge, parseSseChunk } from './wiki-surge.mjs';

const STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';
const UA = 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon) wiki-surge';
const INFO_TTL_MS = 60 * 60_000;

const state = globalThis.__beaconWikiSurge ??= {
  tracker: new SurgeTracker(),
  startedAt: null,
  connectedAt: null,
  lastEventAt: null,
  lastTimestamp: null,
  reconnects: 0,
  lastError: null,
  running: false,
  info: new Map(), // key -> { at, coordinates, description, url }
};

async function runStream() {
  let backoff = 2_000;
  while (state.running) {
    try {
      // Resume where we left off after a reconnect (EventStreams accepts an ISO `since`).
      const since = state.lastTimestamp ? `?since=${encodeURIComponent(new Date(state.lastTimestamp * 1000).toISOString())}` : '';
      const res = await fetch(STREAM_URL + since, { headers: { 'User-Agent': UA, Accept: 'text/event-stream' } });
      if (!res.ok || !res.body) throw new Error(`EventStreams HTTP ${res.status}`);
      state.connectedAt = new Date().toISOString();
      backoff = 2_000;
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of res.body) {
        if (!state.running) break;
        buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
        const { events, rest } = parseSseChunk(buffer);
        buffer = rest;
        for (const data of events) {
          try {
            const event = JSON.parse(data);
            if (event.timestamp) state.lastTimestamp = event.timestamp;
            state.tracker.ingest(event);
            state.lastEventAt = Date.now();
          } catch {
            // ignore malformed events
          }
        }
      }
      throw new Error('EventStreams connection closed');
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      state.reconnects++;
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 60_000);
    }
  }
}

export function ensureWikiSurgeStream() {
  if (state.running) return;
  state.running = true;
  state.startedAt = Date.now();
  runStream();
}

async function fetchArticleInfo(surge) {
  const cached = state.info.get(surge.key);
  if (cached && Date.now() - cached.at < INFO_TTL_MS) return cached;
  const url = `${surge.serverUrl}/w/api.php?action=query&format=json&formatversion=2&redirects=1` +
    `&prop=coordinates|description|info&inprop=url&titles=${encodeURIComponent(surge.title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const page = (await res.json())?.query?.pages?.[0] || {};
  const coord = page.coordinates?.[0];
  const info = {
    at: Date.now(),
    coordinates: coord ? { lat: coord.lat, lon: coord.lon } : null,
    description: page.description || '',
    url: page.fullurl || `${surge.serverUrl}/wiki/${encodeURIComponent(surge.title.replace(/ /g, '_'))}`,
  };
  state.info.set(surge.key, info);
  return info;
}

/** Current surges, enriched and topic-filtered. Articles without coordinates are listed with lat/lng null. */
export async function getWikiSurges({ limit = 40 } = {}) {
  const candidates = state.tracker.surges().slice(0, limit * 2);
  const results = await Promise.allSettled(candidates.map(async (surge) => {
    const info = await fetchArticleInfo(surge);
    const verdict = classifyArticle(surge, info);
    if (!verdict.keep) return null;
    return {
      id: `wiki-${surge.key}`,
      title: `${surge.kind === 'new-article' ? 'New article' : surge.kind === 'protected' ? 'Protected after edit rush' : 'Edit surge'}: ${surge.title}`,
      article: surge.title,
      description: info.description,
      wiki: surge.wiki,
      kind: surge.kind,
      edits: surge.edits,
      editors: surge.editors,
      windowMinutes: surge.windowMinutes,
      lat: info.coordinates?.lat ?? null,
      lng: info.coordinates?.lon ?? null,
      url: info.url,
      historyUrl: `${surge.serverUrl}/w/index.php?title=${encodeURIComponent(surge.title.replace(/ /g, '_'))}&action=history`,
      severity: severityForSurge(surge),
      reportedAt: surge.lastEditAt,
      createdAt: surge.createdAt,
      score: surge.score,
    };
  }));
  const surges = results.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean).slice(0, limit);

  // Keep the info cache bounded.
  if (state.info.size > 2000) {
    for (const [key, info] of state.info) if (Date.now() - info.at > INFO_TTL_MS) state.info.delete(key);
  }

  return {
    surges,
    stream: {
      startedAt: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      connectedAt: state.connectedAt,
      lastEventAt: state.lastEventAt ? new Date(state.lastEventAt).toISOString() : null,
      trackedArticles: state.tracker.pages.size,
      reconnects: state.reconnects,
      lastError: state.lastError,
      warmingUp: !state.startedAt || Date.now() - state.startedAt < state.tracker.opts.windowMs,
    },
  };
}
