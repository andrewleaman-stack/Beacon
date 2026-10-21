import { NextResponse } from 'next/server';
import { fetchWeatherFrames } from '@/lib/weather-frames.mjs';

type WeatherFrames = Awaited<ReturnType<typeof fetchWeatherFrames>>;

export const dynamic = 'force-dynamic';

/**
 * Frame times for the timed weather rasters (radar, satellite clouds,
 * lightning) over the timeline's past window. Providers publish every 10-15
 * minutes, so the list is cached for 5 minutes. Tiles themselves load straight
 * from the providers, not through this server.
 */
const TTL_MS = 5 * 60_000;
let cached: WeatherFrames | null = null;
let inflight: Promise<WeatherFrames> | null = null;

export async function GET() {
  try {
    if (!cached || Date.now() - cached.fetchedAt > TTL_MS) {
      inflight ??= fetchWeatherFrames({ previous: cached }).finally(() => { inflight = null; });
      cached = await inflight;
    }
    const status = cached.errors.length ? 'partial' : 'live';
    return NextResponse.json({ ...cached, status });
  } catch (error: any) {
    if (cached) return NextResponse.json({ ...cached, status: 'stale' });
    return NextResponse.json({ radar: null, lightning: [], clouds: {}, errors: [String(error?.message || error)], status: 'error' }, { status: 502 });
  }
}
