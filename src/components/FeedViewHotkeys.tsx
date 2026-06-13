'use client';

import { useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import {
  HOTKEY_VIEW_PRESETS,
  applyHotkeyViewPreset,
  getActiveHotkeyPresetId,
  getHotkeyPresetByShortcut,
} from '@/lib/view-hotkeys.mjs';

interface FeedViewHotkeysProps {
  activeLayers: Record<string, boolean>;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  compact?: boolean;
}

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
};

export default function FeedViewHotkeys({ activeLayers, setActiveLayers, compact = false }: FeedViewHotkeysProps) {
  const activePresetId = getActiveHotkeyPresetId(activeLayers);

  const applyPreset = (presetId: string) => {
    setActiveLayers((prev: any) => applyHotkeyViewPreset(prev, presetId));
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || isTypingTarget(event.target)) return;
      const preset = getHotkeyPresetByShortcut(event.key);
      if (!preset) return;
      event.preventDefault();
      setActiveLayers((prev: any) => applyHotkeyViewPreset(prev, preset.id));
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveLayers]);

  if (compact) {
    return (
      <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/45 px-2 py-2 backdrop-blur-sm shadow-[0_0_18px_rgba(0,0,0,0.35)]">
        <div className="mb-1.5 flex items-center justify-center gap-1 text-[8px] font-mono font-bold tracking-[0.18em] text-[var(--gold-primary)]/85">
          <Keyboard className="h-3 w-3" />
          VIEWS
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-label="Feed view hotkeys">
          {HOTKEY_VIEW_PRESETS.map((preset: any) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                title={`[${preset.shortcut}] ${preset.label}: ${preset.description}`}
                aria-pressed={isActive}
                className={`h-6 rounded border text-[8px] font-mono font-bold transition-all ${
                  isActive
                    ? 'border-[var(--gold-primary)]/70 bg-[var(--gold-primary)]/15 text-[var(--gold-primary)] shadow-[0_0_10px_rgba(212,175,55,0.18)]'
                    : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-[var(--cyan-primary)]/40 hover:text-[var(--cyan-primary)]'
                }`}
              >
                {preset.shortcut}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel-sm p-2" aria-label="Feed view hotkeys">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Keyboard className="h-3.5 w-3.5 text-[var(--gold-primary)]" />
          <span className="hud-text text-[9px] text-[var(--text-primary)]">VIEW HOTKEYS</span>
        </div>
        <span className="text-[7px] font-mono tracking-widest text-[var(--text-muted)]">1–6</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {HOTKEY_VIEW_PRESETS.map((preset: any) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              aria-pressed={isActive}
              className={`rounded border px-1.5 py-1.5 text-left transition-all ${
                isActive
                  ? 'border-[var(--gold-primary)]/70 bg-[var(--gold-primary)]/15 text-[var(--gold-primary)]'
                  : 'border-white/10 bg-black/20 text-white/60 hover:border-[var(--cyan-primary)]/40 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] font-mono font-bold tracking-widest">{preset.shortLabel}</span>
                <span className="rounded bg-white/10 px-1 text-[7px] font-mono text-white/50">{preset.shortcut}</span>
              </div>
              <div className="mt-0.5 truncate text-[6px] font-mono uppercase tracking-wider text-white/35">{preset.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
