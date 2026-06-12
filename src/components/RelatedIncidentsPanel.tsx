'use client';

import { useMemo } from 'react';
import { MapPin, AlertTriangle, Clock, ExternalLink, ChevronRight, Radio, Search } from 'lucide-react';

interface RelatedIncidentsPanelProps {
  entity?: {
    type: string;
    id: string;
    label: string;
    coords?: { lat: number; lng: number };
  };
  beaconData: Record<string, unknown>;
  radiusKm?: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getTime(item: Record<string, unknown>): number | null {
  const candidates = ['time', 'published', 'pubDate', 'timestamp', 'updated_at', 'last_seen', 'fetchedAt'];
  for (const key of candidates) {
    if (item[key]) {
      const t = new Date(String(item[key])).getTime();
      if (Number.isFinite(t)) return t;
    }
  }
  return null;
}

function getCoords(item: Record<string, unknown>): { lat: number; lng: number } | null {
  if (typeof item.lat === 'number' && typeof item.lng === 'number') return { lat: item.lat, lng: item.lng };
  if (typeof item.latitude === 'number' && typeof item.longitude === 'number') return { lat: item.latitude, lng: item.longitude };
  if (Array.isArray(item.coords) && item.coords.length >= 2) return { lat: Number(item.coords[0]), lng: Number(item.coords[1]) };
  return null;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 100) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

function getSeverity(item: Record<string, unknown>, type: string): 'critical' | 'high' | 'elevated' | 'low' {
  if (type === 'earthquake') {
    const mag = Number(item.magnitude ?? 0);
    if (mag >= 6) return 'critical';
    if (mag >= 4.5) return 'high';
    return 'elevated';
  }
  if (type === 'news' || type === 'gdelt') {
    const risk = Number(item.risk_score ?? 0);
    if (risk >= 8) return 'critical';
    if (risk >= 6) return 'high';
    if (risk >= 4) return 'elevated';
    return 'low';
  }
  return 'low';
}

function severityStyle(sev: string) {
  switch (sev) {
    case 'critical': return 'text-[#FF3D3D] border-[#FF3D3D]/30 bg-[#FF3D3D]/10';
    case 'high': return 'text-[#FF9500] border-[#FF9500]/30 bg-[#FF9500]/10';
    case 'elevated': return 'text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10';
    default: return 'text-[var(--alert-green)] border-[var(--alert-green)]/20 bg-[var(--alert-green)]/10';
  }
}

export default function RelatedIncidentsPanel({ entity, beaconData, radiusKm = 100 }: RelatedIncidentsPanelProps) {
  const incidents = useMemo(() => {
    if (!entity?.coords) return [];
    
    const sources = [
      { key: 'earthquakes', data: beaconData.earthquakes, type: 'earthquake' as const },
      { key: 'news', data: beaconData.news, type: 'news' as const },
      { key: 'gdelt', data: beaconData.gdelt, type: 'gdelt' as const },
    ];

    const results = [];
    for (const source of sources) {
      const items = Array.isArray(source.data) ? source.data : [];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const coords = getCoords(record);
        if (!coords) continue;
        
        const dist = haversineDistance(entity.coords.lat, entity.coords.lng, coords.lat, coords.lng);
        if (dist > radiusKm) continue;
        
        const time = getTime(record);
        const severity = getSeverity(record, source.type);
        
        results.push({
          source: source.type,
          sourceLabel: source.type.toUpperCase(),
          title: source.type === 'earthquake' 
            ? `M${record.magnitude ?? '?'} ${String(record.place || 'earthquake')}`
            : String(record.title || record.description || 'Untitled'),
          coords,
          distance: dist,
          time,
          severity,
          raw: record,
        });
      }
    }
    
    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15);
  }, [entity?.coords, beaconData, radiusKm]);

  if (!entity?.coords) {
    return (
      <div className="glass-panel p-8 h-full flex items-center justify-center">
        <div className="text-center text-white/40">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-[9px] font-mono tracking-widest">SELECT AN ENTITY</div>
          <div className="text-[8px] mt-1">Click a map feature to see nearby incidents</div>
        </div>
      </div>
    );
  }

  if (!incidents.length) {
    return (
      <div className="glass-panel p-8 h-full flex items-center justify-center">
        <div className="text-center text-white/40">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-[9px] font-mono tracking-widest">NO INCIDENTS NEARBY</div>
          <div className="text-[8px] mt-1">Nothing within {radiusKm}km of this location</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 h-full overflow-y-auto styled-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white tracking-wider">RELATED INCIDENTS</h3>
        <div className="flex items-center gap-2 text-[8px] font-mono text-white/40">
          <Radio className="w-3 h-3" />
          <span>{radiusKm}km radius</span>
          <span className="text-[var(--cyan-primary)]">{incidents.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {incidents.map((incident, idx) => (
          <div key={`${incident.source}-${incident.time || idx}`} className="border border-white/10 rounded-lg p-3 bg-white/[0.02] group">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[var(--cyan-primary)] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold text-white truncate">{incident.title}</div>
                  <div className="flex items-center gap-2 text-[8px] font-mono text-white/40 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[7px] font-mono border {severityStyle(incident.severity)}">
                      {incident.severity.toUpperCase()}
                    </span>
                    <span>{incident.sourceLabel}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {incident.time ? new Date(incident.time).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-[9px] font-mono font-bold text-[var(--gold-primary)] tabular-nums">
                  {formatDistance(incident.distance)}
                </div>
                <div className="text-[7px] text-white/30">FROM ENTITY</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="text-[8px] font-mono text-white/35">
                {incident.coords.lat.toFixed(4)}, {incident.coords.lng.toFixed(4)}
              </div>
              <button className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                <ChevronRight className="w-3 h-3" />
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}