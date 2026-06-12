import { NextResponse } from 'next/server';

/**
 * BEACON — OpenMHz / P25 Radio Feeds (Monroe County Focus)
 * 
 * NOT YET LIVE — Module prepared for activation when scanner hardware / stream access available.
 * 
 * OpenMHz provides live audio streams from public safety radio systems (P25, DMR, etc.)
 * Monroe County, MI systems of interest:
 * - Monroe County Public Safety (MPSCS / P25 Phase II)
 * - Monroe City Police / Fire
 * - Monroe County Sheriff
 * - Michigan State Police District 1
 * 
 * When live, each entry provides:
 * - system_id: OpenMHz system identifier
 * - short_name: Radio system short name
 * - frequencies: Known control channel frequencies
 * - talkgroups: Map of talkgroup IDs to descriptions
 * - stream_url: Icecast/WebSocket audio stream URL
 * - embed_allowed: Whether audio can be played inline
 */

const OPENMHZ_FEEDS = [
  // ── Monroe County, MI (target deployment area) ──
  {
    id: 'monroe-mpscs',
    name: 'Monroe County MPSCS',
    county: 'Monroe',
    state: 'MI',
    country: 'US',
    lat: 41.916,
    lng: -83.398,
    system_id: 'monroe-mpscs',           // OpenMHz system slug (when live)
    short_name: 'MPSCS',
    system_type: 'P25 Phase II',
    frequencies: ['851.0125', '851.5125', '852.0125', '852.5125'], // example control channels
    talkgroups: {
      1001: 'Monroe County Sheriff Dispatch',
      1002: 'Monroe City Police Dispatch',
      1003: 'Monroe County Fire Dispatch',
      1004: 'EMS / MedCom',
      1005: 'Public Works',
      1006: 'Animal Control',
      1007: 'Emergency Management',
    },
    stream_url: null,                    // Will be: 'https://openmhz.com/api/streams/monroe-mpscs/icecast.mp3' when live
    embed_allowed: false,                // Most OpenMHz streams require external player
    status: 'configured',                // 'configured' | 'live' | 'offline'
    category: 'public-safety',
    language: 'en',
    notes: 'Requires OpenMHz API access or local SDR + icecast relay. Not yet live.',
  },
  {
    id: 'monroe-msp-d1',
    name: 'MSP District 1 (Monroe)',
    county: 'Monroe',
    state: 'MI',
    country: 'US',
    lat: 41.916,
    lng: -83.398,
    system_id: 'michigan-msp-d1',
    short_name: 'MSP D1',
    system_type: 'P25 Phase II',
    frequencies: ['853.0125', '853.5125'],
    talkgroups: {
      2001: 'MSP District 1 Dispatch',
      2002: 'MSP Traffic',
      2003: 'MSP Special Ops',
    },
    stream_url: null,
    embed_allowed: false,
    status: 'configured',
    category: 'public-safety',
    language: 'en',
    notes: 'Michigan State Police District 1 covers Monroe County.',
  },
  {
    id: 'lenawee-mpscs',
    name: 'Lenawee County MPSCS (adjacent)',
    county: 'Lenawee',
    state: 'MI',
    country: 'US',
    lat: 41.867,
    lng: -84.032,
    system_id: 'lenawee-mpscs',
    short_name: 'Lenawee MPSCS',
    system_type: 'P25 Phase II',
    frequencies: ['851.2125', '851.7125'],
    talkgroups: {
      3001: 'Lenawee Sheriff',
      3002: 'Adrian PD',
      3003: 'Lenawee Fire',
    },
    stream_url: null,
    embed_allowed: false,
    status: 'configured',
    category: 'public-safety',
    language: 'en',
    notes: 'Adjacent county — mutual aid coordination.',
  },
];

export async function GET() {
  const liveCount = OPENMHZ_FEEDS.filter(f => f.status === 'live').length;

  return NextResponse.json({
    feeds: OPENMHZ_FEEDS,
    total: OPENMHZ_FEEDS.length,
    live: liveCount,
    configured: OPENMHZ_FEEDS.length - liveCount,
    counties: ['Monroe', 'Lenawee'],
    systems: ['MPSCS', 'MSP'],
    timestamp: new Date().toISOString(),
    notice: 'OpenMHz/P25 module prepared but NOT YET LIVE. Requires scanner hardware or OpenMHz API access. Feeds will activate when stream URLs are available.',
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      'X-BEACON-Feed-Status': liveCount > 0 ? 'live' : 'configured-only',
    },
  });
}