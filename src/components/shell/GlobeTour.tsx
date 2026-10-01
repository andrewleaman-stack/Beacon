'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X, Orbit } from 'lucide-react';
import { buildTourStops } from '@/lib/globe-tour.mjs';
import type { GlobeTour, GlobeTourStop } from '@/components/BeaconMap';
import type { ThemeId } from '@/lib/ui-prefs';

/** Arc and ring colour per theme (hex, so the map can add a transparent tail). */
export const TOUR_COLORS: Record<ThemeId, string> = {
  command: '#D4AF37',
  'command-light': '#A67C00',
  atlas: '#3DDBC4',
  'atlas-day': '#0B7F72',
};

const SEV_WORD: Record<string, string> = { critical: 'CRITICAL', high: 'HIGH', elevated: 'WATCH', advisory: 'ADVISORY', low: 'LOW' };

/** Tour stops from situations, GDELT news and risky chokepoints; refreshed every 15 minutes. */
export function useTourStops(enabled: boolean, data: any): GlobeTourStop[] {
  const [stops, setStops] = useState<GlobeTourStop[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const json = (u: string): Promise<any> => fetch(u).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    const load = async () => {
      const [s, g, m] = await Promise.all([
        json('/api/situations'),
        json('/api/gdelt'),
        Array.isArray(data?.maritime_chokepoints) ? Promise.resolve({ chokepoints: data.maritime_chokepoints }) : json('/api/maritime'),
      ]);
      if (!alive) return;
      const next = buildTourStops({ situations: s?.situations, gdelt: g?.events, chokepoints: m?.chokepoints });
      if (next.length) setStops(next);
    };
    load();
    const iv = setInterval(() => { if (!document.hidden) load(); }, 15 * 60_000);
    return () => { alive = false; clearInterval(iv); };
    // Chokepoints from the dashboard data are a bonus; don't refetch every time data changes.
  }, [enabled]);
  return stops;
}

interface OverlayProps {
  tour: GlobeTour | null;
  index: number;
  compact: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  onExit: () => void;
}

/** Caption and controls drawn over the map while the tour runs. */
export function TourOverlay({ tour, index, compact, onPrev, onNext, onTogglePause, onExit }: OverlayProps) {
  const stops = tour?.stops || [];
  const stop = stops[index % Math.max(1, stops.length)];
  const ctl = { width: 44, height: 44, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line)', background: 'var(--ui-raised)', color: 'var(--ui-text)', cursor: 'pointer' } as const;
  return (
    <>
      <div className="absolute flex items-center gap-2" style={{ left: 16, top: 'calc(16px + env(safe-area-inset-top, 0px))', zIndex: 35, padding: '8px 14px', borderRadius: 999, background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', fontSize: 14, fontWeight: 600, boxShadow: 'var(--ui-shadow)' }}>
        <Orbit size={16} aria-hidden="true" style={{ color: 'var(--ui-accent-text)' }} /> Globe tour
        {tour?.paused && <span style={{ fontWeight: 500, color: 'var(--ui-text-2)' }}>· paused</span>}
      </div>

      {stop && (
        <div key={`${index}-${stop.label}`} className="absolute tour-caption" role="status" aria-live="polite"
          style={{ left: 16, right: compact ? 16 : 'auto', bottom: compact ? 96 : 24, width: compact ? 'auto' : 'min(560px, calc(100% - 32px))', zIndex: 35, padding: compact ? 16 : 22, borderRadius: 'var(--ui-radius)', background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', boxShadow: 'var(--ui-shadow)' }}>
          <div className="flex items-center justify-between gap-3" style={{ marginBottom: 8 }}>
            <span className="ui-sev" data-sev={stop.severity === 'elevated' ? 'advisory' : stop.severity}>{SEV_WORD[stop.severity || ''] || 'NOW'}</span>
            <span className="ui-data" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{(index % stops.length) + 1} / {stops.length}</span>
          </div>
          <div className="ui-heading" style={{ fontSize: compact ? 20 : 26, fontWeight: 700, lineHeight: 1.2, textTransform: 'none' }}>{stop.label}</div>
          {stop.detail && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ui-text-2)' }}>{stop.detail}</div>}
          <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
            <button onClick={onPrev} aria-label="Previous stop" className="flex items-center justify-center" style={ctl}><ChevronLeft size={20} aria-hidden="true" /></button>
            <button onClick={onTogglePause} aria-label={tour?.paused ? 'Resume tour' : 'Pause tour'} className="flex items-center justify-center" style={ctl}>
              {tour?.paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            </button>
            <button onClick={onNext} aria-label="Next stop" className="flex items-center justify-center" style={ctl}><ChevronRight size={20} aria-hidden="true" /></button>
            <button onClick={onExit} className="flex items-center gap-1.5" style={{ ...ctl, width: 'auto', padding: '0 14px', marginLeft: 'auto', fontSize: 14 }}><X size={16} aria-hidden="true" /> Exit tour</button>
          </div>
          {!compact && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ui-text-3)' }}>Space pauses · ← → step · T or Esc exits · touching the map pauses, the tour resumes after 20 s</div>}
        </div>
      )}
      {!stop && (
        <div className="absolute" style={{ left: 16, bottom: compact ? 96 : 24, zIndex: 35, padding: 16, borderRadius: 'var(--ui-radius)', background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', color: 'var(--ui-text-2)' }}>
          Finding what&apos;s happening…
        </div>
      )}
    </>
  );
}
