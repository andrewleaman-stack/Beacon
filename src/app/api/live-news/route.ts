import { NextResponse } from 'next/server';
import { LIVE_CHANNELS, LANGUAGE_NAMES, REGIONS } from '@/lib/live-channels.mjs';
import { resolveChannel, mapLimit } from '@/lib/live-resolve.mjs';

/**
 * BEACON — Live News Feeds v4
 *
 * 68 official news channels. Every 15 minutes the server opens each channel's
 * YouTube /live page to learn the current live video and whether it may be
 * embedded, so the news wall always plays the right stream.
 *
 * embed_allowed: true  → plays inside BEACON
 * embed_allowed: false → off air, or the broadcaster blocks embedding; open on YouTube
 */

type Status = { videoId: string | null; live: boolean; embeddable: boolean; title: string | null; checkedAt: number };

const REFRESH_MS = 15 * 60_000;
const status = new Map<string, Status>();
let lastRefresh = 0;
let refreshing: Promise<void> | null = null;

function refresh(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const results = await mapLimit(LIVE_CHANNELS, 6, (c) => resolveChannel(c.channelId));
    const now = Date.now();
    results.forEach((r, i) => {
      // A failed check keeps the last known status rather than marking a channel off air.
      if (r.status === 'fulfilled') status.set(LIVE_CHANNELS[i].id, { ...r.value, checkedAt: now });
    });
    lastRefresh = now;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

// Kept from the earlier list: RT is only reachable on Rumble.
const EXTERNAL_ONLY = [
  { id: 'rt', name: 'RT News', city: 'Moscow', country: 'RU', lat: 55.755, lng: 37.617, region: 'Europe', language: 'en', category: 'state', url: 'https://rumble.com/c/RTNewsEN', embed_allowed: false, live: null, video_id: null, checked_at: null },
];

function toFeed(c: (typeof LIVE_CHANNELS)[number]) {
  const s = status.get(c.id);
  const base = { id: c.id, name: c.name, handle: c.handle, channel_id: c.channelId, city: c.city, country: c.country, lat: c.lat, lng: c.lng, region: c.region, language: c.language, category: c.category };
  if (!s) {
    // Not checked yet: YouTube's channel live embed usually works and finds the stream itself.
    return { ...base, url: `https://www.youtube.com/embed/live_stream?channel=${c.channelId}&autoplay=1&mute=1`, embed_allowed: true, live: null, video_id: null, checked_at: null };
  }
  if (s.live && s.embeddable && s.videoId) {
    return { ...base, url: `https://www.youtube.com/embed/${s.videoId}?autoplay=1&mute=1`, embed_allowed: true, live: true, video_id: s.videoId, live_title: s.title, checked_at: new Date(s.checkedAt).toISOString() };
  }
  return {
    ...base,
    url: s.live && s.videoId ? `https://www.youtube.com/watch?v=${s.videoId}` : `https://www.youtube.com/@${c.handle}/live`,
    embed_allowed: false, live: s.live, video_id: s.live ? s.videoId : null, live_title: s.live ? s.title : null, checked_at: new Date(s.checkedAt).toISOString(),
  };
}

export async function GET() {
  if (Date.now() - lastRefresh > REFRESH_MS) {
    const pending = refresh().catch(() => {});
    // On a cold start wait briefly for the first check; otherwise answer from what we have.
    if (!lastRefresh) await Promise.race([pending, new Promise((r) => setTimeout(r, 3500))]);
  }
  const feeds = [...LIVE_CHANNELS.map(toFeed), ...EXTERNAL_ONLY];
  return NextResponse.json({
    feeds,
    total: feeds.length,
    live: feeds.filter((f) => f.live === true).length,
    categories: ['mainstream', 'government', 'finance', 'state'],
    regions: REGIONS,
    languages: LANGUAGE_NAMES,
    checked_at: lastRefresh ? new Date(lastRefresh).toISOString() : null,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}
