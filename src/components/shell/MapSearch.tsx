'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plane, Ship, Video, MapPin } from 'lucide-react';

export interface SearchHit {
  kind: 'place' | 'flight' | 'ship' | 'camera';
  label: string;
  detail?: string;
  lat: number;
  lng: number;
  id?: string;
  raw?: any;
}

interface Props {
  data: any;
  onPick: (hit: SearchHit) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

const ICON = { place: MapPin, flight: Plane, ship: Ship, camera: Video };

/** Searches places (OpenStreetMap) plus the aircraft, ships and cameras already loaded on the map. */
export default function MapSearch({ data, onPick, autoFocus, placeholder = 'Search places, flights, ships, cameras' }: Props) {
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 3) { setPlaces([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setPlaces((json.results || []).map((r: any) => ({ kind: 'place' as const, label: r.label.split(',').slice(0, 3).join(','), detail: 'Place', lat: r.lat, lng: r.lng })));
      } catch {
        setPlaces([]);
      }
    }, 450);
  }, [q]);

  const local = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [] as SearchHit[];
    const out: SearchHit[] = [];
    const flights = [...(data?.commercial_flights || []), ...(data?.private_flights || []), ...(data?.private_jets || []), ...(data?.military_flights || [])];
    for (const f of flights) {
      const cs = String(f.callsign || '').trim();
      if (cs.toLowerCase().includes(query) || String(f.registration || '').toLowerCase() === query || String(f.icao24 || '') === query) {
        out.push({ kind: 'flight', label: cs || f.icao24, detail: [f.model, f.registration].filter(Boolean).join(' · ') || 'Aircraft', lat: f.lat, lng: f.lng, id: f.icao24, raw: f });
        if (out.length >= 4) break;
      }
    }
    let ships = 0;
    for (const s of data?.maritime_ships || []) {
      if (String(s.name || '').toLowerCase().includes(query) || String(s.mmsi || '') === query) {
        out.push({ kind: 'ship', label: s.name || String(s.mmsi), detail: [s.type, s.destination && `→ ${s.destination}`].filter(Boolean).join(' · ') || 'Vessel', lat: s.lat, lng: s.lng, id: String(s.mmsi), raw: s });
        if (++ships >= 3) break;
      }
    }
    let cams = 0;
    for (const c of data?.cameras || []) {
      if (`${c.name || ''} ${c.city || ''}`.toLowerCase().includes(query)) {
        out.push({ kind: 'camera', label: c.name || 'Camera', detail: [c.city, c.country].filter(Boolean).join(', ') || 'Public camera', lat: c.lat, lng: c.lng, raw: c });
        if (++cams >= 3) break;
      }
    }
    return out.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng));
  }, [q, data]);

  const hits = [...local, ...places].slice(0, 9);

  return (
    <div className="relative" style={{ width: '100%' }}>
      <label className="flex items-center gap-2.5" style={{ height: 48, padding: '0 14px', borderRadius: 'var(--ui-control-radius)', background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', boxShadow: 'var(--ui-shadow)' }}>
        <Search size={20} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--ui-text-2)', flexShrink: 0 }} />
        <span className="sr-only">Search the map</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { onPick(hits[0]); setOpen(false); } if (e.key === 'Escape') setOpen(false); }}
          placeholder={placeholder}
          style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', color: 'var(--ui-text)', fontSize: 16, outline: 'none' }}
        />
      </label>
      {open && hits.length > 0 && (
        <ul role="listbox" className="ui-panel ui-scroll absolute left-0 right-0" style={{ top: 54, margin: 0, padding: 6, listStyle: 'none', maxHeight: 360, zIndex: 50 }}>
          {hits.map((h, i) => {
            const Icon = ICON[h.kind];
            return (
              <li key={`${h.kind}-${i}`}>
                <button role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(h); setOpen(false); setQ(''); }}
                  className="flex items-center gap-3 w-full text-left" style={{ minHeight: 48, padding: '0 10px', borderRadius: 10, border: 0, background: 'transparent', cursor: 'pointer' }}>
                  <Icon size={18} aria-hidden="true" style={{ color: 'var(--ui-text-2)', flexShrink: 0 }} />
                  <span className="flex flex-col" style={{ minWidth: 0 }}>
                    <span className="truncate" style={{ fontSize: 15 }}>{h.label}</span>
                    {h.detail && <span className="truncate" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{h.detail}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
