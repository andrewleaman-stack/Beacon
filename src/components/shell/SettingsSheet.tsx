'use client';

import { X } from 'lucide-react';
import DashboardViewControls from '@/components/DashboardViewControls';
import { LAYOUT_OPTIONS, THEME_OPTIONS, type ThemeChoice } from '@/lib/ui-prefs';
import type { ShellProps } from './types';

const SWATCHES: Record<string, string[]> = {
  command: ['#0A0D16', '#111624', '#D4AF37', '#ECE9E1'],
  'command-light': ['#F3F4F7', '#FFFFFF', '#D4AF37', '#141A2A'],
  atlas: ['#0F1115', '#171A20', '#3DDBC4', '#F4F5F7'],
  'atlas-day': ['#F5F6F8', '#FFFFFF', '#0B7F72', '#12151A'],
  auto: ['#0A0D16', '#F3F4F7', '#D4AF37', '#3DDBC4'],
};

export default function SettingsSheet(props: ShellProps & { onClose: () => void }) {
  const { prefs, updatePrefs, onClose } = props;
  return (
    <div role="dialog" aria-modal="true" aria-label="Settings" className="fixed flex justify-end" style={{ inset: 0, zIndex: 950, background: 'var(--ui-scrim)' }} onClick={onClose}>
      <div className="ui-panel ui-scroll flex flex-col gap-6" style={{ width: 'min(460px, 100%)', height: '100%', borderRadius: 0, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="ui-heading" style={{ margin: 0, fontSize: 24, fontWeight: 700, textTransform: 'none' }}>Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--ui-line)', background: 'transparent', cursor: 'pointer' }}><X size={18} aria-hidden="true" /></button>
        </div>

        <section className="flex flex-col gap-3" aria-labelledby="set-theme">
          <h3 id="set-theme" className="ui-heading" style={{ margin: 0, fontSize: 16 }}>Theme</h3>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {THEME_OPTIONS.map((t) => (
              <button key={t.id} onClick={() => updatePrefs({ theme: t.id as ThemeChoice })} aria-pressed={prefs.theme === t.id}
                className="flex flex-col gap-2 text-left" style={{ padding: 12, borderRadius: 'var(--ui-radius)', border: `2px solid ${prefs.theme === t.id ? 'var(--ui-accent)' : 'var(--ui-line)'}`, background: 'var(--ui-surface)', cursor: 'pointer', gridColumn: t.id === 'auto' ? 'span 2' : undefined }}>
                <span className="flex gap-1">{SWATCHES[t.id].map((c, i) => <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: '1px solid rgba(128,128,128,0.35)' }} />)}</span>
                <b style={{ fontSize: 15 }}>{t.label}</b>
                <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{t.description}</span>
              </button>
            ))}
          </div>
          {prefs.theme === 'auto' && (
            <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 14 }}>
              <span style={{ color: 'var(--ui-text-2)' }}>Auto uses</span>
              <button className="ui-chip" aria-pressed={prefs.autoFamily === 'command'} onClick={() => updatePrefs({ autoFamily: 'command' })}>Command</button>
              <button className="ui-chip" aria-pressed={prefs.autoFamily === 'atlas'} onClick={() => updatePrefs({ autoFamily: 'atlas' })}>Atlas</button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="set-layout">
          <h3 id="set-layout" className="ui-heading" style={{ margin: 0, fontSize: 16 }}>Layout</h3>
          <div className="flex flex-col gap-1.5">
            {LAYOUT_OPTIONS.map((l) => (
              <button key={l.id} onClick={() => updatePrefs({ layout: l.id })} aria-pressed={prefs.layout === l.id}
                className="flex items-center justify-between gap-3 text-left" style={{ minHeight: 56, padding: '8px 14px', borderRadius: 'var(--ui-control-radius)', border: `1px solid ${prefs.layout === l.id ? 'var(--ui-accent)' : 'var(--ui-line)'}`, background: prefs.layout === l.id ? 'var(--ui-accent-soft)' : 'var(--ui-surface)', cursor: 'pointer' }}>
                <span className="flex flex-col"><b style={{ fontSize: 15 }}>{l.label}</b><span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{l.description}</span></span>
                {prefs.layout === l.id && <span className="ui-data" style={{ fontSize: 12, color: 'var(--ui-accent-text)' }}>ON</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="set-view">
          <h3 id="set-view" className="ui-heading" style={{ margin: 0, fontSize: 16 }}>Map text, icons and home</h3>
          <div className="legacy-scope">
            <DashboardViewControls viewSettings={props.viewSettings} setViewSettings={props.setViewSettings} homeLocation={props.homeLocation as any} setHomeLocation={props.setHomeLocation} currentView={props.mapView} onGoHome={props.goHome} />
          </div>
        </section>
      </div>
    </div>
  );
}
