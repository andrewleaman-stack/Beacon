import { timedFetch } from '@/lib/timed-fetch';
import { parseMichigan, parseFinland, parseHongKong, parseIceland, parseNewZealand } from '@/lib/camera-networks.mjs';
import type { CctvCamera } from './types';

// Open government traffic-camera networks (no key). Camera lists change rarely,
// so each list is cached for 30 minutes; the snapshots themselves are always live.
const TTL_MS = 30 * 60_000;
const cache = new Map<string, { at: number; cams: CctvCamera[] }>();

export function cachedCameraList(key: string, load: () => Promise<CctvCamera[]>) {
  return async (): Promise<CctvCamera[]> => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.cams;
    try {
      const cams = await load();
      if (cams.length) cache.set(key, { at: Date.now(), cams });
      return cams.length ? cams : hit?.cams ?? [];
    } catch {
      return hit?.cams ?? [];
    }
  };
}

/** fetch that throws on HTTP errors, retrying a few times for servers that fail intermittently. */
export async function okFetch(url: string, init?: RequestInit, attempts = 1) {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await timedFetch(url, { timeoutMs: 15_000, ...init });
      if (res.ok) return res;
      last = new Error(`${url}: HTTP ${res.status}`);
    } catch (e) { last = e; }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw last;
}

async function getJson(url: string, init?: RequestInit, attempts = 1) {
  return (await okFetch(url, init, attempts)).json();
}

export const fetchMichiganCameras = cachedCameraList('michigan', async () =>
  // MiDrive's servers answer 404 to roughly a third of requests, so try a few times.
  parseMichigan(await getJson('https://mdotjboss.state.mi.us/MiDrive/camera/list', undefined, 5)));

export const fetchFinlandCameras = cachedCameraList('finland', async () =>
  parseFinland(await getJson('https://tie.digitraffic.fi/api/weathercam/v1/stations', { headers: { 'Accept-Encoding': 'gzip', 'Digitraffic-User': 'BEACON' } })));

export const fetchHongKongCameras = cachedCameraList('hong-kong', async () => {
  const res = await timedFetch('https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml', { timeoutMs: 15_000 });
  if (!res.ok) throw new Error(`HK: HTTP ${res.status}`);
  return parseHongKong(await res.text());
});

export const fetchIcelandCameras = cachedCameraList('iceland', async () =>
  parseIceland(await getJson('https://gagnaveita.vegagerdin.is/api/vefmyndavelar2014_1')));

export const fetchNewZealandCameras = cachedCameraList('new-zealand', async () =>
  parseNewZealand(await getJson('https://trafficnz.info/service/traffic/rest/4/cameras/all', { headers: { Accept: 'application/json' } })));
