'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Settings } from 'lucide-react';
import { SidebarNav, BottomTabs } from './ShellNav';
import MapSpace from './MapSpace';
import BriefSpace from './BriefSpace';
import WatchSpace from './WatchSpace';
import InvestigateSpace from './InvestigateSpace';
import SettingsSheet from './SettingsSheet';
import WallMode from './WallMode';
import MapSearch, { type SearchHit } from './MapSearch';
import { MAP_PRESETS, applyPreset } from '@/lib/layer-catalog';
import type { ShellProps, SpaceId } from './types';

const SPACE_KEYS: Record<string, SpaceId> = { '1': 'brief', '2': 'map', '3': 'watch', '4': 'investigate' };
const SPACES: SpaceId[] = ['brief', 'map', 'watch', 'investigate'];

function initialSpace(): SpaceId {
  if (typeof window === 'undefined') return 'brief';
  const hash = window.location.hash.replace('#', '') as SpaceId;
  if (SPACES.includes(hash)) return hash;
  // A shared map link (lat/lon/layers) lands on the map, everything else on the Brief.
  const p = new URLSearchParams(window.location.search);
  return p.has('lat') || p.has('layers') ? 'map' : 'brief';
}

export default function ModernShell(props: ShellProps) {
  const { layout, theme, setActiveLayers } = props;
  const [space, setSpace] = useState<SpaceId>('brief');
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sources, setSources] = useState<{ live: number; total: number } | null>(null);
  const started = useRef(false);

  // First load: open the right space and start the map quiet unless a link set layers.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const first = initialSpace();
    setSpace(first);
    try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${first}`); } catch { /* ignore */ }
    if (!new URLSearchParams(window.location.search).has('layers')) {
      const overview = MAP_PRESETS.find((p) => p.id === 'overview')!;
      setActiveLayers((prev: any) => applyPreset(prev, overview));
    }
  }, [setActiveLayers]);

  const goSpace = useCallback((s: SpaceId) => {
    setSpace(s);
    try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${s}`); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const load = () => fetch('/api/feed-health').then((r) => r.json()).then((h) => { if (h?.summary) setSources({ live: h.summary.healthy, total: h.summary.totalFeeds }); }).catch(() => {});
    load();
    const iv = setInterval(load, 5 * 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowSearch(true); }
        return;
      }
      if (SPACE_KEYS[e.key]) goSpace(SPACE_KEYS[e.key]);
      if (e.key === '/') { e.preventDefault(); setShowSearch(true); }
      if (e.key === 'Escape') { setShowSearch(false); setShowSettings(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goSpace]);

  const pickSearch = (hit: SearchHit) => {
    setShowSearch(false);
    props.flyTo(hit.lat, hit.lng, hit.kind === 'place' ? 9 : 8);
    if (hit.kind === 'camera') props.openCamera({ ...hit.raw, type: 'cctv' });
    if ((hit.kind === 'flight' || hit.kind === 'ship') && hit.id) props.setTrackTarget({ kind: hit.kind, id: hit.id, label: hit.label, lat: hit.lat, lng: hit.lng });
    goSpace('map');
  };

  const spaceProps = { ...props, goSpace };
  const isTabs = layout === 'phone' || layout === 'tablet-portrait';
  const floatingTabs = layout === 'phone' && (theme === 'atlas' || theme === 'atlas-day');

  if (layout === 'wall') {
    return (
      <div className="modern-shell fixed overflow-hidden" data-theme={theme} data-layout="wall" style={{ inset: 0 }}>
        <div className="absolute" style={{ left: 0, top: 0, bottom: 0, right: 'min(38vw, 720px)' }}>{props.map}</div>
        <WallMode {...props} onSettings={() => setShowSettings(true)} />
        {showSettings && <SettingsSheet {...props} onClose={() => setShowSettings(false)} />}
        {props.overlays}
      </div>
    );
  }

  return (
    <div className="modern-shell fixed overflow-hidden" data-theme={theme} data-layout={layout} style={{ inset: 0, display: 'flex', flexDirection: isTabs ? 'column' : 'row' }}>
      {!isTabs && <SidebarNav space={space} onSpace={goSpace} onSearch={() => setShowSearch(true)} onSettings={() => setShowSettings(true)} sourcesLive={sources} />}

      <div className="relative" style={{ flexGrow: 1, minWidth: 0, minHeight: 0 }}>
        {/* The map stays mounted under every space so switching never reloads it. */}
        <div className="absolute" style={{ inset: 0 }}>{props.map}</div>
        {space === 'map' && <MapSpace {...props} />}
        {space === 'brief' && <BriefSpace {...spaceProps} />}
        {space === 'watch' && <WatchSpace {...props} />}
        {space === 'investigate' && <InvestigateSpace {...spaceProps} />}
        {isTabs && (
          <div className="absolute flex gap-2" style={{ right: 12, top: space === 'map' ? 'auto' : 12, bottom: space === 'map' ? (floatingTabs ? 96 : 12) : 'auto', zIndex: 45 }}>
            {space !== 'map' && (
              <button onClick={() => setShowSearch(true)} aria-label="Search" className="ui-btn flex items-center justify-center" style={{ background: 'var(--ui-raised)', width: 44, padding: 0 }}><Search size={20} aria-hidden="true" /></button>
            )}
            <button onClick={() => setShowSettings(true)} aria-label="Settings" className="ui-btn flex items-center justify-center" style={{ background: 'var(--ui-raised)', width: 44, padding: 0 }}><Settings size={20} aria-hidden="true" /></button>
          </div>
        )}
      </div>

      {isTabs && (
        <div style={floatingTabs ? { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50 } : { flexShrink: 0, zIndex: 50 }}>
          <BottomTabs space={space} onSpace={goSpace} onSearch={() => setShowSearch(true)} onSettings={() => setShowSettings(true)} floating={floatingTabs} />
        </div>
      )}

      {showSearch && (
        <div role="dialog" aria-modal="true" aria-label="Search" className="fixed flex justify-center" style={{ inset: 0, zIndex: 940, background: 'var(--ui-scrim)', paddingTop: '12vh' }} onClick={() => setShowSearch(false)}>
          <div style={{ width: 'min(640px, calc(100% - 32px))' }} onClick={(e) => e.stopPropagation()}>
            <MapSearch data={props.data} onPick={pickSearch} autoFocus />
          </div>
        </div>
      )}
      {showSettings && <SettingsSheet {...props} onClose={() => setShowSettings(false)} />}
      {props.overlays}
    </div>
  );
}
