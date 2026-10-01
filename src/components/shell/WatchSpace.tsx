'use client';

import { useEffect, useMemo, useState } from 'react';
import NewsWall from './NewsWall';
import CameraWall from './CameraWall';
import ChannelBrowser, { type Feed } from './ChannelBrowser';
import { useWallState } from './news-wall-state';
import type { ShellProps } from './types';

type Tab = 'wall' | 'channels' | 'cameras';
const TAB_LABEL: Record<Tab, string> = { wall: 'News wall', channels: 'Channels', cameras: 'Cameras' };

/** Watch: the multi-channel news wall, every live channel, and public cameras. */
export default function WatchSpace(props: ShellProps) {
  const { data, mapView, openLiveFeed, openCamera, layout } = props;
  const [tab, setTab] = useState<Tab>('wall');
  const [channels, setChannels] = useState<Feed[] | null>(null);
  const [cameras, setCameras] = useState<any[] | null>(Array.isArray(data?.cameras) ? data.cameras : null);
  const [wall, updateWall] = useWallState();
  const [added, setAdded] = useState<string | null>(null);

  // Right after a server restart channels are still being checked; ask again until they are.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    const load = () => fetch('/api/live-news').then((r) => r.json()).then((d) => {
      const feeds: Feed[] = d.feeds || [];
      setChannels(feeds);
      if (feeds.some((f) => f.live === null && f.channel_id) && ++tries < 8) timer = setTimeout(load, 6000);
    }).catch(() => setChannels((c) => c || []));
    load();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (tab !== 'cameras' || cameras) return;
    fetch('/api/cctv?region=all&v=2').then((r) => r.json()).then((d) => setCameras(d.cameras || [])).catch(() => setCameras([]));
  }, [tab, cameras]);

  const center = useMemo(() => ({ lat: mapView.latitude, lng: mapView.longitude }), [mapView.latitude, mapView.longitude]);

  const narrow = layout === 'phone' || layout === 'tablet-portrait';
  const onWall = useMemo(() => new Set((wall.lineups[wall.active]?.ids || []).filter(Boolean) as string[]), [wall]);

  // Adds a channel to the current lineup: the first empty screen, else the last one.
  const addToWall = (f: Feed) => {
    updateWall((s) => ({
      ...s,
      lineups: s.lineups.map((l, i) => {
        if (i !== s.active) return l;
        const ids = [...l.ids];
        while (ids.length < 9) ids.push(null);
        const empty = ids.indexOf(null);
        ids[empty === -1 ? 8 : empty] = f.id;
        return { ...l, ids };
      }),
    }));
    setAdded(f.name);
    setTimeout(() => setAdded(null), 2500);
  };

  const tabs = (
    <div role="tablist" aria-label="Watch" className="flex" style={{ padding: 4, borderRadius: 'var(--ui-radius)', background: 'var(--ui-surface)', border: '1px solid var(--ui-line)' }}>
      {(['wall', 'channels', 'cameras'] as Tab[]).map((t) => (
        <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
          style={{ height: 40, padding: narrow ? '0 12px' : '0 18px', borderRadius: 'calc(var(--ui-radius) - 3px)', border: 0, background: tab === t ? 'var(--ui-accent)' : 'transparent', color: tab === t ? 'var(--ui-on-accent)' : 'var(--ui-text-2)', fontSize: 15, fontWeight: tab === t ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {TAB_LABEL[t]}
        </button>
      ))}
    </div>
  );

  if (tab === 'wall') {
    return (
      <div className="flex flex-col gap-3" style={{ position: 'absolute', inset: 0, background: 'var(--ui-bg)', padding: narrow ? '16px 16px 12px' : '20px 24px 16px' }}>
        <div className="flex items-center justify-between gap-3" style={{ paddingRight: narrow ? 108 : 0 }}>{tabs}</div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <NewsWall feeds={channels} state={wall} update={updateWall} layout={layout} />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-scroll" style={{ position: 'absolute', inset: 0, background: 'var(--ui-bg)', padding: narrow ? '16px 16px 20px' : '20px 24px' }}>
      <div className="flex flex-col gap-4" style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ paddingRight: narrow ? 108 : 0 }}>
          {tabs}
          {tab === 'channels' && channels && <span style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>{channels.filter((c) => c.live === true && c.embed_allowed).length} of {channels.length} live in BEACON now</span>}
          {tab === 'cameras' && <span style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>{cameras ? cameras.length.toLocaleString() : '…'} cameras worldwide</span>}
        </div>

        {tab === 'channels' && (
          <ChannelBrowser feeds={channels} mode="inline" narrow={narrow} onWall={onWall}
            onPick={(f) => openLiveFeed(f.url, f.name, f.embed_allowed !== false)} onAdd={addToWall} />
        )}
        {added && <div role="status" className="ui-card" style={{ position: 'fixed', left: '50%', bottom: 96, transform: 'translateX(-50%)', padding: '10px 16px', zIndex: 60, fontSize: 14 }}>Added {added} to the wall</div>}
        {tab === 'cameras' && <CameraWall cameras={cameras} center={center} openCamera={openCamera} narrow={narrow} />}
      </div>
    </div>
  );
}
