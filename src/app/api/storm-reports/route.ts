import { NextResponse } from 'next/server';
import { fetchSpcStormReports } from '@/lib/spc-storm-reports.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const { reports, sourceStatus } = await fetchSpcStormReports();
    return NextResponse.json({
      reports,
      total: reports.length,
      byType: reports.reduce((acc: Record<string, number>, report: any) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: reports.reduce((acc: Record<string, number>, report: any) => {
        acc[report.severity] = (acc[report.severity] || 0) + 1;
        return acc;
      }, {}),
      sources: ['NOAA SPC'],
      sourceStatus,
      timestamp,
      status: sourceStatus.some((source: any) => source.ok) ? 'live' : 'degraded',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      reports: [],
      total: 0,
      sources: ['NOAA SPC'],
      timestamp,
      status: 'error',
      error: 'Storm reports feed unavailable',
      message: error.message,
    }, { status: 502 });
  }
}
