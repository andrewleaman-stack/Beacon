'use client';

import { useState } from 'react';
import { Layers, Globe2, Map as MapIcon, Satellite, Moon, Home, Orbit } from 'lucide-react';
import LayerSheet from './LayerSheet';
import MapSearch, { type SearchHit } from './MapSearch';
import RegionPanel from './RegionPanel';
import TrackPanel from '@/components/TrackPanel';
import { LAYER_GROUPS, MAP_PRESETS, STYLE_LAYER_KEYS, activePresetId, applyPreset } from '@/lib/layer-catalog';
import type { ShellProps } from './types';

/** Legend built from the layers that are actually on, so it always matches the map. */
function activeLegend(activeLayers: Record<string, boolean>) {
  return LAYER_GROUPS.flatMap((g) => g.layers).filter((l) => activeLayers[l.key] && !STYLE_LAYER_KEYS.includes(l.key));
}

function RoundButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={pressed}
      className="flex items-center justify-center"
      style={{ width: 48, height: 48, borderRadius: 'var(--ui-control-radius)', border: `1px solid ${pressed ? 'var(--ui-accent)' : 'var(--ui-line)'}`, background: pressed ? 'var(--ui-accent-soft)' : 'var(--ui-raised)', color: pressed ? 'var(--ui-accent-text)' : 'var(--ui-text)', boxShadow: 'var(--ui-shadow)', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

/** Map chrome drawn over the always-mounted BeaconMap. */
export default function MapSpace(props: ShellProps & { onStartTour?: () => void }) {
  const { layout, data, activeLayers, setActiveLayers, flyTo, regionDossier, dossierLoading, closeDossier, trackTarget, setTrackTarget, setMapTrack, openCamera } = props;
  const touch = layout === 'phone' || layout === 'tablet-portrait';
  const [showLayers, setShowLayers] = useState(false);
  const preset = activePresetId(activeLayers);
  const legend = activeLegend(activeLayers);

  const pick = (hit: SearchHit) => {
    flyTo(hit.lat, hit.lng, hit.kind === 'place' ? 9 : 8);
    if (hit.kind === 'camera') openCamera({ ...hit.raw, type: 'cctv' });
    if (hit.kind === 'flight' && hit.id) setTrackTarget({ kind: 'flight', id: hit.id, label: hit.label, lat: hit.lat, lng: hit.lng });
    if (hit.kind === 'ship' && hit.id) setTrackTarget({ kind: 'ship', id: hit.id, label: hit.label, lat: hit.lat, lng: hit.lng });
  };

  const detail = (regionDossier || dossierLoading) ? (
    <RegionPanel dossier={regionDossier} loading={dossierLoading} onClose={closeDossier} />
  ) : trackTarget ? (
    <div className="legacy-scope">
      <TrackPanel target={trackTarget} data={data} onClose={() => setTrackTarget(null)} onTrackUpdate={setMapTrack} onRetarget={setTrackTarget} onOpenCamera={(cam: any) => openCamera(cam)} />
    </div>
  ) : null;

  const presetRow = (
    <div role="group" aria-label="Presets" className="flex gap-1.5" style={{ overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
      {MAP_PRESETS.map((p) => (
        <button key={p.id} className="ui-chip" aria-pressed={preset === p.id} title={p.description} onClick={() => setActiveLayers((prev: any) => applyPreset(prev, p))}>
          {p.label}
        </button>
      ))}
    </div>
  );

  const controls = (
    <div className="flex flex-col gap-2">
      <RoundButton label={props.mapProjection === 'globe' ? 'Switch to flat map' : 'Switch to globe'} onClick={() => props.setMapProjection((p) => (p === 'globe' ? 'mercator' : 'globe'))}>
        {props.mapProjection === 'globe' ? <MapIcon size={20} aria-hidden="true" /> : <Globe2 size={20} aria-hidden="true" />}
      </RoundButton>
      <RoundButton label={props.mapStyle === 'dark' ? 'Satellite base map' : 'Dark base map'} onClick={() => props.setMapStyle((s) => (s === 'dark' ? 'satellite' : 'dark'))}>
        {props.mapStyle === 'dark' ? <Satellite size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </RoundButton>
      <RoundButton label={`Go home: ${props.homeLocation.label}`} onClick={props.goHome}><Home size={20} aria-hidden="true" /></RoundButton>
      {props.onStartTour && <RoundButton label="Globe tour: fly to what's happening (T)" onClick={props.onStartTour}><Orbit size={20} aria-hidden="true" /></RoundButton>}
    </div>
  );

  if (touch) {
    return (
      <>
        <div className="absolute flex flex-col gap-2" style={{ left: 12, right: 12, top: 'calc(12px + env(safe-area-inset-top, 0px))', zIndex: 30 }}>
          <div className="flex gap-2">
            <div style={{ flexGrow: 1, minWidth: 0 }}><MapSearch data={data} onPick={pick} placeholder="Search places, flights…" /></div>
            <RoundButton label="Layers" onClick={() => setShowLayers(true)} pressed={showLayers}><Layers size={20} aria-hidden="true" /></RoundButton>
          </div>
          {presetRow}
        </div>
        <div className="absolute" style={{ right: 12, top: 132, zIndex: 25 }}>{controls}</div>
        {detail && (
          <div className="absolute" style={{ left: 0, right: 0, bottom: 0, maxHeight: '55%', zIndex: 35, padding: '0 8px 8px', display: 'flex' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>{detail}</div>
          </div>
        )}
        {showLayers && (
          <div className="absolute" style={{ inset: 0, zIndex: 60, background: 'var(--ui-scrim)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowLayers(false)}>
            <div style={{ width: '100%', height: '82%' }} onClick={(e) => e.stopPropagation()}>
              <LayerSheet data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} onClose={() => setShowLayers(false)} />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {showLayers && (
        <div className="absolute" style={{ left: 16, top: 16, bottom: 16, width: 330, zIndex: 40 }}>
          <LayerSheet data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} onClose={() => setShowLayers(false)} />
        </div>
      )}
      <div className="absolute flex flex-col gap-2.5" style={{ left: showLayers ? 362 : 16, right: detail ? 412 : 88, top: 16, zIndex: 30, maxWidth: 760, transition: 'left 0.16s ease-out' }}>
        <div className="flex gap-2">
          {!showLayers && (
            <button onClick={() => setShowLayers(true)} className="flex items-center gap-2"
              style={{ height: 48, padding: '0 16px', borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line)', background: 'var(--ui-raised)', boxShadow: 'var(--ui-shadow)', fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>
              <Layers size={20} aria-hidden="true" /> Layers
            </button>
          )}
          <div style={{ flexGrow: 1, minWidth: 0 }}><MapSearch data={data} onPick={pick} /></div>
        </div>
        {presetRow}
      </div>

      <div className="absolute" style={{ right: detail ? 412 : 16, top: 16, zIndex: 30 }}>{controls}</div>

      {detail && (
        <div className="absolute flex flex-col" style={{ right: 16, top: 16, bottom: 16, width: 380, zIndex: 40 }}>
          {detail}
        </div>
      )}

      <div aria-label="Legend" className="absolute flex items-center gap-3.5" style={{ left: showLayers ? 362 : 16, bottom: 16, zIndex: 30, padding: '10px 14px', borderRadius: 'var(--ui-radius)', background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', fontSize: 13, color: 'var(--ui-text-2)' }}>
        {legend.slice(0, 6).map((l) => (
          <span key={l.key} className="flex items-center gap-1.5"><span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />{l.label}</span>
        ))}
        {legend.length > 6 && <button onClick={() => setShowLayers(true)} style={{ border: 0, background: 'transparent', color: 'var(--ui-accent-text)', cursor: 'pointer', fontSize: 13 }}>+{legend.length - 6} more</button>}
        {!legend.length && <span>No data layers on</span>}
        <span style={{ color: 'var(--ui-text-3)' }}>· Long-press a spot for details</span>
      </div>
    </>
  );
}
