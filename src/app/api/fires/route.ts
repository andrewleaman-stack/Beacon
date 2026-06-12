import { NextResponse } from 'next/server';

/**
 * BEACON — Active Fires / Thermal Anomalies (NASA FIRMS / VIIRS / MODIS)
 * 
 * Source: NASA FIRMS API (requires MAP_KEY for production)
 * Fallback: Sample structure for development
 * 
 * Covers:
 * - VIIRS 375m (Suomi NPP / NOAA-20)
 * - MODIS 1km (Terra / Aqua)
 * - Confidence levels: low / nominal / high
 * - Fire Radiative Power (FRP) in MW
 */

const FIRMS_API_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area';
// In production: const MAP_KEY = process.env.FIRMS_MAP_KEY;

interface FireRecord {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: 'low' | 'nominal' | 'high';
  version: string;
  bright_t31: number;
  frp: number;
  daynight: 'D' | 'N';
}

export async function GET() {
  try {
    // In production, fetch from NASA FIRMS:
    // const response = await fetch(`${FIRMS_API_BASE}/csv/${MAP_KEY}/VIIRS_SNPP_NRT/world/1`);
    // For now, return structured sample data with clear "not live" indicator

    const sampleFires: FireRecord[] = [
      {
        id: 'firms-sample-1',
        lat: 34.0522,
        lng: -118.2437,
        brightness: 320.5,
        scan: 1.2,
        track: 1.0,
        acq_date: new Date().toISOString().split('T')[0],
        acq_time: '1430',
        satellite: 'Suomi-NPP',
        instrument: 'VIIRS',
        confidence: 'high',
        version: '2.0NRT',
        bright_t31: 290.1,
        frp: 45.2,
        daynight: 'D',
      },
      {
        id: 'firms-sample-2',
        lat: 40.7128,
        lng: -74.0060,
        brightness: 315.8,
        scan: 1.1,
        track: 0.9,
        acq_date: new Date().toISOString().split('T')[0],
        acq_time: '1845',
        satellite: 'NOAA-20',
        instrument: 'VIIRS',
        confidence: 'nominal',
        version: '2.0NRT',
        bright_t31: 285.4,
        frp: 32.8,
        daynight: 'N',
      },
    ];

    return NextResponse.json({
      fires: sampleFires,
      total: sampleFires.length,
      sources: ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'],
      lastUpdated: new Date().toISOString(),
      notice: 'Sample data — NASA FIRMS API key required for live data. Set FIRMS_MAP_KEY env var.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Fires feed unavailable',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}