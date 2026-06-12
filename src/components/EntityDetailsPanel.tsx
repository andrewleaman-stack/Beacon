'use client';

import { useMemo, Fragment } from 'react';
import { MapPin, Plane, Anchor, Globe, Video, Zap, Search, AlertTriangle, Database, Wifi } from 'lucide-react';

interface EntityDetailsPanelProps {
  entity: {
    type: string;
    id: string;
    label: string;
    properties?: Record<string, unknown>;
    coords?: { lat: number; lng: number };
  };
  beaconData: Record<string, unknown>;
}

function getIconForType(type: string) {
  switch (type) {
    case 'aircraft': return Plane;
    case 'vessel': return Anchor;
    case 'cctv': return Video;
    case 'earthquake': return Zap;
    case 'country': return Globe;
    case 'ip': return Search;
    case 'gdelt': return AlertTriangle;
    case 'infrastructure': return Database;
    default: return MapPin;
  }
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number' && key.toLowerCase().includes('lat')) return value.toFixed(6);
  if (typeof value === 'number' && key.toLowerCase().includes('lng')) return value.toFixed(6);
  if (typeof value === 'number' && key.toLowerCase().includes('alt')) return `${value.toLocaleString()} ft`;
  if (typeof value === 'number' && key.toLowerCase().includes('speed')) return `${value} kts`;
  if (typeof value === 'number' && key.toLowerCase().includes('heading')) return `${value}°`;
  return String(value);
}

export default function EntityDetailsPanel({ entity, beaconData }: EntityDetailsPanelProps) {
  const Icon = getIconForType(entity.type);

  const sections = useMemo(() => {
    const props = entity.properties || {};
    const entries = Object.entries(props);
    
    if (entries.length === 0) {
      return [{ id: 'none', label: 'PROPERTIES', kind: 'key-value' as const, data: [{ key: 'No properties available', value: '' }] }];
    }

    return [{
      id: 'properties',
      label: 'PROPERTIES',
      kind: 'key-value' as const,
      data: entries.map(([key, value]) => ({ key: key.toUpperCase().replace(/_/g, ' '), value: formatValue(key, value) })),
    }];
  }, [entity.properties]);

  return (
    <div className="glass-panel p-4 h-full overflow-y-auto styled-scrollbar">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--cyan-primary)]/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[var(--cyan-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-mono font-bold text-white tracking-wider">{entity.label}</h3>
          <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">{entity.type}</div>
        </div>
      </div>

      {entity.coords && (
        <div className="mb-4 p-3 rounded border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-[9px] font-mono text-white/50 mb-1">
            <MapPin className="w-3 h-3" />
            <span>COORDINATES</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--gold-primary)] tabular-nums">
            {entity.coords.lat.toFixed(6)}, {entity.coords.lng.toFixed(6)}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
            <div className="hud-label mb-2">{section.label}</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[9px] font-mono">
              {Array.isArray(section.data) && section.data.map((item, i) => (
                <Fragment key={i}>
                  <span className="text-white/40">{item.key}</span>
                  <span className="text-white/80 text-right">{item.value}</span>
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}