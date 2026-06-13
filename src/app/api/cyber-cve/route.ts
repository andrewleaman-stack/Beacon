import { NextResponse } from 'next/server';
import { fetchCyberCveFeed } from '@/lib/cyber-cve.mjs';

export const dynamic = 'force-dynamic';

const CYBER_CVE_LIMIT = Number(process.env.CYBER_CVE_LIMIT || 75);

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const { cves, sourceStatus } = await fetchCyberCveFeed();
    const limit = Number.isFinite(CYBER_CVE_LIMIT) && CYBER_CVE_LIMIT > 0 ? CYBER_CVE_LIMIT : 75;
    const limitedCves = cves.slice(0, limit).map((cve: any) => ({
      ...cve,
      fetchedAt: timestamp,
    }));

    return NextResponse.json({
      cves: limitedCves,
      total: limitedCves.length,
      totalAvailable: cves.length,
      sources: ['CISA KEV', 'OSV'],
      sourceStatus,
      timestamp,
      status: 'live',
      notice: 'CISA KEV is authoritative for known exploited vulnerabilities; OSV enriches matching CVE/package context when available.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      cves: [],
      total: 0,
      sources: ['CISA KEV', 'OSV'],
      sourceStatus: [
        { source: 'CISA KEV', ok: false, count: 0, error: error.message },
        { source: 'OSV', ok: false, count: 0, error: 'Skipped because primary CVE feed failed' },
      ],
      timestamp,
      status: 'error',
      error: 'Cyber CVE feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
