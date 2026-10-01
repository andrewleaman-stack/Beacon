'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeId = 'command' | 'command-light' | 'atlas' | 'atlas-day';
export type ThemeChoice = ThemeId | 'auto';
export type LayoutChoice = 'auto' | 'touch' | 'desktop' | 'wall' | 'classic';
export type ResolvedLayout = 'sidebar' | 'tablet-portrait' | 'phone' | 'wall' | 'classic';

export interface UiPrefs {
  theme: ThemeChoice;
  /** Which family "auto" switches within: light by day / dark by night (follows the device). */
  autoFamily: 'command' | 'atlas';
  layout: LayoutChoice;
}

export const DEFAULT_UI_PREFS: UiPrefs = { theme: 'command', autoFamily: 'command', layout: 'auto' };

export const THEME_OPTIONS: { id: ThemeChoice; label: string; description: string }[] = [
  { id: 'command', label: 'Command', description: 'Navy and gold' },
  { id: 'command-light', label: 'Command Light', description: 'Paper, navy ink, gold' },
  { id: 'atlas', label: 'Atlas', description: 'Graphite and teal' },
  { id: 'atlas-day', label: 'Atlas Daylight', description: 'Bright, for sunny rooms' },
  { id: 'auto', label: 'Auto', description: 'Light by day, dark at night (follows your device)' },
];

export const LAYOUT_OPTIONS: { id: LayoutChoice; label: string; description: string }[] = [
  { id: 'auto', label: 'Automatic', description: 'Picks the best layout for this screen' },
  { id: 'touch', label: 'Touch', description: 'Bottom tabs and sheets' },
  { id: 'desktop', label: 'Sidebar', description: 'Labelled sidebar and side panels' },
  { id: 'wall', label: 'Wall / TV', description: 'Large, glanceable ambient display' },
  { id: 'classic', label: 'Classic', description: 'The previous BEACON interface' },
];

const STORAGE_KEY = 'beacon.ui.prefs';
const THEME_IDS: ThemeChoice[] = ['command', 'command-light', 'atlas', 'atlas-day', 'auto'];
const LAYOUT_IDS: LayoutChoice[] = ['auto', 'touch', 'desktop', 'wall', 'classic'];

export function normalizeUiPrefs(raw: unknown): UiPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<UiPrefs>;
  return {
    theme: THEME_IDS.includes(r.theme as ThemeChoice) ? (r.theme as ThemeChoice) : DEFAULT_UI_PREFS.theme,
    autoFamily: r.autoFamily === 'atlas' ? 'atlas' : 'command',
    layout: LAYOUT_IDS.includes(r.layout as LayoutChoice) ? (r.layout as LayoutChoice) : DEFAULT_UI_PREFS.layout,
  };
}

/** Preferences stored in this browser; `?mode=wall|classic` in the URL overrides the layout. */
export function useUiPrefs() {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_UI_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let next = DEFAULT_UI_PREFS;
    try { next = normalizeUiPrefs(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')); } catch { /* storage unavailable */ }
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode === 'wall' || mode === 'classic') next = { ...next, layout: mode };
    setPrefs(next);
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<UiPrefs>) => {
    setPrefs((prev) => {
      const next = normalizeUiPrefs({ ...prev, ...patch });
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}

function usePrefersDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setDark(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return dark;
}

export function useResolvedTheme(prefs: UiPrefs): ThemeId {
  const prefersDark = usePrefersDark();
  if (prefs.theme !== 'auto') return prefs.theme;
  if (prefs.autoFamily === 'atlas') return prefersDark ? 'atlas' : 'atlas-day';
  return prefersDark ? 'command' : 'command-light';
}

/** Pick the layout from the screen: width, height and whether the main pointer is touch. */
export function resolveLayout(choice: LayoutChoice, width: number, height: number): ResolvedLayout {
  if (choice === 'classic') return 'classic';
  if (choice === 'wall') return 'wall';
  if (choice === 'desktop') return 'sidebar';
  const phone = width < 640 || (height < 500 && width < 1024);
  if (choice === 'touch') return phone ? 'phone' : 'tablet-portrait';
  if (phone) return 'phone';
  if (width < 1024 && height > width) return 'tablet-portrait';
  return 'sidebar';
}

export function useResolvedLayout(choice: LayoutChoice): ResolvedLayout {
  const [layout, setLayout] = useState<ResolvedLayout>(() => (choice === 'classic' ? 'classic' : 'sidebar'));
  useEffect(() => {
    const apply = () => setLayout(resolveLayout(choice, window.innerWidth, window.innerHeight));
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [choice]);
  return layout;
}
