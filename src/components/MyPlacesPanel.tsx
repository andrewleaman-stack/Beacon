'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Place { id: string; label: string; lat: number; lng: number; radiusKm: number }
type Level = 'clear' | 'watch' | 'advisory' | 'warning';
interface Watch {
  status: Level;
  reasons: string[];
  alerts: { id: string; event: string; severity: string; headline: string; expires: string | null }[];
  alertsSource: string | null;
  weather: { tempF: number | null; conditions: string; windMph: number | null; gustMph: number | null; timezone: string | null } | null;
  timestamp: string;
}

const STORAGE_KEY = 'beacon.myPlaces';
const LEVEL_STYLE: Record<Level, { label: string; color: string }> = {
  clear: { label: 'CLEAR', color: '#5FD39A' },
  watch: { label: 'WATCH', color: '#90CAF9' },
  advisory: { label: 'ADVISORY', color: '#F0B54A' },
  warning: { label: 'WARNING', color: '#FF6B5E' },
};
const RANK: Record<Level, number> = { clear: 0, watch: 1, advisory: 2, warning: 3 };

export function loadPlaces(): Place[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter((p) => p && typeof p.label === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => ({ id: String(p.id || `${p.lat},${p.lng}`), label: p.label.slice(0, 48), lat: p.lat, lng: p.lng, radiusKm: Number(p.radiusKm) || 50 }))
      : [];
  } catch {
    return [];
  }
}

function savePlaces(places: Place[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places)); } catch { /* storage unavailable */ }
}

function localTime(timeZone: string | null | undefined) {
  if (!timeZone) return '';
  try { return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date()); } catch { return ''; }
}

interface Props {
  mapCenter: { lat: number; lng: number };
  onFlyTo: (lat: number, lng: number) => void;
  onClose: () => void;
  onWorstLevel?: (level: Level | null) => void;
}

export default function MyPlacesPanel({ mapCenter, onFlyTo, onClose, onWorstLevel }: Props) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [watch, setWatch] = useState<Record<string, Watch | 'error'>>({});
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [draft, setDraft] = useState<{ label: string; lat: number; lng: number; radiusKm: number } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => { setPlaces(loadPlaces()); }, []);

  const refresh = useCallback(async (list: Place[]) => {
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
    if (!places.length) return;
    refresh(places);
    const iv = setInterval(() => refresh(places), 5 * 60_000);
    const clock = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { clearInterval(iv); clearInterval(clock); };
  }, [places, refresh]);

  useEffect(() => {
    const levels = places.map((p) => watch[p.id]).filter((w): w is Watch => !!w && w !== 'error').map((w) => w.status);
    onWorstLevel?.(levels.length ? levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'clear' as Level) : null);
  }, [places, watch, onWorstLevel]);

  const update = (next: Place[]) => { setPlaces(next); savePlaces(next); };

  const search = async () => {
    if (query.trim().length < 2) return;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      setResults((await res.json()).results || []);
    } catch {
      setResults([]);
    }
  };

  const addDraft = () => {
    if (!draft) return;
    const place: Place = { id: `${Date.now()}`, label: draft.label.trim().slice(0, 48) || 'Place', lat: Number(draft.lat.toFixed(4)), lng: Number(draft.lng.toFixed(4)), radiusKm: draft.radiusKm };
    update([...places, place]);
    setDraft(null); setAdding(false); setQuery(''); setResults([]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...places];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <div className="glass-panel p-3 w-[340px] max-w-[calc(100vw-24px)] max-h-[70vh] overflow-y-auto styled-scrollbar font-mono">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-[var(--gold-primary)] tracking-wider">MY PLACES</h2>
        <div className="flex gap-2">
          <button onClick={() => setAdding((a) => !a)} className="text-[9px] tracking-wider border border-[var(--gold-primary)]/60 text-[var(--gold-primary)] rounded px-2 py-0.5">{adding ? 'CANCEL' : '+ ADD'}</button>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs" aria-label="Close my places">✕</button>
        </div>
      </div>

      {adding && (
        <div className="mb-3 p-2 border border-[var(--gold-primary)]/25 rounded flex flex-col gap-2">
          {!draft ? (
            <>
              <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); search(); }}>
                <input id="myplaces-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Town, address or landmark" className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded px-2 py-1 text-[11px] text-[var(--text-primary)]" />
                <button type="submit" className="text-[9px] border border-white/20 rounded px-2">FIND</button>
              </form>
              {results.map((r) => (
                <button key={`${r.lat},${r.lng}`} onClick={() => setDraft({ label: r.label.split(',').slice(0, 2).join(','), lat: r.lat, lng: r.lng, radiusKm: 50 })} className="text-left text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] truncate">
                  {r.label}
                </button>
              ))}
              <button onClick={() => setDraft({ label: 'Map center', lat: mapCenter.lat, lng: mapCenter.lng, radiusKm: 50 })} className="text-[9px] text-[var(--text-muted)] underline self-start">Use the current map center</button>
            </>
          ) : (
            <>
              <label className="text-[9px] text-[var(--text-muted)]" htmlFor="myplaces-name">NAME</label>
              <input id="myplaces-name" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="bg-black/30 border border-white/10 rounded px-2 py-1 text-[11px] text-[var(--text-primary)]" />
              <label className="text-[9px] text-[var(--text-muted)]" htmlFor="myplaces-radius">WATCH RADIUS</label>
              <select id="myplaces-radius" value={draft.radiusKm} onChange={(e) => setDraft({ ...draft, radiusKm: Number(e.target.value) })} className="bg-black/30 border border-white/10 rounded px-2 py-1 text-[11px] text-[var(--text-primary)]">
                {[10, 25, 50, 100, 200].map((km) => <option key={km} value={km}>{km} km ({Math.round(km * 0.621)} mi)</option>)}
              </select>
              <div className="text-[9px] text-[var(--text-muted)]">{draft.lat.toFixed(3)}, {draft.lng.toFixed(3)} · saved in this browser only</div>
              <button onClick={addDraft} className="text-[10px] font-bold tracking-wider border border-[var(--gold-primary)] text-[var(--gold-primary)] rounded py-1">SAVE PLACE</button>
            </>
          )}
        </div>
      )}

      {places.length === 0 && !adding && (
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Save the places you care about, like home or family, to see NWS alerts, current weather, and any quakes, fires, incidents or outages nearby. Places are stored in this browser only.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {places.map((p, i) => {
          const w = watch[p.id];
          const data = w && w !== 'error' ? w : null;
          const style = data ? LEVEL_STYLE[data.status] : null;
          return (
            <li key={p.id} className="border border-white/10 rounded p-2" style={style ? { borderLeft: `3px solid ${style.color}` } : undefined}>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onFlyTo(p.lat, p.lng)} className="text-left min-w-0">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] truncate">{p.label}</div>
                  <div className="text-[9px] text-[var(--text-muted)]">
                    {data?.weather ? `${localTime(data.weather.timezone)} · ${data.weather.tempF != null ? Math.round(data.weather.tempF) + '°F ' : ''}${data.weather.conditions}${data.weather.gustMph ? ` · gusts ${Math.round(data.weather.gustMph)} mph` : ''}` : w === 'error' ? 'Status unavailable' : 'Checking…'}
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {style && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ color: style.color, border: `1px solid ${style.color}80` }}>{style.label}</span>}
                  <button onClick={() => move(i, -1)} className="text-[10px] text-[var(--text-muted)] px-0.5" aria-label={`Move ${p.label} up`}>↑</button>
                  <button onClick={() => update(places.filter((x) => x.id !== p.id))} className="text-[10px] text-[var(--text-muted)] hover:text-[#FF6B5E] px-0.5" aria-label={`Remove ${p.label}`}>✕</button>
                </div>
              </div>
              {data && data.alerts.length > 0 && (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {data.alerts.slice(0, 3).map((a) => (
                    <li key={a.id || a.event} className="text-[9px] text-[var(--text-secondary)]">
                      <span className="font-bold" style={{ color: a.severity === 'Extreme' || a.severity === 'Severe' ? '#FF6B5E' : '#F0B54A' }}>{a.event}</span>
                      {a.expires ? ` until ${new Date(a.expires).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              {data && data.reasons.filter((r) => !data.alerts.some((a) => a.event === r)).slice(0, 3).map((r) => (
                <div key={r} className="text-[9px] text-[var(--text-muted)]">· {r}</div>
              ))}
              {data && !data.alertsSource && <div className="text-[8px] text-[var(--text-muted)] mt-1">Official weather alerts cover US locations only.</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
