/**
 * Space launches from The Space Devs Launch Library 2 (keyless: 15 calls/hour).
 * https://ll.thespacedevs.com/docs/ — data may be used and shared; attribution
 * "Launch Library 2 — The Space Devs" is kept as a courtesy.
 */

const LL2 = 'https://ll.thespacedevs.com/2.3.0/launches';
const UA = { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon) launches' };

export function normalizeLaunch(row) {
  const pad = row?.pad || {};
  const lat = Number(pad.latitude);
  const lng = Number(pad.longitude);
  if (!row?.id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: `launch-${row.id}`,
    name: String(row.name || 'Launch'),
    net: row.net || null,
    windowStart: row.window_start || null,
    status: row.status?.abbrev || row.status?.name || 'Unknown',
    statusName: row.status?.name || '',
    provider: row.launch_service_provider?.name || '',
    mission: row.mission?.name || '',
    missionType: row.mission?.type || '',
    orbit: row.mission?.orbit?.abbrev || row.mission?.orbit?.name || '',
    padName: pad.name || '',
    location: pad.location?.name || '',
    lat,
    lng,
    webcastLive: !!row.webcast_live,
    image: typeof row.image === 'string' ? row.image : row.image?.image_url || null,
  };
}

/** Group launches by pad so one marker lists every launch from that pad, soonest first. */
export function groupByPad(launches) {
  const pads = new Map();
  for (const launch of launches) {
    const key = `${launch.lat.toFixed(4)},${launch.lng.toFixed(4)}`;
    const pad = pads.get(key) || { id: `pad-${key}`, padName: launch.padName, location: launch.location, lat: launch.lat, lng: launch.lng, launches: [] };
    pad.launches.push(launch);
    pads.set(key, pad);
  }
  return [...pads.values()].map((pad) => {
    pad.launches.sort((a, b) => String(a.net).localeCompare(String(b.net)));
    return pad;
  });
}

async function fetchPage(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: UA, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (res.status === 429) throw new Error('Launch Library 2 rate limit reached');
  if (!res.ok) throw new Error(`Launch Library 2 returned HTTP ${res.status}`);
  return (await res.json())?.results || [];
}

export async function fetchLaunches({ now = new Date(), fetchImpl = fetch } = {}) {
  const iso = (d) => d.toISOString().slice(0, 19) + 'Z';
  const in14d = new Date(now.getTime() + 14 * 86400_000);
  const ago7d = new Date(now.getTime() - 7 * 86400_000);
  const [upcoming, recent] = await Promise.all([
    fetchPage(`${LL2}/upcoming/?mode=normal&limit=60&net__lte=${iso(in14d)}`, fetchImpl),
    fetchPage(`${LL2}/previous/?mode=normal&limit=40&net__gte=${iso(ago7d)}`, fetchImpl),
  ]);
  const tag = (list, when) => list.map(normalizeLaunch).filter(Boolean).map((l) => ({ ...l, when }));
  return [...tag(upcoming, 'upcoming'), ...tag(recent, 'recent')];
}
