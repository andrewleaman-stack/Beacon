import { NextResponse } from 'next/server';
import { fetchCisaIcsAdvisories } from '@/lib/ics-advisories.mjs';

export const dynamic = 'force-dynamic';

const ICS_ADVISORY_LIMIT = Number(process.env.ICS_ADVISORY_LIMIT || 50);

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const limit = Number.isFinite(ICS_ADVISORY_LIMIT) && ICS_ADVISORY_LIMIT > 0 ? ICS_ADVISORY_LIMIT : 50;
    const advisories = await fetchCisaIcsAdvisories({ limit });
    return NextResponse.json({
      advisories,
      total: advisories.length,
      sources: ['CISA ICS Advisories'],
      timestamp,
      status: 'live',
      notice: 'Infrastructure-focused cyber advisories for industrial control systems and operational technology.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      advisories: [],
      total: 0,
      sources: ['CISA ICS Advisories'],
      timestamp,
      status: 'error',
      error: 'ICS advisory feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
