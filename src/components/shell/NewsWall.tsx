'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Repeat, Plus, ExternalLink, Save, Trash2, X } from 'lucide-react';
import ChannelBrowser, { feedStatus, type Feed } from './ChannelBrowser';
import { GRIDS, gridSize, type GridId, type WallState } from './news-wall-state';

interface Props {
  feeds: Feed[] | null;
  state: WallState;
  update: (fn: (s: WallState) => WallState) => void;
  layout: string;
}

function embedSrc(f: Feed | undefined): string | null {
  if (!f || !f.embed_allowed || typeof window === 'undefined') return null;
  const common = `autoplay=1&mute=1&enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
  if (f.live === true && f.video_id) return `https://www.youtube.com/embed/${f.video_id}?${common}`;
  // Unchecked channels wait for the server's check: YouTube's generic channel embed is refused by some broadcasters.
  return null;
}

/** Several live channels at once; only the tile you tap plays sound. */
export default function NewsWall({ feeds, state, update, layout }: Props) {
  const phone = layout === 'phone';
  const lineup = state.lineups[state.active] || state.lineups[0];
  const { cols: gc, rows: gr, count: gridCount } = gridSize(state.grid);
  const count = phone ? Math.min(gridCount, 4) : gridCount;
  const slots = useMemo(() => Array.from({ length: count }, (_, i) => lineup?.ids[i] ?? null), [lineup, count]);
  const byId = useMemo(() => new Map((feeds || []).map((f) => [f.id, f])), [feeds]);
  const audio = state.audio < count ? state.audio : -1;

  const [focused, setFocused] = useState<number | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Portrait screens turn a 3 × 2 wall into 2 × 3 so tiles stay large.
  const portrait = area.h > area.w * 1.1;
  const cols = phone ? 1 : focused !== null ? 1 : portrait ? gr : gc;
  const rows = phone ? count : focused !== null ? 1 : portrait ? gc : gr;
  const gap = phone ? 12 : 10;
  const tileW = phone
    ? area.w
    : Math.max(160, Math.min((area.w - gap * (cols - 1)) / cols, ((area.h - gap * (rows - 1)) / rows) * (16 / 9)));

  // YouTube's embed player accepts commands over postMessage when enablejsapi=1.
  // Players that have finished loading; commands sent earlier would hit about:blank.
  const loaded = useRef(new WeakSet<HTMLIFrameElement>());
  const send = useCallback((i: number, func: string, args: unknown[] = []) => {
    const el = frames.current[i];
    if (!el || !loaded.current.has(el)) return;
    const w = el.contentWindow;
    if (w) w.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube.com');
  }, []);
  // Browsers pause a video that unmutes before anyone has touched the page, so sound
  // waits for the first tap or key press; until then every screen plays muted.
  const [canSound, setCanSound] = useState(false);
  useEffect(() => {
    const ua = (navigator as any).userActivation;
    if (ua?.hasBeenActive) { setCanSound(true); return; }
    const arm = () => setCanSound(true);
    window.addEventListener('pointerdown', arm, { once: true });
    window.addEventListener('keydown', arm, { once: true });
    return () => { window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); };
  }, []);
  const applyAudio = useCallback((i: number) => {
    if (i === audio && canSound) { send(i, 'unMute'); send(i, 'setVolume', [100]); send(i, 'playVideo'); }
    else { send(i, 'mute'); send(i, 'playVideo'); }
  }, [audio, canSound, send]);

  useEffect(() => { slots.forEach((_, i) => applyAudio(i)); }, [applyAudio, slots]);

  // The player reports playback errors (stream ended, region-blocked, hiccups) over postMessage.
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [retry, setRetry] = useState<Record<number, number>>({});
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com' || typeof e.data !== 'string') return;
      let d: any;
      try { d = JSON.parse(e.data); } catch { return; }
      if (d?.event !== 'onError') return;
      const i = frames.current.findIndex((f) => f?.contentWindow === e.source);
      if (i >= 0) setFailed((m) => ({ ...m, [i]: true }));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const retryTile = (i: number) => { setFailed((m) => ({ ...m, [i]: false })); setRetry((r) => ({ ...r, [i]: (r[i] || 0) + 1 })); };
  useEffect(() => { setFailed({}); }, [slots]);

  const onFrameLoad = (i: number, el: HTMLIFrameElement) => {
    loaded.current.add(el);
    const w = frames.current[i]?.contentWindow;
    w?.postMessage(JSON.stringify({ event: 'listening', id: i, channel: 'widget' }), 'https://www.youtube.com');
    // The player needs a moment after load before it obeys commands.
    [700, 2000, 4500].forEach((ms) => setTimeout(() => applyAudio(i), ms));
  };

  const setAudio = (i: number) => update((s) => ({ ...s, audio: i }));
  const setSlot = (i: number, id: string) => update((s) => ({
    ...s,
    lineups: s.lineups.map((l, li) => {
      if (li !== s.active) return l;
      const ids = [...l.ids];
      while (ids.length <= i) ids.push(null);
      ids[i] = id;
      return { ...l, ids };
    }),
  }));

  // Number keys pick whose sound you hear; this runs before the shell's own 1–4 shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey || picking !== null) return;
      const n = Number(e.key);
      if (n >= 1 && n <= count) { e.preventDefault(); e.stopPropagation(); setAudio(n - 1); }
      else if (e.key === '0' || e.key.toLowerCase() === 'm') { e.preventDefault(); e.stopPropagation(); setAudio(-1); }
      else if (e.key.toLowerCase() === 'f' && audio >= 0) { e.preventDefault(); e.stopPropagation(); setFocused((f) => (f === null ? audio : null)); }
      else if (e.key === 'Escape' && focused !== null) { e.stopPropagation(); setFocused(null); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const saveAs = (name: string) => {
    const clean = name.trim().slice(0, 40);
    if (!clean) return;
    update((s) => ({ ...s, lineups: [...s.lineups, { name: clean, ids: [...slots] }], active: s.lineups.length }));
    setNaming(null);
  };
  const deleteLineup = () => update((s) => {
    if (s.lineups.length < 2) return s;
    const lineups = s.lineups.filter((_, i) => i !== s.active);
    return { ...s, lineups, active: Math.min(s.active, lineups.length - 1) };
  });

  const btn = { height: 40, minWidth: 40, padding: '0 12px', borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line)', background: 'var(--ui-surface)', color: 'var(--ui-text)', fontSize: 14, cursor: 'pointer' } as const;
  const iconBtn = { width: 40, height: 40, borderRadius: 10, border: 0, background: 'rgba(0,0,0,0.62)', color: '#fff', cursor: 'pointer' } as const;

  return (
    <div className="flex flex-col gap-3" style={{ height: '100%', minHeight: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={phone ? 'flex items-center gap-1.5' : 'flex items-center gap-1.5 flex-wrap'} role="tablist" aria-label="Lineups" style={phone ? { overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingBottom: 2 } : undefined}>
          {state.lineups.map((l, i) => (
            <button key={`${l.name}-${i}`} role="tab" className="ui-chip" style={{ flexShrink: 0 }} aria-selected={i === state.active} onClick={() => { update((s) => ({ ...s, active: i })); setFocused(null); }}>{l.name}</button>
          ))}
          {naming === null ? (
            <button onClick={() => setNaming('')} className="ui-chip flex items-center gap-1" aria-label="Save this wall as a new lineup"><Save size={14} aria-hidden="true" /> Save as…</button>
          ) : (
            <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); saveAs(naming); }}>
              <input autoFocus value={naming} onChange={(e) => setNaming(e.target.value)} placeholder="Lineup name" aria-label="Lineup name"
                style={{ height: 36, width: 150, borderRadius: 999, border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)', color: 'var(--ui-text)', padding: '0 12px', fontSize: 14 }} />
              <button type="submit" className="ui-chip" aria-pressed="true">Save</button>
              <button type="button" onClick={() => setNaming(null)} aria-label="Cancel" className="flex items-center justify-center" style={{ width: 36, height: 36, border: 0, background: 'transparent', color: 'var(--ui-text-2)', cursor: 'pointer' }}><X size={16} aria-hidden="true" /></button>
            </form>
          )}
          {state.lineups.length > 1 && naming === null && (
            <button onClick={deleteLineup} aria-label={`Delete lineup ${lineup?.name}`} title="Delete this lineup" className="flex items-center justify-center" style={{ width: 36, height: 36, border: 0, background: 'transparent', color: 'var(--ui-text-3)', cursor: 'pointer' }}><Trash2 size={16} aria-hidden="true" /></button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!phone && (
            <div role="radiogroup" aria-label="Grid" className="flex" style={{ padding: 3, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line)', background: 'var(--ui-surface)' }}>
              {GRIDS.map((g) => (
                <button key={g.id} role="radio" aria-checked={state.grid === g.id} onClick={() => { update((s) => ({ ...s, grid: g.id as GridId })); setFocused(null); }}
                  style={{ height: 34, padding: '0 12px', borderRadius: 'calc(var(--ui-control-radius) - 3px)', border: 0, background: state.grid === g.id ? 'var(--ui-accent)' : 'transparent', color: state.grid === g.id ? 'var(--ui-on-accent)' : 'var(--ui-text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{g.label}</button>
              ))}
            </div>
          )}
          <button onClick={() => setAudio(audio === -1 ? 0 : -1)} style={btn} className="flex items-center gap-2" aria-pressed={audio === -1}>
            {audio === -1 ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}{audio === -1 ? 'Muted' : 'Mute all'}
          </button>
        </div>
      </div>

      <div ref={areaRef} className={phone ? 'ui-scroll' : ''} style={{ flex: 1, minHeight: phone ? 0 : 240, position: 'relative' }}>
        <div className="grid" style={{ gap, gridTemplateColumns: `repeat(${cols}, ${tileW}px)`, justifyContent: 'center', alignContent: phone ? 'start' : 'center', height: phone ? 'auto' : '100%', paddingBottom: phone ? 88 : 0 }}>
          {slots.map((id, i) => {
            const f = id ? byId.get(id) : undefined;
            const src = embedSrc(f);
            const on = i === audio;
            const hidden = focused !== null && focused !== i;
            return (
              <div key={i} className="relative" style={{ display: hidden ? 'none' : 'block', width: tileW, aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', background: '#000', outline: on ? '3px solid var(--ui-accent)' : '1px solid var(--ui-line)', outlineOffset: on ? -3 : -1 }}>
                {src ? (
                  <iframe ref={(el) => { frames.current[i] = el; }} key={`${src}#${retry[i] || 0}`} src={src} title={f?.name || 'Live channel'} onLoad={(e) => onFrameLoad(i, e.currentTarget)}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                ) : (
                  <div className="absolute flex flex-col items-center justify-center gap-2 text-center" style={{ inset: 0, padding: 16, color: '#E6E8EC', background: '#12151B' }}>
                    {!id ? (
                      <button onClick={() => setPicking(i)} className="flex items-center gap-2" style={{ ...btn, background: 'transparent', color: '#E6E8EC', borderColor: 'rgba(255,255,255,0.25)' }}><Plus size={16} aria-hidden="true" /> Add channel</button>
                    ) : feeds === null || f?.live === null ? (
                      <span style={{ fontSize: 14, opacity: 0.8 }}>{f ? `Checking ${f.name}…` : 'Loading…'}</span>
                    ) : (
                      <>
                        <b style={{ fontSize: 15 }}>{f?.name || id}</b>
                        <span style={{ fontSize: 13, opacity: 0.75 }}>{f ? (f.live === false ? 'Off air right now' : 'This channel only plays on YouTube') : 'Channel not found'}</span>
                        <div className="flex gap-2">
                          {f && <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5" style={{ ...btn, display: 'flex', alignItems: 'center', background: 'transparent', color: '#E6E8EC', borderColor: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}><ExternalLink size={14} aria-hidden="true" /> YouTube</a>}
                          <button onClick={() => setPicking(i)} style={{ ...btn, background: 'transparent', color: '#E6E8EC', borderColor: 'rgba(255,255,255,0.25)' }}>Change</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {src && failed[i] && (
                  <div className="absolute flex flex-col items-center justify-center gap-2 text-center" style={{ inset: 0, zIndex: 3, padding: 16, color: '#E6E8EC', background: 'rgba(18,21,27,0.92)' }}>
                    <b style={{ fontSize: 15 }}>{f?.name} didn&apos;t load</b>
                    <div className="flex gap-2">
                      <button onClick={() => retryTile(i)} style={{ ...btn, background: 'transparent', color: '#E6E8EC', borderColor: 'rgba(255,255,255,0.25)' }}>Retry</button>
                      <button onClick={() => setPicking(i)} style={{ ...btn, background: 'transparent', color: '#E6E8EC', borderColor: 'rgba(255,255,255,0.25)' }}>Change</button>
                    </div>
                  </div>
                )}
                {src && (
                  // Tapping a tile picks its sound. The selected tile leaves YouTube's control bar
                  // reachable, so the player's own speaker button works if a browser blocks unmuting.
                  <button onClick={() => setAudio(i)} aria-label={on ? `${f?.name} is playing sound` : `Listen to ${f?.name}`} aria-pressed={on}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: on && canSound ? 56 : 0, border: 0, background: 'transparent', cursor: on && canSound ? 'default' : 'pointer', zIndex: 1 }} />
                )}

                {id && (
                  <div className="absolute flex items-center gap-1.5" style={{ left: 8, top: 8, zIndex: 2, maxWidth: 'calc(100% - 110px)', padding: '4px 10px 4px 6px', borderRadius: 999, background: 'rgba(0,0,0,0.62)', color: '#fff', fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
                    <span className="ui-data" style={{ minWidth: 18, height: 18, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--ui-accent)' : 'rgba(255,255,255,0.18)', color: on ? 'var(--ui-on-accent)' : '#fff', fontSize: 11 }}>{i + 1}</span>
                    {on ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" style={{ opacity: 0.7 }} />}
                    <span className="truncate">{f?.name || id}</span>
                    {on && !canSound && <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, whiteSpace: 'nowrap' }}>· tap for sound</span>}
                    {f && feedStatus(f).label === 'LIVE' && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--live-red)', color: '#fff' }}>LIVE</span>}
                  </div>
                )}
                {id && (
                  <div className="absolute flex gap-1.5" style={{ right: 8, top: 8, zIndex: 2 }}>
                    <button onClick={() => setPicking(i)} aria-label={`Change channel ${i + 1}`} title="Change channel" className="flex items-center justify-center" style={iconBtn}><Repeat size={16} aria-hidden="true" /></button>
                    {!phone && (
                      <button onClick={() => { setFocused(focused === i ? null : i); setAudio(i); }} aria-label={focused === i ? 'Back to the wall' : `Enlarge ${f?.name || 'channel'}`} title={focused === i ? 'Back to the wall' : 'Enlarge'} className="flex items-center justify-center" style={iconBtn}>
                        {focused === i ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--ui-text-2)' }}>
        Tap a screen to hear it{phone ? '' : ' · keys 1–9 pick the sound, M mutes, F enlarges'}. No sound? Tap the speaker in the video&apos;s own controls.
      </p>

      {picking !== null && (
        <ChannelBrowser feeds={feeds} mode="modal" title={`Channel for screen ${picking + 1}`} narrow
          onWall={new Set(slots.filter(Boolean) as string[])}
          onPick={(f) => { if (f.embed_allowed) { setSlot(picking, f.id); setPicking(null); } else window.open(f.url, '_blank', 'noopener'); }}
          onClose={() => setPicking(null)} />
      )}
    </div>
  );
}
