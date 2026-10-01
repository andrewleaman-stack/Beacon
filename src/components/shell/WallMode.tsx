'use client';

import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { loadPlaces, type Place } from '@/components/MyPlacesPanel';
import type { ShellProps } from './types';

const SEV_WORD: Record<string, string> = { critical: 'CRITICAL', high: 'HIGH', elevated: 'WATCH', advisory: 'ADVISORY', low: 'LOW' };

/** Ambient wall / TV display: readable from across a room, no interaction needed. */
export default function WallMode(props: ShellProps & { onSettings: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const [places, setPlaces] = useState<Place[]>([]);
  const [watch, setWatch] = useState<Record<string, any>>({});
  const [health, setHealth] = useState<{ healthy: number; total: number } | null>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    const list = loadPlaces();
    setPlaces(list);
    const load = async () => {
      try {
        // Stories come from the globe tour (ModernShell runs it in wall mode).
        const h = await fetch('/api/feed-health').then((r) => r.json());
        if (h?.summary) setHealth({ healthy: h.summary.healthy, total: h.summary.totalFeeds });
      } catch { /* keep last */ }
      for (const p of list) {
        try {
          const res = await fetch(`/api/place-watch?lat=${p.lat}&lng=${p.lng}&radius=${p.radiusKm}`);
          if (res.ok) { const j = await res.json(); setWatch((w) => ({ ...w, [p.id]: j })); }
        } catch { /* keep last */ }
      }
    };
    load();
    const iv = setInterval(load, 5 * 60_000);
    return () => clearInterval(iv);
  }, []);

  const stops = props.tour?.stops || [];
  const story = stops.length ? stops[props.tourIndex % stops.length] : null;

  return (
    <div className="absolute" style={{ inset: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) min(38vw, 720px)' }}
      onMouseMove={() => { setShowControls(true); }} onMouseLeave={() => setShowControls(false)}>
      <div className="relative" style={{ minWidth: 0 }}>
        <div className="absolute flex items-center gap-4" style={{ left: 40, top: 32, zIndex: 20 }}>
          <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--ui-accent)', color: 'var(--ui-accent-text)', fontFamily: 'var(--ui-font-display)', fontWeight: 700, fontSize: 26 }}>B</span>
          <span className="ui-heading" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '0.12em' }}>BEACON</span>
        </div>
        {showControls && (
          <button onClick={props.onSettings} className="absolute flex items-center gap-2" style={{ left: 40, bottom: 32, zIndex: 20, minHeight: 56, padding: '0 20px', borderRadius: 14, border: '1px solid var(--ui-line)', background: 'var(--ui-raised)', fontSize: 22, cursor: 'pointer' }}>
            <Settings size={24} aria-hidden="true" /> Settings
          </button>
        )}
      </div>

      <aside className="flex flex-col" style={{ background: 'var(--ui-bg)', borderLeft: '1px solid var(--ui-line)', padding: '44px 44px 36px', gap: 34, overflow: 'hidden' }}>
        <div className="flex flex-col gap-1">
          <div className="ui-data" style={{ fontSize: 96, fontWeight: 500, lineHeight: 1 }}>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontSize: 28, color: 'var(--ui-text-2)' }}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>

        {places.length > 0 && (
          <section aria-label="Your places" className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {places.slice(0, 4).map((p) => {
              const w = watch[p.id];
              const level = w?.status || 'clear';
              const color = `var(--sev-${level === 'warning' ? 'critical' : level})`;
              return (
                <div key={p.id} className="ui-card flex flex-col gap-1.5" style={{ padding: 20 }}>
                  <span className="flex items-center justify-between gap-2"><b className="truncate" style={{ fontSize: 30 }}>{p.label.split(',')[0]}</b><span style={{ width: 18, height: 18, borderRadius: '50%', background: color, flexShrink: 0 }} /></span>
                  <span style={{ fontSize: 26, color: 'var(--ui-text-2)' }}>{w?.weather?.tempF != null ? `${Math.round(w.weather.tempF)}° ${w.weather.conditions}` : '—'}</span>
                  {w?.alerts?.[0] && <span style={{ fontSize: 22, color: 'var(--sev-advisory)' }}>{w.alerts[0].event}</span>}
                </div>
              );
            })}
          </section>
        )}

        {story && (
          <section aria-label="Now" className="ui-card flex flex-col gap-3.5" style={{ padding: 28 }}>
            <div className="flex items-center justify-between gap-3">
              <span className="ui-sev" data-sev={story.severity === 'elevated' ? 'advisory' : story.severity} style={{ fontSize: 22, padding: '6px 12px' }}>{SEV_WORD[story.severity || ''] || 'NOW'}</span>
              <span style={{ fontSize: 22, color: 'var(--ui-text-2)' }}>{(props.tourIndex % stops.length) + 1} of {stops.length}</span>
            </div>
            <div key={story.label} className="ui-heading tour-caption" style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.12, textTransform: 'none' }}>{story.label}</div>
            {story.detail && <div style={{ fontSize: 26, color: 'var(--ui-text-2)' }}>{story.detail}</div>}
          </section>
        )}

        {health && (
          <div className="flex items-center gap-3" style={{ marginTop: 'auto', fontSize: 24, color: 'var(--ui-text-2)' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--sev-clear)' }} />
            {health.healthy} of {health.total} sources live
          </div>
        )}
      </aside>
    </div>
  );
}
