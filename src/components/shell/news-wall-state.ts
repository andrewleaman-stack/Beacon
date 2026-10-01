'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_WALL } from '@/lib/live-channels.mjs';

export type GridId = '2x2' | '3x2' | '3x3';
export interface Lineup { name: string; ids: (string | null)[] }
export interface WallState { grid: GridId; lineups: Lineup[]; active: number; audio: number }

export const GRIDS: { id: GridId; cols: number; rows: number; label: string }[] = [
  { id: '2x2', cols: 2, rows: 2, label: '2 × 2' },
  { id: '3x2', cols: 3, rows: 2, label: '3 × 2' },
  { id: '3x3', cols: 3, rows: 3, label: '3 × 3' },
];

export const STARTER_LINEUPS: Lineup[] = [
  { name: 'World', ids: DEFAULT_WALL },
  { name: 'Americas', ids: ['abcnews', 'cbsnews', 'nbcnews', 'cnn', 'livenowfox', 'cbc', 'cnnee', 'milenio', 'cnnbrasil'] },
  { name: 'Europe', ids: ['skynews', 'dwnews', 'france24en', 'euronews', 'gbnewsonline', 'tvpworld', 'trtworld', 'weltvideotv', 'bfmtv'] },
  { name: 'Middle East', ids: ['aljazeera', 'aljazeeraarabic', 'alarabiya', 'alhadath', 'skynewsarabia', 'trtarabi', 'france24_ar', 'dwarabic', 'aljazeeramubasher'] },
  { name: 'Asia-Pacific', ids: ['nhkworld', 'cna', 'abcnewsaustralia', 'wion', 'ndtv', 'ytnnews24', 'cgtn', 'gmanews', 'tvbsnews01'] },
];

const KEY = 'beacon.newswall.v1';
export const DEFAULT_WALL_STATE: WallState = { grid: '2x2', lineups: STARTER_LINEUPS, active: 0, audio: 0 };

export function gridSize(grid: GridId) {
  const g = GRIDS.find((x) => x.id === grid) || GRIDS[0];
  return { cols: g.cols, rows: g.rows, count: g.cols * g.rows };
}

function normalize(raw: any): WallState {
  if (!raw || typeof raw !== 'object') return DEFAULT_WALL_STATE;
  const grid: GridId = GRIDS.some((g) => g.id === raw.grid) ? raw.grid : '2x2';
  const lineups: Lineup[] = Array.isArray(raw.lineups)
    ? raw.lineups
      .filter((l: any) => l && typeof l.name === 'string' && Array.isArray(l.ids))
      .map((l: any) => ({ name: l.name.slice(0, 40), ids: l.ids.slice(0, 9).map((id: any) => (typeof id === 'string' ? id : null)) }))
    : [];
  if (!lineups.length) return { ...DEFAULT_WALL_STATE, grid };
  const active = Number.isInteger(raw.active) && raw.active >= 0 && raw.active < lineups.length ? raw.active : 0;
  const audio = Number.isInteger(raw.audio) && raw.audio >= -1 && raw.audio < 9 ? raw.audio : 0;
  return { grid, lineups, active, audio };
}

export function loadWallState(): WallState {
  try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return DEFAULT_WALL_STATE; }
}

export function useWallState() {
  const [state, setState] = useState<WallState>(DEFAULT_WALL_STATE);
  useEffect(() => { setState(loadWallState()); }, []);
  const update = useCallback((fn: (s: WallState) => WallState) => {
    setState((prev) => {
      const next = fn(prev);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
      return next;
    });
  }, []);
  return [state, update] as const;
}
