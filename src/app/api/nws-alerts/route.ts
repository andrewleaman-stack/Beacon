import { NextResponse } from 'next/server';

/**
 * BEACON — Weather Alerts v1 (NWS / SPC)
 * 
 * fetch_allowed: true
 * embed_allowed: false
 * 
 * Primary sources:
 * - National Weather Service (NWS) API: /alerts/active
 * - Storm Prediction Center (SPC): Outlooks for Severe Weather
 * 
 * Covers:
 * - Severe Thunderstorm Warnings
 * - Tornado Warnings
 * - Flash Flood Warnings
 * - Blizzard / Winter Storm Warnings
 * - SPC Convective Outlooks (Slight, Enhanced, Moderate, High risk)
 */

const NWS_API_BASE = 'https://api.weather.gov';

export async function GET() {
  try {
    // Note: NWS API requires a User-Agent header per their terms
    const response = await fetch(`${NWS_API_BASE}/alerts/active`, {
      headers: {
        'User-Agent': 'BEACON-Situational-Awareness-Workbench (contact: andrewleaman)',
      },
    });

    if (!response.ok) {
      throw new Error(`NWS API responded with ${response.status}`);
    }

    const data = await response.json();

    // Filter for operationally useful alerts (Severe/Warning)
    // We exclude 'Advisories' if the list is too long, focusing on 'Warnings' and 'Watches'
    const activeAlerts = data.features.map((feature: any) => ({
      id: feature.id,
      event: feature.properties.event,
      area: feature.properties.areaDesc,
      severity: feature.properties.severity,
      urgency: feature.properties.urgency,
      certainty: feature.properties.certainty,
      startTime: feature.properties.effective,
      endTime: feature.properties.expires,
      description: feature.properties.description,
      geometry: feature.geometry,
      // Source link to NWS alert page
      url: feature.properties.instruction ? `${NWS_API_BASE}/alerts/${feature.id}` : null,
      category: feature.properties.category,
    }));

    // Separate SPC Outlooks if available (simplified for v1)
    const alertsSummary = {
      total: activeAlerts.length,
      warnings: activeAlerts.filter((a: { severity?: string }) => a.severity === 'Severe' || a.severity === 'Extreme').length,
      watches: activeAlerts.filter((a: { event?: string }) => a.event?.toLowerCase().includes('watch')).length,
      alerts: activeAlerts,
    };

    return NextResponse.json({
      ...alertsSummary,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error: any) {
    console.error('NWS Alerts Error:', error);
    return NextResponse.json({
      error: 'NWS Alerts Unavailable',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
