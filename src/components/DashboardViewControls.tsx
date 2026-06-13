'use client';

import { Home, LocateFixed, Minus, Plus, Settings2, Type } from 'lucide-react';
import {
  DASHBOARD_VIEW_PRESETS,
  HOME_LOCATION_PRESETS,
  getDashboardViewPresetId,
  normalizeDashboardViewSettings,
  normalizeHomeLocation,
} from '@/lib/dashboard-settings.mjs';

type ViewSettings = {
  fontScale: number;
  iconScale: number;
  density: 'compact' | 'standard' | 'comfortable';
};

type HomeLocation = {
  label: string;
  lat: number;
  lng: number;
  zoom: number;
};

interface DashboardViewControlsProps {
  viewSettings: ViewSettings;
  setViewSettings: React.Dispatch<React.SetStateAction<ViewSettings>>;
  homeLocation: HomeLocation;
  setHomeLocation: React.Dispatch<React.SetStateAction<HomeLocation>>;
  currentView: { latitude?: number; longitude?: number; zoom: number };
  onGoHome: () => void;
}

export default function DashboardViewControls({
  viewSettings,
  setViewSettings,
  homeLocation,
  setHomeLocation,
  currentView,
  onGoHome,
}: DashboardViewControlsProps) {
  const activePresetId = getDashboardViewPresetId(viewSettings);

  const updateView = (patch: Partial<ViewSettings>) => {
    setViewSettings((prev) => normalizeDashboardViewSettings({ ...prev, ...patch }) as ViewSettings);
  };

  const setPreset = (presetId: string) => {
    const preset = DASHBOARD_VIEW_PRESETS.find((item: any) => item.id === presetId);
    if (!preset) return;
    setViewSettings(normalizeDashboardViewSettings(preset) as ViewSettings);
  };

  const applyHomePreset = (label: string) => {
    const preset = HOME_LOCATION_PRESETS.find((item: any) => item.label === label);
    if (preset) setHomeLocation(normalizeHomeLocation(preset) as HomeLocation);
  };

  const saveCurrentAsHome = () => {
    setHomeLocation(normalizeHomeLocation({
      label: 'Saved Home',
      lat: currentView.latitude ?? homeLocation.lat,
      lng: currentView.longitude ?? homeLocation.lng,
      zoom: currentView.zoom ?? homeLocation.zoom,
    }) as HomeLocation);
  };

  return (
    <div className="glass-panel pointer-events-auto flex flex-col gap-3 p-3 min-w-[260px]" aria-label="Dashboard view controls">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[var(--gold-primary)]" />
          <span className="hud-text text-[10px] text-[var(--text-primary)]">View Controls</span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{activePresetId}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5" aria-label="View density presets">
        {DASHBOARD_VIEW_PRESETS.map((preset: any) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setPreset(preset.id)}
            aria-pressed={activePresetId === preset.id}
            className={`rounded border px-2 py-1.5 text-[9px] font-mono font-bold tracking-wider transition-colors ${
              activePresetId === preset.id
                ? 'border-[var(--gold-primary)]/70 bg-[var(--gold-primary)]/15 text-[var(--gold-primary)]'
                : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-[var(--cyan-primary)]/40 hover:text-white'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-white/10 bg-black/20 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-white/60">
            <Type className="h-3 w-3" /> Font {Math.round(viewSettings.fontScale * 100)}%
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => updateView({ fontScale: viewSettings.fontScale - 0.05 })} className="view-step-btn" aria-label="Decrease interface font size"><Minus className="h-3 w-3" /></button>
            <button type="button" onClick={() => updateView({ fontScale: viewSettings.fontScale + 0.05 })} className="view-step-btn" aria-label="Increase interface font size"><Plus className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-white/60">
            <LocateFixed className="h-3 w-3" /> Icons {Math.round(viewSettings.iconScale * 100)}%
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => updateView({ iconScale: viewSettings.iconScale - 0.05 })} className="view-step-btn" aria-label="Decrease map icon size"><Minus className="h-3 w-3" /></button>
            <button type="button" onClick={() => updateView({ iconScale: viewSettings.iconScale + 0.05 })} className="view-step-btn" aria-label="Increase map icon size"><Plus className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-black/20 p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-white/60">
            <Home className="h-3 w-3 text-[var(--cyan-primary)]" /> Home Location
          </div>
          <button type="button" onClick={onGoHome} className="rounded border border-[var(--cyan-primary)]/30 px-2 py-1 text-[8px] font-mono font-bold text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10">
            GO
          </button>
        </div>
        <select
          value={HOME_LOCATION_PRESETS.some((item: any) => item.label === homeLocation.label) ? homeLocation.label : ''}
          onChange={(event) => applyHomePreset(event.target.value)}
          className="w-full rounded border border-white/10 bg-black/70 px-2 py-1.5 text-[10px] font-mono text-white/80 outline-none focus:border-[var(--gold-primary)]/60"
          aria-label="Select default home location"
        >
          <option value="" disabled>{homeLocation.label}</option>
          {HOME_LOCATION_PRESETS.map((preset: any) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
        </select>
        <button type="button" onClick={saveCurrentAsHome} className="mt-2 w-full rounded border border-white/10 px-2 py-1.5 text-[9px] font-mono uppercase tracking-wider text-white/55 hover:border-[var(--gold-primary)]/40 hover:text-white">
          Save current map as home
        </button>
      </div>
    </div>
  );
}
