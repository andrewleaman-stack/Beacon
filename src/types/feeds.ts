// Feed/context types live in the AI engine (single source of truth).
export type {
  EarthquakeEvent,
  NewsItem,
  ThreatEvent,
  CyberAlert,
  IntelligenceContext,
} from '@/lib/ai-engine';

// The layer keys the live dashboard (src/app/page.tsx activeLayers) uses.
export type LayerKey =
  | 'flights'
  | 'private'
  | 'jets'
  | 'military'
  | 'maritime'
  | 'satellites'
  | 'balloons'
  | 'cctv'
  | 'live_news'
  | 'news_intel'
  | 'earthquakes'
  | 'fires'
  | 'weather'
  | 'radiation'
  | 'port_disruptions'
  | 'conflict_events'
  | 'infrastructure'
  | 'global_incidents'
  | 'war_alerts'
  | 'gps_jamming'
  | 'day_night'
  | 'cables'
  | 'sdk_sea'
  | 'sdk_air'
  | 'sdk_naval'
  | 'malware';

export interface ActiveLayers {
  [key: string]: boolean;
}