export const FEED_DEFINITIONS: Array<{
  key: string;
  label: string;
  dataKeys: string[];
  layerKey: string;
  staleAfterMs: number;
}>;

export function classifyFeedStatus(input: {
  count: number;
  lastEventAt: number | null;
  required: boolean;
  staleAfterMs: number;
  now?: number;
}): 'healthy' | 'stale' | 'offline' | 'idle';

export function buildFeedHealthSnapshot(input?: {
  data?: Record<string, unknown>;
  activeLayers?: Record<string, boolean>;
  backendStatus?: 'connecting' | 'connected' | 'error' | string;
  probeResults?: Array<{ path: string; ok: boolean; error?: string | null }>;
  now?: number;
}): {
  platform: 'BEACON';
  status: 'operational' | 'degraded' | 'offline';
  backendStatus: string;
  checkedAt: string;
  summary: {
    totalFeeds: number;
    activeFeeds: number;
    totalRecords: number;
    healthy: number;
    stale: number;
    offline: number;
    idle: number;
  };
  feeds: Array<{
    key: string;
    label: string;
    status: 'healthy' | 'stale' | 'offline' | 'idle';
    active: boolean;
    count: number;
    lastEventAt: string | null;
    ageSeconds: number | null;
    staleAfterSeconds: number;
    dataKeys: string[];
  }>;
  events: Array<{
    id: string;
    type: 'probe_failed' | 'feed_offline' | 'feed_stale' | 'feed_refreshed';
    severity: 'error' | 'warning' | 'info';
    feedKey: string;
    label: string;
    message: string;
    timestamp: string;
  }>;
};
