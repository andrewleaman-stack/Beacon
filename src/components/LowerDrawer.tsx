'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Database, Radio, ShieldAlert, Wifi } from 'lucide-react';

type DrawerTab = 'feed' | 'health' | 'raw' | 'alerts';

interface LowerDrawerProps {
  data: Record<string, unknown>;
  activeLayers: Record<string, boolean>;
  backendStatus: 'connecting' | 'connected' | 'error';
  mapView: { zoom: number; latitude: number };
  open: boolean;
  onToggle: () => void;
}

interface FeedHealthSnapshot {
  status: 'operational' | 'degraded' | 'offline';
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
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getTime(value: unknown): number {
  if (!value) return 0;
  const t = new Date(String(value)).getTime();
  return Number.isFinite(t) ? t : 0;
}

function shortNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function latestTimestamp(items: unknown[]): string {
  const latest = items.reduce<number>((max, item) => {
    if (!item || typeof item !== 'object') return max;
    const record = item as Record<string, unknown>;
    return Math.max(
      max,
      getTime(record.time),
      getTime(record.published),
      getTime(record.timestamp),
      getTime(record.updated_at),
      getTime(record.last_seen),
    );
  }, 0);
  return latest ? new Date(latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function severityTone(count: number): string {
  if (count > 100) return 'text-[#FF3D3D] border-[#FF3D3D]/30 bg-[#FF3D3D]/10';
  if (count > 20) return 'text-[#FF9500] border-[#FF9500]/30 bg-[#FF9500]/10';
  if (count > 0) return 'text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10';
  return 'text-[var(--alert-green)] border-[var(--alert-green)]/20 bg-[var(--alert-green)]/10';
}

function feedDot(status?: string): string {
  if (status === 'healthy') return 'bg-[var(--alert-green)] shadow-[0_0_8px_var(--alert-green)]';
  if (status === 'stale') return 'bg-[#FF9500] shadow-[0_0_8px_#FF9500]';
  if (status === 'offline') return 'bg-[#FF3D3D] shadow-[0_0_8px_#FF3D3D]';
  return 'bg-white/20';
}

function eventTone(severity: string): string {
  if (severity === 'error') return 'border-[#FF3D3D]/30 bg-[#FF3D3D]/10 text-[#FFB3B3]';
  if (severity === 'warning') return 'border-[#FF9500]/30 bg-[#FF9500]/10 text-[#FFD6A0]';
  return 'border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/5 text-white/70';
}

export default function LowerDrawer({ data, activeLayers, backendStatus, mapView, open, onToggle }: LowerDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('feed');
  const [feedHealth, setFeedHealth] = useState<FeedHealthSnapshot | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/feed-health', { cache: 'no-store' });
        if (!response.ok) return;
        const snapshot = await response.json();
        if (!cancelled) setFeedHealth(snapshot);
      } catch (error) {
        console.warn('[BEACON] Feed health fetch failed:', error instanceof Error ? error.message : error);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open]);

  const model = useMemo(() => {
    const feeds = [
      { key: 'news', label: 'OSINT NEWS', count: asArray(data.news).length, latest: latestTimestamp(asArray(data.news)), layer: activeLayers.news_intel, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'gdelt', label: 'GDELT EVENTS', count: asArray(data.gdelt).length, latest: latestTimestamp(asArray(data.gdelt)), layer: activeLayers.global_incidents, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'earthquakes', label: 'USGS QUAKES', count: asArray(data.earthquakes).length, latest: latestTimestamp(asArray(data.earthquakes)), layer: activeLayers.earthquakes, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'maritime', label: 'MARITIME AIS', count: asArray(data.maritime_ships).length + asArray(data.maritime_ports).length + asArray(data.maritime_chokepoints).length, latest: latestTimestamp(asArray(data.maritime_ships)), layer: activeLayers.maritime, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'live_news', label: 'LIVE FEEDS', count: asArray(data.live_feeds).length, latest: latestTimestamp(asArray(data.live_feeds)), layer: activeLayers.live_news, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'infrastructure', label: 'INFRASTRUCTURE', count: asArray(data.infrastructure).length, latest: latestTimestamp(asArray(data.infrastructure)), layer: activeLayers.infrastructure, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'weather', label: 'WEATHER', count: asArray(data.weather_events).length, latest: latestTimestamp(asArray(data.weather_events)), layer: activeLayers.weather, status: undefined as string | undefined, ageSeconds: null as number | null },
      { key: 'radiation', label: 'RADIATION', count: asArray(data.radiation).length, latest: latestTimestamp(asArray(data.radiation)), layer: activeLayers.radiation, status: undefined as string | undefined, ageSeconds: null as number | null },
    ];

    const activeFeedCount = feeds.filter(feed => feed.layer).length;
    const totalRecords = feeds.reduce((sum, feed) => sum + feed.count, 0);
    const rawEntries = Object.entries(data)
      .map(([key, value]) => ({ key, count: asArray(value).length, type: Array.isArray(value) ? 'array' : typeof value }))
      .filter(entry => entry.count > 0 || entry.type !== 'undefined')
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, 24);

    const alerts = [
      ...asArray(data.news).slice(0, 12).map((item, index) => {
        const record = item as Record<string, unknown>;
        const risk = Number(record.risk_score ?? 0);
        return {
          id: `news-${index}`,
          source: String(record.source || 'OSINT'),
          title: String(record.title || record.description || 'Untitled intelligence item'),
          severity: risk >= 8 ? 'CRITICAL' : risk >= 6 ? 'HIGH' : risk >= 4 ? 'ELEVATED' : 'LOW',
        };
      }),
      ...asArray(data.earthquakes).slice(0, 8).map((item, index) => {
        const record = item as Record<string, unknown>;
        const magnitude = Number(record.magnitude ?? 0);
        return {
          id: `quake-${index}`,
          source: 'USGS',
          title: `M${magnitude || '?'} ${String(record.place || 'earthquake')}`,
          severity: magnitude >= 6 ? 'CRITICAL' : magnitude >= 4.5 ? 'HIGH' : 'MODERATE',
        };
      }),
    ];

    return { feeds, activeFeedCount, totalRecords, rawEntries, alerts };
  }, [data, activeLayers]);

  const healthFeeds = useMemo(() => {
    if (!feedHealth) return model.feeds;
    return feedHealth.feeds.map(feed => ({
      key: feed.key,
      label: feed.label.toUpperCase(),
      count: feed.count,
      latest: feed.lastEventAt ? new Date(feed.lastEventAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      layer: feed.active,
      status: feed.status,
      ageSeconds: feed.ageSeconds,
    }));
  }, [feedHealth, model.feeds]);

  const activeFeedCount = feedHealth?.summary.activeFeeds ?? model.activeFeedCount;
  const totalRecords = feedHealth?.summary.totalRecords ?? model.totalRecords;
  const operationalStatus = feedHealth?.status ?? (backendStatus === 'connected' ? 'operational' : backendStatus);

  const tabs: { id: DrawerTab; label: string; icon: typeof Activity; badge?: string }[] = [
    { id: 'feed', label: 'FEED CONSOLE', icon: Radio, badge: shortNumber(totalRecords) },
    { id: 'health', label: 'HEALTH', icon: Wifi, badge: operationalStatus.toUpperCase() },
    { id: 'raw', label: 'OPS EVENTS', icon: Database, badge: String(feedHealth?.events.length ?? model.rawEntries.length) },
    { id: 'alerts', label: 'WATCHLIST', icon: ShieldAlert, badge: String(model.alerts.length) },
  ];

  return (
    <div className="desktop-only fixed left-[92px] right-[92px] bottom-[34px] z-[210] pointer-events-none">
      <div className="flex justify-center pointer-events-auto">
        <button
          onClick={onToggle}
          className="glass-panel flex items-center gap-2 px-4 py-2 text-[9px] font-mono tracking-[0.2em] text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)]/50 transition-colors"
          aria-expanded={open}
          aria-controls="beacon-lower-drawer"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>OPS DRAWER</span>
          <span className="text-[var(--text-muted)]/60">{activeFeedCount} ACTIVE</span>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.section
            id="beacon-lower-drawer"
            initial={{ opacity: 0, y: 28, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 290 }}
            exit={{ opacity: 0, y: 28, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-2 overflow-hidden pointer-events-auto"
          >
            <div className="glass-panel h-full border-[var(--cyan-primary)]/20 bg-black/80 backdrop-blur-xl shadow-[0_-18px_60px_rgba(0,229,255,0.08)]">
              <div className="flex h-full min-h-0">
                <div className="w-48 border-r border-white/10 bg-black/30 p-2 flex flex-col gap-1">
                  {tabs.map(({ id, label, icon: Icon, badge }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex items-center justify-between gap-2 rounded px-2.5 py-2 text-[9px] font-mono tracking-wider transition-colors ${tab === id ? 'bg-[var(--cyan-primary)]/15 text-[var(--cyan-primary)] border border-[var(--cyan-primary)]/30' : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                      <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</span>
                      {badge && <span className="text-[7px] opacity-70">{badge}</span>}
                    </button>
                  ))}
                  <div className="mt-auto rounded border border-white/10 bg-black/30 p-2 text-[8px] font-mono text-white/45 leading-relaxed">
                    <div>ZOOM <span className="text-[var(--gold-primary)]">{mapView.zoom.toFixed(1)}</span></div>
                    <div>LAT <span className="text-[var(--gold-primary)]">{mapView.latitude.toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="flex-1 min-w-0 p-3 overflow-y-auto styled-scrollbar">
                  {tab === 'feed' && (
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                      {healthFeeds.map(feed => (
                        <div key={feed.key} className={`rounded border p-3 ${feed.layer ? 'border-[var(--cyan-primary)]/25 bg-[var(--cyan-primary)]/5' : 'border-white/10 bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-mono tracking-widest text-white/70">{feed.label}</span>
                            <span className={`w-2 h-2 rounded-full ${feedDot(feed.status)}`} />
                          </div>
                          <div className="text-2xl font-mono font-bold text-[var(--gold-primary)] tabular-nums">{shortNumber(feed.count)}</div>
                          <div className="mt-2 text-[8px] font-mono text-white/40">LAST EVENT {feed.latest}{feed.ageSeconds != null ? ` · ${Math.round(feed.ageSeconds / 60)}M AGO` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'health' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[10px] font-mono">
                      <div className="rounded border border-white/10 bg-white/[0.03] p-4">
                        <div className="hud-label mb-2">FEED HEALTH</div>
                        <div className={`text-xl font-bold ${operationalStatus === 'operational' ? 'text-[var(--alert-green)]' : operationalStatus === 'degraded' ? 'text-[#FF9500]' : 'text-[#FF3D3D]'}`}>{operationalStatus.toUpperCase()}</div>
                        <div className="mt-2 text-white/40">Server-side probe snapshot{feedHealth ? ` · ${new Date(feedHealth.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' pending'}.</div>
                      </div>
                      <div className="rounded border border-white/10 bg-white/[0.03] p-4">
                        <div className="hud-label mb-2">ACTIVE FEEDS</div>
                        <div className="text-xl font-bold text-[var(--cyan-primary)]">{activeFeedCount}</div>
                        <div className="mt-2 text-white/40">Configured feed probes currently treated as operationally relevant.</div>
                      </div>
                      <div className="rounded border border-white/10 bg-white/[0.03] p-4">
                        <div className="hud-label mb-2">EVENT CACHE</div>
                        <div className="text-xl font-bold text-[var(--gold-primary)]">{shortNumber(totalRecords)}</div>
                        <div className="mt-2 text-white/40">Server probe totals with local fallback. Still not decorative nonsense.</div>
                      </div>
                      {feedHealth && (
                        <div className="lg:col-span-3 rounded border border-white/10 bg-black/30 p-3 grid grid-cols-4 gap-2">
                          <div><div className="hud-label">HEALTHY</div><div className="text-[var(--alert-green)] text-lg font-bold">{feedHealth.summary.healthy}</div></div>
                          <div><div className="hud-label">STALE</div><div className="text-[#FF9500] text-lg font-bold">{feedHealth.summary.stale}</div></div>
                          <div><div className="hud-label">OFFLINE</div><div className="text-[#FF3D3D] text-lg font-bold">{feedHealth.summary.offline}</div></div>
                          <div><div className="hud-label">IDLE</div><div className="text-white/40 text-lg font-bold">{feedHealth.summary.idle}</div></div>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'raw' && (
                    feedHealth?.events.length ? (
                      <div className="space-y-1.5 text-[9px] font-mono">
                        {feedHealth.events.map(event => (
                          <div key={event.id} className={`rounded border px-3 py-2 ${eventTone(event.severity)}`}>
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <span className="font-bold tracking-wider">{event.severity.toUpperCase()} · {event.label.toUpperCase()}</span>
                              <span className="text-white/35 tabular-nums">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="text-white/65">{event.message}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 text-[9px] font-mono">
                        {model.rawEntries.map(entry => (
                          <div key={entry.key} className="flex items-center justify-between rounded border border-white/10 bg-black/30 px-2.5 py-2">
                            <span className="truncate text-white/60">{entry.key}</span>
                            <span className="ml-2 text-[var(--cyan-primary)] tabular-nums">{entry.count || entry.type}</span>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {tab === 'alerts' && (
                    <div className="space-y-1.5">
                      {model.alerts.length === 0 ? (
                        <div className="rounded border border-white/10 bg-white/[0.03] p-6 text-center text-[10px] font-mono text-white/40">NO WATCHLIST EVENTS IN CURRENT CACHE</div>
                      ) : model.alerts.map(alert => (
                        <div key={alert.id} className={`rounded border px-3 py-2 text-[10px] font-mono ${severityTone(alert.severity === 'CRITICAL' ? 120 : alert.severity === 'HIGH' ? 60 : alert.severity === 'ELEVATED' ? 10 : 0)}`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold tracking-wider">{alert.severity}</span>
                                <span className="text-white/35">{alert.source}</span>
                              </div>
                              <div className="text-white/70 truncate">{alert.title}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
