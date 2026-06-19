/**
 * BEACON Unified Feed Types
 * Single source of truth for all feed response structures
 */

export type FeedStatus = 'ok' | 'stale' | 'error' | 'offline';

export interface FeedHealth {
  id: string;
  status: FeedStatus;
  last_update: string;
  latency: number;
  error?: string;
}

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  tsunami: boolean;
  felt: number | null;
  alert: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  machine_assessment: string | null;
}

export interface ThreatEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  region: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
}

export interface CyberAlert {
  id: string;
  name: string;
  vendor: string;
  product: string;
  severity: string;
  date: string;
  due: string;
  source: string;
}

export interface IntelligenceContext {
  earthquakes: EarthquakeEvent[];
  news: NewsItem[];
  threats: ThreatEvent[];
  cyberAlerts: CyberAlert[];
  timestamp: string;
  feedHealth?: Record<string, FeedHealth>;
}

export type LayerKey = 
  | 'flights' | 'military' | 'jets' | 'private-fl' | 'satellites' | 'earthquakes' 
  | 'gdelt' | 'gps-jamming' | 'day-night' | 'cctv' | 'fires' | 'weather' 
  | 'infrastructure' | 'maritime' | 'maritime-choke' | 'maritime-ships' 
  | 'live-news' | 'sigint-news' | 'conflict-zones' | 'war-alerts-targets' 
  | 'war-alerts-lines' | 'balloons' | 'radiation' | 'port-disruptions' 
  | 'conflict-events' | 'ip-sweep-devices' | 'ip-sweep-pulse' | 'ip-sweep-connections' 
  | 'scan-targets' | 'sdk-entities' | 'sdk-links' | 'malware-nodes' | 'network-mesh';

export interface ActiveLayers {
  [key: string]: boolean;
}