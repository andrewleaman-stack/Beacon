/**
 * Frame times for every timed raster layer, gathered in one place so the map
 * timeline knows what each provider actually has. Times are epoch ms,
 * oldest first, covering the timeline's past window.
 */

import { TIMELINE } from './weather-timeline.mjs';
import { fetchRainviewerFrame, fetchLightningTimes, fetchMeteosatTimes, METEOSAT_LAYER } from './weather-layers.mjs';
import { LIVE_CLOUD_LAYERS, fetchCloudTimes } from './nasa-imagery.mjs';

/**
 * GIBS lists a frame in DescribeDomains a little before all of its tiles
 * exist, so the newest listed frame is left out.
 * @param {number[]} times
 */
export function settledGibsTimes(times) {
  return times.length > 1 ? times.slice(0, -1) : times;
}

/**
 * @typedef {{
 *   radar: { maxzoom: number, frames: { time: number, tiles: string[] }[] } | null,
 *   lightning: number[],
 *   clouds: Record<string, number[]>,
 *   errors: string[],
 *   fetchedAt: number,
 * }} WeatherFrames
 */

/**
 * Collect frames from every provider. A provider that fails keeps its entry
 * from `previous` (if any) and is listed in `errors`, so one outage never
 * blanks the other layers.
 * @param {{ fetchImpl?: typeof fetch, now?: number, previous?: WeatherFrames | null }} [options]
 * @returns {Promise<WeatherFrames>}
 */
export async function fetchWeatherFrames({ fetchImpl = fetch, now = Date.now(), previous = null } = {}) {
  const from = now - TIMELINE.pastMs;
  const to = now;
  /** @type {string[]} */
  const errors = [];
  /** @template T @param {string} key @param {T} fallback @returns {(error: any) => T} */
  const keep = (key, fallback) => (error) => {
    errors.push(`${key}: ${error?.message || error}`);
    return fallback;
  };

  const [radar, lightning, meteosat, ...gibs] = await Promise.all([
    fetchRainviewerFrame({ fetchImpl })
      .then((r) => ({
        maxzoom: r.maxzoom,
        frames: r.frames.map((f) => ({ time: Date.parse(f.time), tiles: f.tiles })).filter((f) => f.time >= from),
      }))
      .catch(keep('radar', previous?.radar ?? null)),
    fetchLightningTimes({ fetchImpl, from, to }).catch(keep('lightning', previous?.lightning ?? [])),
    fetchMeteosatTimes({ fetchImpl, from, to }).catch(keep(METEOSAT_LAYER.id, previous?.clouds?.[METEOSAT_LAYER.id] ?? [])),
    ...LIVE_CLOUD_LAYERS.map((def) =>
      fetchCloudTimes(def, { fetchImpl, from, to })
        .then(settledGibsTimes)
        .catch(keep(def.id, previous?.clouds?.[def.id] ?? [])),
    ),
  ]);

  /** @type {Record<string, number[]>} */
  const clouds = { [METEOSAT_LAYER.id]: meteosat };
  LIVE_CLOUD_LAYERS.forEach((def, i) => { clouds[def.id] = gibs[i]; });

  return { radar, lightning, clouds, errors, fetchedAt: now };
}
