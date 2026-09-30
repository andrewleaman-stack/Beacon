import { NextRequest, NextResponse } from 'next/server';
import { timedFetch } from '@/lib/timed-fetch';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

export const dynamic = 'force-dynamic';

/** Place-name search via OpenStreetMap Nominatim (max 1 request/second per their policy). */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ results: [] });
  if (isRateLimited(`geocode:${getClientIp(request)}`, 30)) return NextResponse.json({ error: 'Too many searches' }, { status: 429 });
  try {
    const res = await timedFetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`, { timeoutMs: 8_000 });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const rows = await res.json();
    return NextResponse.json({
      results: (Array.isArray(rows) ? rows : []).map((r: any) => ({ label: String(r.display_name || ''), lat: Number(r.lat), lng: Number(r.lon) }))
        .filter((r: any) => Number.isFinite(r.lat) && Number.isFinite(r.lng)),
    });
  } catch (error: any) {
    return NextResponse.json({ results: [], error: 'Search unavailable', message: error?.message }, { status: 502 });
  }
}
