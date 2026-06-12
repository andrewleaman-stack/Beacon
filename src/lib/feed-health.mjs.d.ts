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
};
