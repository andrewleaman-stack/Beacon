'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { LAYER_GROUPS, MAP_PRESETS, activePresetId, applyPreset, countForLayer, setLayer } from '@/lib/layer-catalog';

interface Props {
  data: any;
  activeLayers: Record<string, boolean>;
  setActiveLayers: (fn: (prev: any) => any) => void;
  onClose: () => void;
}

/** Every layer as a labelled switch with a live count. Touch targets are 44 px tall. */
export default function LayerSheet({ data, activeLayers, setActiveLayers, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const preset = activePresetId(activeLayers);
  const onCount = Object.entries(activeLayers).filter(([k, v]) => v && LAYER_GROUPS.some((g) => g.layers.some((l) => l.key === k))).length;

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return LAYER_GROUPS;
    return LAYER_GROUPS
      .map((g) => ({ ...g, layers: g.layers.filter((l) => `${l.label} ${l.hint || ''} ${g.label}`.toLowerCase().includes(q)) }))
      .filter((g) => g.layers.length);
  }, [filter]);

  return (
    <section aria-label="Map layers" className="ui-panel flex flex-col h-full" style={{ padding: 16, gap: 12 }}>
      <div className="flex items-center justify-between">
        <h2 className="ui-heading" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Layers</h2>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{onCount} on</span>
          <button onClick={onClose} aria-label="Close layers" className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--ui-line)', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div role="group" aria-label="Presets" className="flex flex-wrap gap-1.5">
        {MAP_PRESETS.map((p) => (
          <button key={p.id} className="ui-chip" aria-pressed={preset === p.id} title={p.description}
            onClick={() => setActiveLayers((prev: any) => applyPreset(prev, p))}>
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex items-center" style={{ height: 40, borderRadius: 10, border: '1px solid var(--ui-line)', background: 'var(--ui-surface)', padding: '0 12px' }}>
        <span className="sr-only">Find a layer</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a layer" style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', color: 'var(--ui-text)', fontSize: 15, outline: 'none' }} />
      </label>

      <div className="ui-scroll flex flex-col gap-3" style={{ flexGrow: 1, minHeight: 0, marginRight: -8, paddingRight: 8 }}>
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col">
            <div className="ui-data" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ui-text-2)', padding: '4px 0' }}>{group.label}</div>
            {group.layers.map((layer) => {
              const on = !!activeLayers[layer.key];
              const count = countForLayer(data, layer);
              const id = `layer-${layer.key}`;
              return (
                <div key={layer.key} className="flex items-center gap-3" style={{ minHeight: 48 }}>
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '50%', background: layer.color, flexShrink: 0, opacity: on ? 1 : 0.55 }} />
                  <label htmlFor={id} className="flex flex-col" style={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }}>
                    <span style={{ fontSize: 15 }}>{layer.label}</span>
                    {layer.hint && <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{layer.hint}</span>}
                  </label>
                  {on && count !== null && <span className="ui-data" style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{count.toLocaleString()}</span>}
                  <button id={id} role="switch" aria-checked={on} aria-label={layer.label} className="ui-switch"
                    onClick={() => setActiveLayers((prev: any) => setLayer(prev, layer.key, !prev[layer.key]))} />
                </div>
              );
            })}
          </div>
        ))}
        {!groups.length && <p style={{ fontSize: 14, color: 'var(--ui-text-2)' }}>No layer matches “{filter}”.</p>}
      </div>
    </section>
  );
}
