import { NextResponse } from 'next/server';
import { timedFetch } from '@/lib/timed-fetch';

export const dynamic = 'force-dynamic';

/** Live position of one aircraft by ICAO 24-bit hex, from adsb.lol (ODbL). Used while tracking. */
export async function GET(request: Request) {
  const hex = new URL(request.url).searchParams.get('hex')?.trim().toLowerCase() || '';
  if (!/^[0-9a-f]{6}$/.test(hex)) return NextResponse.json({ error: 'hex must be a 6-character ICAO address' }, { status: 400 });
  try {
    const res = await timedFetch(`https://api.adsb.lol/v2/hex/${hex}`, { timeoutMs: 8000, cache: 'no-store' });
    if (!res.ok) throw new Error(`adsb.lol returned HTTP ${res.status}`);
    const ac = (await res.json())?.ac?.[0];
    if (!ac || typeof ac.lat !== 'number' || typeof ac.lon !== 'number') {
      return NextResponse.json({ hex, found: false, source: 'adsb.lol' });
    }
    return NextResponse.json({
      hex,
      found: true,
      callsign: String(ac.flight || '').trim(),
      lat: ac.lat,
      lng: ac.lon,
      altFt: typeof ac.alt_baro === 'number' ? ac.alt_baro : null,
      onGround: ac.alt_baro === 'ground',
      speedKn: ac.gs ?? null,
      heading: ac.track ?? null,
      model: ac.t || '',
      registration: ac.r || '',
      seenSecondsAgo: ac.seen_pos ?? null,
      source: 'adsb.lol',
    });
  } catch (error: any) {
    return NextResponse.json({ hex, found: false, error: 'Position unavailable', message: error?.message }, { status: 502 });
  }
}
