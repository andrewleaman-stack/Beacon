'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play, Video } from 'lucide-react';
import { contactsNear } from '@/lib/geo-nearby.mjs';
import type { ShellProps } from './types';

type Tab = 'news' | 'cameras';

/** Watch: live TV channels and public cameras. */
export default function WatchSpace(props: ShellProps) {
  const { data, mapView, openLiveFeed, openCamera, layout } = props;
  const [tab, setTab] = useState<Tab>('news');
  const [channels, setChannels] = useState<any[] | null>(null);
  const [cameras, setCameras] = useState<any[] | null>(Array.isArray(data?.cameras) ? data.cameras : null);
  const [region, setRegion] = useState('All');

  useEffect(() => {
    fetch('/api/live-news').then((r) => r.json()).then((d) => setChannels(d.feeds || [])).catch(() => setChannels([]));
  }, []);

  useEffect(() => {
    if (tab !== 'cameras' || cameras) return;
    fetch('/api/cctv?region=all&v=2').then((r) => r.json()).then((d) => setCameras(d.cameras || [])).catch(() => setCameras([]));
  }, [tab, cameras]);

  const nearby = useMemo(() => {
    if (!cameras) return [];
    return contactsNear({ lat: mapView.latitude, lng: mapView.longitude }, { camera: cameras }, { radiusKm: 20000, limit: 48 });
  }, [cameras, mapView.latitude, mapView.longitude]);

  const regions = useMemo(() => ['All', ...Array.from(new Set((channels || []).map((c) => c.country).filter(Boolean)))], [channels]);
  const shown = (channels || []).filter((c) => region === 'All' || c.country === region);
  const narrow = layout === 'phone' || layout === 'tablet-portrait';

  return (
    <div className="ui-scroll" style={{ position: 'absolute', inset: 0, background: 'var(--ui-bg)', padding: narrow ? '20px 16px' : '24px 28px' }}>
      <div className="flex flex-col gap-4" style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Watch" className="flex" style={{ padding: 4, borderRadius: 'var(--ui-radius)', background: 'var(--ui-surface)', border: '1px solid var(--ui-line)' }}>
            {(['news', 'cameras'] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                style={{ height: 40, padding: '0 18px', borderRadius: 'calc(var(--ui-radius) - 3px)', border: 0, background: tab === t ? 'var(--ui-accent)' : 'transparent', color: tab === t ? 'var(--ui-on-accent)' : 'var(--ui-text-2)', fontSize: 15, fontWeight: tab === t ? 600 : 500, cursor: 'pointer' }}>
                {t === 'news' ? 'Live TV' : 'Cameras'}
              </button>
            ))}
          </div>
          {tab === 'news' && (
            <div role="tablist" aria-label="Country" className="flex gap-1.5 flex-wrap">
              {regions.slice(0, 10).map((r) => <button key={r} role="tab" className="ui-chip" aria-selected={region === r} onClick={() => setRegion(r)}>{r}</button>)}
            </div>
          )}
          {tab === 'cameras' && <span style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>Nearest to the map&apos;s centre · {cameras ? cameras.length.toLocaleString() : '…'} cameras available</span>}
        </div>

        {tab === 'news' && (
          <>
            {channels === null && <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>Loading channels…</div>}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0, 1fr))` }}>
              {shown.map((c) => (
                <button key={c.id || c.name} onClick={() => openLiveFeed(c.url, c.name, c.embed_allowed !== false)} className="ui-card flex items-center gap-3 text-left" style={{ padding: 14, minHeight: 72, cursor: 'pointer' }}>
                  <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 'var(--ui-control-radius)', background: 'var(--ui-accent-soft)', color: 'var(--ui-accent-text)', flexShrink: 0 }}><Play size={20} aria-hidden="true" /></span>
                  <span className="flex flex-col" style={{ minWidth: 0 }}>
                    <b className="truncate" style={{ fontSize: 16 }}>{c.name}</b>
                    <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{[c.city, c.country].filter(Boolean).join(', ')}{c.embed_allowed === false ? ' · opens on YouTube' : ''}</span>
                  </span>
                </button>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ui-text-2)' }}>A multi-channel news wall with tap-to-hear audio is coming next.</p>
          </>
        )}

        {tab === 'cameras' && (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${narrow ? 1 : 3}, minmax(0, 1fr))` }}>
            {cameras === null && <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>Loading cameras…</div>}
            {nearby.map((c) => (
              <button key={c.item.id || `${c.item.lat},${c.item.lng}`} onClick={() => openCamera({ ...c.item, type: 'cctv' })} className="ui-card flex items-center gap-3 text-left" style={{ padding: 14, minHeight: 72, cursor: 'pointer' }}>
                <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 'var(--ui-control-radius)', background: 'var(--ui-surface-2)', color: 'var(--ui-text-2)', flexShrink: 0 }}><Video size={20} aria-hidden="true" /></span>
                <span className="flex flex-col" style={{ minWidth: 0 }}>
                  <b className="truncate" style={{ fontSize: 15 }}>{c.item.name || 'Camera'}</b>
                  <span className="truncate" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{[c.item.city, c.item.country].filter(Boolean).join(', ')} · {c.km < 10 ? c.km.toFixed(1) : Math.round(c.km).toLocaleString()} km</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
