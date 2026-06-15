import { NextResponse } from 'next/server';
import { version } from '../../../../package.json';

export async function GET() {
  return NextResponse.json({
    status: 'operational',
    platform: 'BEACON',
    version,
    uptime: process.uptime ? Math.round(process.uptime()) : 0,
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/flights',
      '/api/satellites',
      '/api/earthquakes',
      '/api/news',
      '/api/gdelt',
      '/api/markets',
      '/api/frontlines',
      '/api/region-dossier',
    ],
  });
}
