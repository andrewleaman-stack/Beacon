import { NextResponse } from 'next/server';

/**
 * BEACON — Infrastructure Incidents
 * 
 * Aggregates from multiple sources:
 * - PHMSA pipeline incidents (US)
 * - NRC nuclear event notifications
 * - Dams / levees (USACE National Inventory of Dams)
 * - Power outages (DOE OE-417 / utility APIs)
 * - Bridge / structural (NTSB / state DOT)
 * - Chemical / hazmat (EPA TRI / NRC)
 * 
 * For v1: Sample structure with source attribution
 */

interface InfraIncident {
  id: string;
  type: 'pipeline' | 'nuclear' | 'dam' | 'power' | 'bridge' | 'hazmat' | 'water' | 'comms' | 'other';
  title: string;
  description: string;
  lat: number;
  lng: number;
  severity: 'critical' | 'high' | 'elevated' | 'low';
  source: string;
  sourceUrl?: string;
  reportedAt: string;
  updatedAt?: string;
  status: 'active' | 'monitoring' | 'resolved';
  affectedPopulation?: number;
  affectedInfrastructure?: string[];
}

const SAMPLE_INCIDENTS: InfraIncident[] = [
  {
    id: 'infra-phmsa-2024-001',
    type: 'pipeline',
    title: 'Natural Gas Pipeline Leak — Monroe County, MI',
    description: 'Reported 2-inch gas distribution line leak near residential area. Evacuation radius 300m. Consumers Energy responding.',
    lat: 41.9164,
    lng: -83.3977,
    severity: 'high',
    source: 'PHMSA',
    sourceUrl: 'https://www.phmsa.dot.gov/',
    reportedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    status: 'active',
    affectedPopulation: 150,
    affectedInfrastructure: ['gas-distribution'],
  },
  {
    id: 'infra-nrc-2024-002',
    type: 'nuclear',
    title: 'Fermi 2 — Unusual Event (Terminated)',
    description: 'Unusual Event declared due to offsite power disruption. Event terminated after 4 hours. No radiological release.',
    lat: 41.9603,
    lng: -83.2555,
    severity: 'elevated',
    source: 'NRC',
    sourceUrl: 'https://www.nrc.gov/reading-rm/doc-collections/event-status/event/',
    reportedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    status: 'resolved',
    affectedInfrastructure: ['nuclear-power'],
  },
  {
    id: 'infra-doe-2024-003',
    type: 'power',
    title: 'Major Outage — DTE Energy Service Territory',
    description: 'Severe thunderstorm damage affecting 45,000 customers across Wayne and Monroe counties. ETR 24-48 hours.',
    lat: 42.3314,
    lng: -83.0458,
    severity: 'high',
    source: 'DOE OE-417',
    sourceUrl: 'https://www.oe.netl.doe.gov/oe417.aspx',
    reportedAt: new Date(Date.now() - 1 * 3600_000).toISOString(),
    status: 'active',
    affectedPopulation: 45000,
    affectedInfrastructure: ['electric-transmission', 'electric-distribution'],
  },
  {
    id: 'infra-usace-2024-004',
    type: 'dam',
    title: 'Lake Erie — High Water Advisory',
    description: 'Lake Erie water levels 18" above long-term average. Increased seepage monitoring at nearby dikes and levees.',
    lat: 41.8500,
    lng: -83.2000,
    severity: 'low',
    source: 'USACE',
    sourceUrl: 'https://www.lre.usace.army.mil/',
    reportedAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
    status: 'monitoring',
    affectedInfrastructure: ['levee', 'shoreline-protection'],
  },
];

export async function GET() {
  try {
    // In production, aggregate from multiple APIs
    // const [phmsa, nrc, doe, usace] = await Promise.all([...])

    return NextResponse.json({
      incidents: SAMPLE_INCIDENTS,
      total: SAMPLE_INCIDENTS.length,
      byType: SAMPLE_INCIDENTS.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: SAMPLE_INCIDENTS.reduce((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sources: ['PHMSA', 'NRC', 'DOE OE-417', 'USACE', 'EPA', 'NTSB'],
      lastUpdated: new Date().toISOString(),
      notice: 'Sample data — live aggregation requires API keys for PHMSA, NRC, DOE, USACE endpoints.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Infrastructure incidents feed unavailable',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}