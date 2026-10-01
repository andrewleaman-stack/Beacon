'use client';

import { Crosshair, Globe2, Radar, Search, Settings, Tv } from 'lucide-react';
import type { SpaceId } from './types';

const SPACES: { id: SpaceId; label: string; icon: typeof Globe2 }[] = [
  { id: 'brief', label: 'Brief', icon: Radar },
  { id: 'map', label: 'Map', icon: Globe2 },
  { id: 'watch', label: 'Watch', icon: Tv },
  { id: 'investigate', label: 'Investigate', icon: Crosshair },
];

interface NavProps {
  space: SpaceId;
  onSpace: (s: SpaceId) => void;
  onSearch: () => void;
  onSettings: () => void;
  sourcesLive?: { live: number; total: number } | null;
}

/** Labelled left sidebar: iPad landscape and desktop. */
export function SidebarNav({ space, onSpace, onSearch, onSettings, sourcesLive }: NavProps) {
  return (
    <nav aria-label="Main" className="flex flex-col items-center gap-1.5 py-4 h-full" style={{ width: 92, background: 'var(--ui-nav)', borderRight: '1px solid var(--ui-line)' }}>
      <div aria-hidden="true" className="flex items-center justify-center mb-4" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--ui-accent)', color: 'var(--ui-accent-text)', fontFamily: 'var(--ui-font-display)', fontWeight: 700, fontSize: 18 }}>B</div>
      {SPACES.map((s) => {
        const active = s.id === space;
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            onClick={() => onSpace(s.id)}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-1"
            style={{ width: 76, height: 64, borderRadius: 12, border: 0, background: active ? 'var(--ui-accent-soft)' : 'transparent', color: active ? 'var(--ui-accent-text)' : 'var(--ui-text-2)', fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer' }}
          >
            <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
            {s.label}
          </button>
        );
      })}
      <div className="flex-grow" />
      <button onClick={onSearch} aria-label="Search" className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid var(--ui-line)', background: 'var(--ui-surface)', color: 'var(--ui-text)', cursor: 'pointer' }}>
        <Search size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button onClick={onSettings} aria-label="Settings" className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 12, border: 0, background: 'transparent', color: 'var(--ui-text-2)', cursor: 'pointer' }}>
        <Settings size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {sourcesLive && (
        <div title={`${sourcesLive.live} of ${sourcesLive.total} sources live`} className="ui-data flex items-center gap-1.5 mt-1" style={{ fontSize: 11, color: 'var(--ui-text-2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sourcesLive.live / Math.max(1, sourcesLive.total) > 0.8 ? 'var(--sev-clear)' : 'var(--sev-advisory)' }} />
          {sourcesLive.live}/{sourcesLive.total}
        </div>
      )}
    </nav>
  );
}

/** Bottom tab bar: phone and iPad portrait. Atlas themes float it as a pill. */
export function BottomTabs({ space, onSpace, floating }: NavProps & { floating: boolean }) {
  return (
    <nav
      aria-label="Main"
      className="grid"
      style={floating
        ? { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, padding: 5, borderRadius: 999, background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', boxShadow: 'var(--ui-shadow)', margin: '0 16px calc(16px + env(safe-area-inset-bottom, 0px))' }
        : { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', background: 'var(--ui-nav)', borderTop: '1px solid var(--ui-line)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {SPACES.map((s) => {
        const active = s.id === space;
        const Icon = s.icon;
        return floating ? (
          <button key={s.id} onClick={() => onSpace(s.id)} aria-current={active ? 'page' : undefined}
            style={{ height: 48, borderRadius: 999, border: 0, background: active ? 'var(--ui-text)' : 'transparent', color: active ? 'var(--ui-bg)' : 'var(--ui-text-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {s.id === 'investigate' ? 'Tools' : s.label}
          </button>
        ) : (
          <button key={s.id} onClick={() => onSpace(s.id)} aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center justify-center gap-1"
            style={{ height: 64, border: 0, background: 'transparent', color: active ? 'var(--ui-accent-text)' : 'var(--ui-text-2)', fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer' }}>
            <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
