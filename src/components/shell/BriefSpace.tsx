'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { loadPlaces, type Place } from '@/components/MyPlacesPanel';
import MyPlacesPanel from '@/components/MyPlacesPanel';
import LiveAlerts from '@/components/LiveAlerts';
import { distanceKm } from '@/lib/geo-nearby.mjs';
import type { ShellProps, SpaceId } from './types';

type Level = 'clear' | 'watch' | 'advisory' | 'warning';
interface PlaceWatch { status: Level; reasons: string[]; alerts: any[]; weather: any; alertsSource: string | null }

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, elevated: 2, advisory: 2, watch: 1, low: 0 };
const SEV_LABEL: Record<string, string> = { critical: 'CRITICAL', high: 'HIGH', elevated: 'WATCH', low: 'LOW' };

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Morning brief' : h < 18 ? 'Afternoon brief' : 'Evening brief';
}

function ago(iso?: string | null) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins)) return '';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function localTime(tz?: string | null) {
  if (!tz) return '';
  try { return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date()); } catch { return ''; }
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="ui-heading" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{children}</h2>
      {action}
    </div>
  );
}

interface Props extends ShellProps { goSpace: (s: SpaceId) => void }

export default function BriefSpace(props: Props) {
  const { data, flyTo, goSpace, layout } = props;
  const [now, setNow] = useState(() => new Date());
  const [places, setPlaces] = useState<Place[]>([]);
  const [watch, setWatch] = useState<Record<string, PlaceWatch | 'error'>>({});
  const [situations, setSituations] = useState<any[] | null>(null);
  const [health, setHealth] = useState<{ healthy: number; total: number } | null>(null);
  const [filter, setFilter] = useState<'all' | 'near' | 'alerts'>('all');
  const [editPlaces, setEditPlaces] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ text: string; loading: boolean } | null>(null);
  const [onAir, setOnAir] = useState<any[]>([]);

  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(iv); }, []);

  const refreshPlaces = useCallback(async (list: Place[]) => {
    for (const p of list) {
      try {
        const res = await fetch(`/api/place-watch?lat=${p.lat}&lng=${p.lng}&radius=${p.radiusKm}`, { cache: 'no-store' });
        const json = await res.json();
        setWatch((w) => ({ ...w, [p.id]: res.ok ? json : 'error' }));
      } catch {
        setWatch((w) => ({ ...w, [p.id]: 'error' }));
      }
    }
  }, []);

  useEffect(() => {
    const list = loadPlaces();
    setPlaces(list);
    refreshPlaces(list);
    const iv = setInterval(() => refreshPlaces(loadPlaces()), 5 * 60_000);
    return () => clearInterval(iv);
  }, [refreshPlaces, editPlaces]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, h] = await Promise.all([
          fetch('/api/situations', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/feed-health', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setSituations(Array.isArray(s?.situations) ? s.situations : []);
        if (h?.summary) setHealth({ healthy: h.summary.healthy, total: h.summary.totalFeeds });
      } catch {
        if (!cancelled) setSituations((prev) => prev ?? []);
      }
    };
    load();
    const iv = setInterval(load, 3 * 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  useEffect(() => {
    fetch('/api/live-news').then((r) => r.json()).then((d) => setOnAir((d.feeds || []).filter((f: any) => f.embed_allowed !== false).slice(0, 2))).catch(() => {});
  }, []);

  const ranked = useMemo(() => {
    const list = (situations || []).map((s) => {
      const events: any[] = Array.isArray(s.events) ? s.events : [];
      const top = [...events].sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0))[0];
      let nearest: { place: Place; km: number } | null = null;
      if (s.centroid) {
        for (const p of places) {
          const km = distanceKm({ lat: p.lat, lng: p.lng }, s.centroid);
          if (!nearest || km < nearest.km) nearest = { place: p, km };
        }
      }
      return { ...s, headline: top?.title || s.title, nearest };
    });
    const near = (x: any) => x.nearest && x.nearest.km <= Math.max(150, x.nearest.place.radiusKm * 3);
    return list
      .filter((x) => filter !== 'near' || near(x))
      .sort((a, b) => ((SEV_RANK[b.topSeverity] ?? 0) + (near(b) ? 1.5 : 0)) - ((SEV_RANK[a.topSeverity] ?? 0) + (near(a) ? 1.5 : 0)) || (b.score || 0) - (a.score || 0));
  }, [situations, places, filter]);

  const placeLevels = places.map((p) => watch[p.id]).filter((w): w is PlaceWatch => !!w && w !== 'error');
  const worst = placeLevels.reduce<Level>((acc, w) => (['clear', 'watch', 'advisory', 'warning'].indexOf(w.status) > ['clear', 'watch', 'advisory', 'warning'].indexOf(acc) ? w.status : acc), 'clear');
  const notable = ranked.filter((s) => (SEV_RANK[s.topSeverity] ?? 0) >= 3).length;

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setAnswer({ text: '', loading: true });
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, situations: situations || [] }) });
      const json = await res.json();
      setAnswer({ text: json.answer || json.error || 'No answer.', loading: false });
    } catch {
      setAnswer({ text: 'Ask BEACON is unavailable right now.', loading: false });
    }
  };

  const showOnMap = (s: any) => {
    if (s.centroid) flyTo(s.centroid.lat, s.centroid.lng, 5);
    goSpace('map');
  };

  const narrow = layout === 'phone' || layout === 'tablet-portrait';

  return (
    <div className="ui-scroll" style={{ position: 'absolute', inset: 0, background: 'var(--ui-bg)', padding: narrow ? '20px 16px 24px' : '28px 32px' }}>
      <div className="flex flex-col" style={{ gap: 22, maxWidth: 1240, margin: '0 auto' }}>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1" style={{ paddingRight: narrow ? 108 : 0 }}>
            <div style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</div>
            <h1 className="ui-heading" style={{ margin: 0, fontSize: narrow ? 28 : 34, fontWeight: 700, textTransform: 'none' }}>{greeting(now)}</h1>
          </div>
          {places.length > 0 && (
            <div className="flex items-center gap-2.5" style={{ padding: '10px 16px', borderRadius: 999, background: `var(--sev-${worst === 'warning' ? 'critical' : worst}-soft)`, color: `var(--sev-${worst === 'warning' ? 'critical' : worst})`, fontSize: 15, fontWeight: 500 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'currentColor' }} />
              {worst === 'clear' ? `All ${places.length} places clear` : `Something to check at your places`}{notable ? ` · ${notable} high-priority elsewhere` : ''}
            </div>
          )}
        </header>

        <section aria-label="Your places" className="flex flex-col gap-3">
          <SectionTitle action={<button onClick={() => setEditPlaces(true)} style={{ border: 0, background: 'transparent', color: 'var(--ui-accent-text)', fontSize: 14, cursor: 'pointer', minHeight: 44 }}>{places.length ? 'Edit places' : 'Add places'}</button>}>Your places</SectionTitle>
          {places.length === 0 ? (
            <div className="ui-card" style={{ padding: 18, fontSize: 15, color: 'var(--ui-text-2)' }}>
              Add home, family or anywhere you care about. Each place shows official weather alerts, local weather and anything happening nearby. Saved in this browser only.
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${narrow ? 2 : Math.min(4, places.length)}, minmax(0, 1fr))` }}>
              {places.map((p) => {
                const w = watch[p.id];
                const d = w && w !== 'error' ? w : null;
                const level = d?.status;
                return (
                  <button key={p.id} onClick={() => { flyTo(p.lat, p.lng, 8); goSpace('map'); }} className="ui-card text-left flex flex-col gap-1.5" style={{ padding: 14, cursor: 'pointer' }}>
                    <span className="flex items-center justify-between gap-2 w-full">
                      <b className="truncate" style={{ fontSize: 16 }}>{p.label}</b>
                      {level && <span className="ui-sev" data-sev={level}>{level.toUpperCase()}</span>}
                    </span>
                    <span className="ui-data" style={{ fontSize: 26 }}>{d?.weather?.tempF != null ? `${Math.round(d.weather.tempF)}°` : '—'}</span>
                    <span style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>
                      {d ? `${d.weather?.conditions || ''}${d.weather?.timezone ? ` · ${localTime(d.weather.timezone)}` : ''}` : w === 'error' ? 'Status unavailable' : 'Checking…'}
                    </span>
                    {d && d.alerts?.length > 0 && <span style={{ fontSize: 13, color: 'var(--sev-advisory)' }}>{d.alerts[0].event}</span>}
                    {d && !d.alerts?.length && d.reasons?.length > 0 && <span className="truncate" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{d.reasons[0]}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6" style={{ gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 320px' }}>
          <section aria-label="Needs attention" className="flex flex-col gap-3" style={{ minWidth: 0 }}>
            <SectionTitle action={
              <div role="tablist" aria-label="Filter" className="flex gap-1.5">
                <button role="tab" className="ui-chip" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>All</button>
                <button role="tab" className="ui-chip" aria-selected={filter === 'near'} onClick={() => setFilter('near')}>Near my places</button>
                <button role="tab" className="ui-chip" aria-selected={filter === 'alerts'} onClick={() => setFilter('alerts')}>All alerts</button>
              </div>
            }>Needs attention</SectionTitle>

            {filter === 'alerts' ? (
              <div className="legacy-scope" style={{ minHeight: 420 }}>
                <LiveAlerts data={data} onLocate={(lat, lng) => { flyTo(lat, lng); goSpace('map'); }} onWatchFeed={(url, name) => props.openLiveFeed(url, name)} />
              </div>
            ) : situations === null ? (
              <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>Checking every source…</div>
            ) : ranked.length === 0 ? (
              <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>{filter === 'near' ? 'Nothing reported near your places.' : 'No active situations right now.'}</div>
            ) : (
              <ul className="ui-card flex flex-col" style={{ margin: 0, padding: 0, listStyle: 'none', overflow: 'hidden' }}>
                {ranked.slice(0, 8).map((s, i) => (
                  <li key={s.id} style={{ borderTop: i ? '1px solid var(--ui-line)' : 0 }}>
                    <button onClick={() => showOnMap(s)} className="grid items-center w-full text-left" style={{ gridTemplateColumns: narrow ? '1fr auto' : '96px minmax(0, 1fr) auto', gap: 14, padding: '14px 16px', border: 0, background: 'transparent', cursor: 'pointer' }}>
                      {!narrow && <span className="ui-sev" data-sev={s.topSeverity} style={{ justifyContent: 'center' }}>{SEV_LABEL[s.topSeverity] || String(s.topSeverity).toUpperCase()}</span>}
                      <span className="flex flex-col gap-1" style={{ minWidth: 0 }}>
                        {narrow && <span className="ui-sev" data-sev={s.topSeverity} style={{ alignSelf: 'flex-start' }}>{SEV_LABEL[s.topSeverity] || String(s.topSeverity).toUpperCase()}</span>}
                        <b style={{ fontSize: 16, lineHeight: 1.3 }}>{s.headline}</b>
                        <span style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>
                          {[s.country || null, `${s.eventCount} report${s.eventCount === 1 ? '' : 's'}`, (s.sources || []).join(', '), ago(s.lastTime)].filter(Boolean).join(' · ')}
                          {s.nearest && s.nearest.km < 500 ? ` · ${Math.round(s.nearest.km)} km from ${s.nearest.place.label}` : ''}
                        </span>
                      </span>
                      <span className="flex items-center" style={{ fontSize: 14, color: 'var(--ui-accent-text)' }}>Map <ChevronRight size={16} aria-hidden="true" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-5" style={{ minWidth: 0 }}>
            <section aria-label="On air" className="flex flex-col gap-3">
              <SectionTitle action={<button onClick={() => goSpace('watch')} style={{ border: 0, background: 'transparent', color: 'var(--ui-accent-text)', fontSize: 14, cursor: 'pointer', minHeight: 44 }}>News wall ›</button>}>On air</SectionTitle>
              {onAir.length === 0 && <div className="ui-card" style={{ padding: 14, color: 'var(--ui-text-2)', fontSize: 14 }}>Loading channels…</div>}
              {onAir.map((f) => (
                <button key={f.id || f.name} onClick={() => props.openLiveFeed(f.url, f.name, f.embed_allowed !== false)} className="ui-card flex items-center justify-between gap-3 text-left" style={{ padding: '12px 14px', cursor: 'pointer', minHeight: 56 }}>
                  <span className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
                    <span className="ui-data" style={{ fontSize: 11, color: '#fff', background: 'var(--live-red)', borderRadius: 4, padding: '2px 6px' }}>LIVE</span>
                    <b className="truncate" style={{ fontSize: 15 }}>{f.name}</b>
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{f.country}</span>
                </button>
              ))}
            </section>

            <section aria-label="Ask BEACON" className="ui-card flex flex-col gap-2.5" style={{ padding: 16 }}>
              <h2 className="ui-heading flex items-center gap-2" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}><Sparkles size={18} aria-hidden="true" />Ask BEACON</h2>
              <label htmlFor="brief-ask" style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>Answers use BEACON&apos;s live situations only</label>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
                <input id="brief-ask" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What changed since this morning?"
                  style={{ flexGrow: 1, minWidth: 0, height: 44, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)', color: 'var(--ui-text)', padding: '0 12px', fontSize: 15 }} />
                <button type="submit" className="ui-btn ui-btn-primary">Ask</button>
              </form>
              {answer && (
                <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ui-text)', whiteSpace: 'pre-wrap' }}>{answer.loading ? 'Thinking…' : answer.text}</div>
              )}
            </section>

            {health && (
              <button onClick={() => goSpace('investigate')} className="flex items-center gap-2 text-left" style={{ border: 0, background: 'transparent', fontSize: 14, color: 'var(--ui-text-2)', cursor: 'pointer', minHeight: 44 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: health.healthy / Math.max(1, health.total) > 0.8 ? 'var(--sev-clear)' : 'var(--sev-advisory)' }} />
                {health.healthy} of {health.total} sources live
              </button>
            )}
          </aside>
        </div>
      </div>

      {editPlaces && (
        <div role="dialog" aria-modal="true" aria-label="Edit places" className="fixed flex items-start justify-center" style={{ inset: 0, zIndex: 900, background: 'var(--ui-scrim)', paddingTop: 60 }} onClick={() => setEditPlaces(false)}>
          <div className="legacy-scope relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditPlaces(false)} aria-label="Done" className="absolute flex items-center justify-center" style={{ right: -14, top: -14, width: 36, height: 36, borderRadius: '50%', border: 0, background: 'var(--ui-surface)', color: 'var(--ui-text)', zIndex: 2, cursor: 'pointer' }}><X size={16} aria-hidden="true" /></button>
            <MyPlacesPanel mapCenter={{ lat: props.mapView.latitude, lng: props.mapView.longitude }} onFlyTo={(lat, lng) => { flyTo(lat, lng, 8); setEditPlaces(false); goSpace('map'); }} onClose={() => setEditPlaces(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
