'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Video, ImageOff, RefreshCw } from 'lucide-react';
import { contactsNear } from '@/lib/geo-nearby.mjs';
import { snapshotUrl } from '@/lib/snapshot-url';

interface Props {
  cameras: any[] | null;
  center: { lat: number; lng: number };
  openCamera: (cam: any) => void;
  narrow: boolean;
}

const PAGE = 24;
const REFRESH_MS = 60_000;

// Streaming cameras that also publish a still get a thumbnail; others show a video placeholder.
const isSnapshot = (c: any) => Boolean(c.thumb_url || c.feed_url) && (!c.stream_type || c.stream_type === 'jpg' || c.stream_type === 'hls');

function Thumb({ cam, tick }: { cam: any; tick: number }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [tick]);
  if (!isSnapshot(cam)) {
    return (
      <span className="flex flex-col items-center justify-center gap-1.5" style={{ position: 'absolute', inset: 0, color: 'var(--ui-text-2)', fontSize: 13 }}>
        <Video size={24} aria-hidden="true" /> Live video
      </span>
    );
  }
  if (broken) {
    return (
      <span className="flex flex-col items-center justify-center gap-1.5" style={{ position: 'absolute', inset: 0, color: 'var(--ui-text-3)', fontSize: 13 }}>
        <ImageOff size={22} aria-hidden="true" /> No image right now
      </span>
    );
  }
  return (
    <img src={snapshotUrl(cam.thumb_url || cam.feed_url, tick)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  );
}

/** A wall of live camera snapshots: nearest to the map, by country, or by search. */
export default function CameraWall({ cameras, center, openCamera, narrow }: Props) {
  const [scope, setScope] = useState<string>('near');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [tick, setTick] = useState(() => Math.floor(Date.now() / REFRESH_MS));

  useEffect(() => {
    const iv = setInterval(() => { if (!document.hidden) setTick(Math.floor(Date.now() / REFRESH_MS)); }, REFRESH_MS);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { setShown(PAGE); }, [scope, q]);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cameras || []) if (c.country) counts.set(c.country, (counts.get(c.country) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cameras]);

  const list = useMemo(() => {
    if (!cameras) return [];
    const needle = q.trim().toLowerCase();
    const pool = cameras.filter((c) => (scope === 'near' || c.country === scope)
      && (!needle || `${c.name || ''} ${c.city || ''} ${c.country || ''}`.toLowerCase().includes(needle)));
    const ranked = contactsNear(center, { camera: pool }, { radiusKm: 20000, limit: pool.length || 1 })
      .map((n: any) => ({ cam: n.item, km: n.km as number }));
    if (scope === 'near') return ranked;
    // A country view takes turns between its cities, so it isn't twelve shots of one bridge.
    const byCity = new Map<string, typeof ranked>();
    for (const r of ranked) {
      const k = r.cam.city || '';
      if (!byCity.has(k)) byCity.set(k, []);
      byCity.get(k)!.push(r);
    }
    const queues = [...byCity.values()];
    const mixed: typeof ranked = [];
    for (let i = 0; mixed.length < ranked.length; i++) for (const q of queues) if (q[i]) mixed.push(q[i]);
    return mixed;
  }, [cameras, scope, q, center]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2" style={{ flex: '1 1 240px', height: 44, padding: '0 12px', borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)' }}>
          <Search size={18} aria-hidden="true" style={{ color: 'var(--ui-text-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cameras, roads, cities" aria-label="Search cameras"
            style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: 'var(--ui-text)', fontSize: 15 }} />
        </label>
        <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}><RefreshCw size={14} aria-hidden="true" /> Snapshots refresh every minute</span>
      </div>
      <div role="tablist" aria-label="Where" className="flex gap-1.5" style={{ overflowX: 'auto', paddingBottom: 2 }}>
        <button role="tab" className="ui-chip" style={{ flexShrink: 0 }} aria-selected={scope === 'near'} onClick={() => setScope('near')}>Near the map</button>
        {countries.map(([name, n]) => (
          <button key={name} role="tab" className="ui-chip" style={{ flexShrink: 0 }} aria-selected={scope === name} onClick={() => setScope(name)}>{name} <span style={{ opacity: 0.6 }}>{n.toLocaleString()}</span></button>
        ))}
      </div>

      {cameras === null && <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>Loading cameras…</div>}
      {cameras && !list.length && <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>No cameras match.</div>}

      <ul className="grid gap-3" style={{ margin: 0, padding: 0, listStyle: 'none', gridTemplateColumns: `repeat(auto-fill, minmax(${narrow ? 160 : 220}px, 1fr))` }}>
        {list.slice(0, shown).map(({ cam, km }) => (
          <li key={cam.id || `${cam.lat},${cam.lng}`}>
            <button onClick={() => openCamera({ ...cam, type: 'cctv' })} className="ui-card flex flex-col text-left" style={{ width: '100%', padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
              <span style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', background: 'var(--ui-surface-2)' }}>
                <Thumb cam={cam} tick={tick} />
              </span>
              <span className="flex flex-col" style={{ padding: '8px 12px 10px', minWidth: 0, width: '100%' }}>
                <b className="truncate" style={{ fontSize: 14 }}>{cam.name || 'Camera'}</b>
                <span className="truncate" style={{ fontSize: 12, color: 'var(--ui-text-2)' }}>
                  {[cam.city, cam.country].filter(Boolean).join(', ')} · {km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString()} km
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length > shown && (
        <button className="ui-btn" style={{ alignSelf: 'center' }} onClick={() => setShown((n) => n + PAGE)}>Show more ({(list.length - shown).toLocaleString()} left)</button>
      )}
    </div>
  );
}
