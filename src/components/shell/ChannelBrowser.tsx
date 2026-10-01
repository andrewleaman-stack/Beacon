'use client';

import { useMemo, useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { REGIONS, LANGUAGE_NAMES } from '@/lib/live-channels.mjs';

export type Feed = {
  id: string; name: string; city?: string; country?: string; region?: string; language?: string;
  url: string; embed_allowed: boolean; live: boolean | null; video_id?: string | null; channel_id?: string; handle?: string;
};

export function feedStatus(f: Feed): { label: string; sev: string } {
  if (f.live === true && f.embed_allowed) return { label: 'LIVE', sev: 'critical' };
  if (f.live === true) return { label: 'YOUTUBE ONLY', sev: 'watch' };
  if (f.live === null) return { label: f.channel_id ? 'CHECKING' : 'EXTERNAL', sev: 'watch' };
  return { label: 'OFF AIR', sev: 'watch' };
}

interface Props {
  feeds: Feed[] | null;
  /** Modal picker for a wall tile, or an inline list in the Channels tab. */
  mode: 'modal' | 'inline';
  title?: string;
  onPick: (f: Feed) => void;
  onAdd?: (f: Feed) => void;
  onClose?: () => void;
  onWall?: Set<string>;
  narrow?: boolean;
}

export default function ChannelBrowser({ feeds, mode, title, onPick, onAdd, onClose, onWall, narrow }: Props) {
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('All');
  const [lang, setLang] = useState('all');
  const [playableOnly, setPlayableOnly] = useState(mode === 'modal');

  const languages = useMemo(() => Array.from(new Set((feeds || []).map((f) => f.language).filter(Boolean))) as string[], [feeds]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (feeds || []).filter((f) =>
      (region === 'All' || f.region === region)
      && (lang === 'all' || f.language === lang)
      && (!playableOnly || f.embed_allowed)
      && (!needle || `${f.name} ${f.city || ''} ${f.country || ''}`.toLowerCase().includes(needle)),
    ).sort((a, b) => Number(b.live === true && b.embed_allowed) - Number(a.live === true && a.embed_allowed));
  }, [feeds, q, region, lang, playableOnly]);

  const body = (
    <div className="flex flex-col gap-3" style={{ minHeight: 0 }}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2" style={{ flex: '1 1 220px', height: 44, padding: '0 12px', borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)' }}>
          <Search size={18} aria-hidden="true" style={{ color: 'var(--ui-text-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search channels, cities, countries" aria-label="Search channels"
            style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: 'var(--ui-text)', fontSize: 15 }} />
        </label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language"
          style={{ height: 44, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)', color: 'var(--ui-text)', padding: '0 10px', fontSize: 15 }}>
          <option value="all">All languages</option>
          {languages.sort((a, b) => (LANGUAGE_NAMES[a] || a).localeCompare(LANGUAGE_NAMES[b] || b)).map((l) => <option key={l} value={l}>{LANGUAGE_NAMES[l] || l}</option>)}
        </select>
        <button className="ui-chip" aria-pressed={playableOnly} onClick={() => setPlayableOnly((v) => !v)}>Plays in BEACON</button>
      </div>
      <div role="tablist" aria-label="Region" className="flex gap-1.5 flex-wrap">
        {['All', ...REGIONS].map((r) => <button key={r} role="tab" className="ui-chip" aria-selected={region === r} onClick={() => setRegion(r)}>{r}</button>)}
      </div>
      {feeds === null && <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>Loading channels…</div>}
      {feeds && !list.length && <div className="ui-card" style={{ padding: 18, color: 'var(--ui-text-2)' }}>No channels match.</div>}
      <ul className="grid gap-2" style={{ margin: 0, padding: 0, listStyle: 'none', gridTemplateColumns: `repeat(${narrow || mode === 'modal' ? 1 : 3}, minmax(0, 1fr))` }}>
        {list.map((f) => {
          const st = feedStatus(f);
          const there = onWall?.has(f.id);
          return (
            <li key={f.id} className="ui-card flex items-center gap-2" style={{ padding: '6px 6px 6px 14px', minHeight: 64 }}>
              <button onClick={() => onPick(f)} className="flex items-center gap-3 text-left" style={{ flex: 1, minWidth: 0, minHeight: 52, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                <span className="flex flex-col" style={{ minWidth: 0, flex: 1 }}>
                  <b className="truncate" style={{ fontSize: 15 }}>{f.name}</b>
                  <span className="truncate" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{[f.city, f.country].filter(Boolean).join(', ')} · {LANGUAGE_NAMES[f.language || ''] || f.language}</span>
                </span>
                <span className="ui-sev" data-sev={st.sev} style={{ flexShrink: 0 }}>{st.label}</span>
              </button>
              {onAdd && f.embed_allowed && (
                <button onClick={() => onAdd(f)} disabled={there} aria-label={there ? `${f.name} is on the wall` : `Add ${f.name} to the wall`} title={there ? 'On the wall' : 'Add to wall'}
                  className="flex items-center justify-center" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line)', background: 'transparent', color: there ? 'var(--ui-text-3)' : 'var(--ui-accent-text)', cursor: there ? 'default' : 'pointer' }}>
                  {there ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (mode === 'inline') return body;
  return (
    <div role="dialog" aria-modal="true" aria-label={title || 'Choose a channel'} className="fixed flex justify-end" style={{ inset: 0, zIndex: 960, background: 'var(--ui-scrim)' }} onClick={onClose}>
      <div className="ui-panel ui-scroll flex flex-col gap-4" style={{ width: 'min(520px, 100%)', height: '100%', borderRadius: 0, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="ui-heading" style={{ margin: 0, fontSize: 22, fontWeight: 700, textTransform: 'none' }}>{title || 'Choose a channel'}</h2>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--ui-line)', background: 'transparent', color: 'var(--ui-text)', cursor: 'pointer' }}><X size={18} aria-hidden="true" /></button>
        </div>
        {body}
      </div>
    </div>
  );
}
