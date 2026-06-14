'use client';

import { useState, useCallback, useMemo } from 'react';
import { Bot, Sparkles, Shield, FileText, Clock, AlertTriangle, CheckCircle, Layers, ChevronDown, Menu, Mail, Settings, Activity, MapPinned, Trash2, Copy, Search, Plus } from 'lucide-react';

interface AIBriefingPanelProps {
  entity?: {
    type: string;
    id: string;
    label: string;
    coords?: { lat: number; lng: number };
    properties?: Record<string, unknown>;
  };
  beaconData: Record<string, unknown>;
  onGenerateBrief?: () => void; // Keep for backward compatibility
}

interface IntelligenceContext {
  earthquakes: Array<{
    id: string;
    magnitude: number;
    location: string;
    latitude: number;
    longitude: number;
    depth: number;
    timestamp: string;
    tsunami: boolean;
    felt: number | null;
    alert: string | null;
  }>;
  news: Array<{
    id: string;
    title: string;
    description: string;
    link: string;
    published: string;
    source: string;
    risk_score: number;
    coords: [number, number] | null;
    machine_assessment: string | null;
  }>;
  threats: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
    region: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    source: string;
  }>;
  cyberAlerts: Array<{
    id: string;
    name: string;
    vendor: string;
    product: string;
    severity: string;
    date: string;
    due: string;
    source: string;
  }>;
  timestamp: string;
}

type BriefingRole = 'general' | 'chaplain' | 'police';
type BriefingMode = 'highlights' | 'full';

function beaconDataToIntelligenceContext(beaconData: Record<string, unknown>): IntelligenceContext {
  const earthquakes: IntelligenceContext['earthquakes'] = Array.isArray(beaconData.earthquakes) ? (beaconData.earthquakes as any[]).map((eq: any) => ({
    id: eq.id || Math.random().toString(36).substring(2, 9),
    magnitude: Number(eq.magnitude || 0),
    location: eq.location || 'Unknown',
    latitude: Number(eq.lat || eq.latitude || 0),
    longitude: Number(eq.lng || eq.longitude || 0),
    depth: Number(eq.depth || 0),
    timestamp: eq.time || eq.timestamp || new Date().toISOString(),
    tsunami: !!eq.tsunami,
    felt: eq.felt !== null && eq.felt !== undefined ? Number(eq.felt) : null,
    alert: eq.alert || null,
  })) : [];

  const news: IntelligenceContext['news'] = Array.isArray(beaconData.news) ? (beaconData.news as any[]).map((item: any) => ({
    id: item.id || Math.random().toString(36).substring(2, 9),
    title: item.title || 'Untitled',
    description: item.description || '',
    link: item.link || '#',
    published: item.published || new Date().toISOString(),
    source: item.source || 'Unknown',
    risk_score: Number(item.risk_score || 0),
    coords: item.coords ? [Number(item.coords[0]), Number(item.coords[1])] : null,
    machine_assessment: item.machine_assessment || null,
  })) : [];

  // Convert GDELT events to threats
  const threats: IntelligenceContext['threats'] = Array.isArray(beaconData.gdelt) ? (beaconData.gdelt as any[]).map((ev: any) => {
    // Map GDELT tone to severity
    const tone = Number(ev.tone || 0);
    let severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW' = 'LOW';
    if (tone < -5) severity = 'CRITICAL';
    else if (tone < -2) severity = 'HIGH';
    else if (tone < 0) severity = 'ELEVATED';
    else severity = 'LOW';

    return {
      id: ev.id || Math.random().toString(36).substring(2, 9),
      type: ev.type || 'UNKNOWN',
      title: ev.title || 'Event',
      description: ev.description || ev.title || '',
      severity,
      region: ev.source || 'Unknown',
      latitude: Number(ev.lat || 0),
      longitude: Number(ev.lng || 0),
      timestamp: ev.date || new Date().toISOString(),
      source: ev.source || 'GDELT',
    };
  }) : [];

  // Cyber alerts - placeholder since we don't have a direct feed
  const cyberAlerts: IntelligenceContext['cyberAlerts'] = [];

  return {
    earthquakes,
    news,
    threats,
    cyberAlerts,
    timestamp: new Date().toISOString(),
  };
}

export default function AIBriefingPanel({ entity, beaconData, onGenerateBrief }: AIBriefingPanelProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<BriefingRole>('general');
  const [translateNonEnglish, setTranslateNonEnglish] = useState(true);
  const [briefingMode, setBriefingMode] = useState<BriefingMode>('highlights');
  const [isCopying, setIsCopying] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const intelligenceContext = useMemo(() => beaconDataToIntelligenceContext(beaconData), [beaconData]);

  const handleGenerateBrief = useCallback(async () => {
    if (!intelligenceContext || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setBriefing(null);

    try {
      const response = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: intelligenceContext,
          role,
          translateNonEnglish,
          mode: briefingMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setBriefing(data.briefing);
    } catch (err: any) {
      console.error('[BEACON AI] Briefing generation error:', err);
      setError(err.message || 'Failed to generate briefing');
    } finally {
      setIsGenerating(false);
    }
  }, [intelligenceContext, role, translateNonEnglish, briefingMode]);

  const handleCopyBrief = useCallback(async () => {
    if (!briefing) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(briefing);
      // Optionally show a toast or temporary state
    } catch (err) {
      console.error('[BEACON AI] Copy failed:', err);
    } finally {
      setIsCopying(false);
    }
  }, [briefing]);

  const handleTranslateText = useCallback(async () => {
    // This would translate the briefing itself, but we already have translation option
    // For now, we can just regenerate with translation enabled
    setIsTranslating(true);
    try {
      const response = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: intelligenceContext,
          role,
          translateNonEnglish: true,
          mode: briefingMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setBriefing(data.briefing);
    } catch (err: any) {
      console.error('[BEACON AI] Briefing translation error:', err);
      setError(err.message || 'Failed to translate briefing');
    } finally {
      setIsTranslating(false);
    }
  }, [briefing, intelligenceContext, role, briefingMode]);

  const entityContext = entity ? `
Type: ${entity.type}
Label: ${entity.id}
ID: ${entity.id}
${entity.coords ? `Coords: ${entity.coords.lat.toFixed(4)}, ${entity.coords.lng.toFixed(4)}` : ''}
${entity.properties ? Object.entries(entity.properties).map(([k, v]) => `${k}: ${v}`).join(', ') : ''}
` : '';

  const dataSummary = Object.entries(beaconData)
    .filter(([_, value]) => Array.isArray(value) && value.length > 0)
    .map(([key, value]) => `${key}: ${(value as any[]).length} items`)
    .join('\n') || 'No data loaded';

  return (
    <div className="glass-panel p-4 h-full overflow-y-auto styled-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--gold-primary)]/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[var(--gold-primary)]" />
          </div>
          <h3 className="text-sm font-mono font-bold text-white tracking-wider">BEACON BRIEF</h3>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[7px] font-mono text-[var(--gold-primary)] border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/10">
          {isGenerating ? 'GENERATING' : briefing ? 'READY' : 'PLACEHOLDER'}
        </span>
      </div>

      {entity && (
        <div className="mb-4 p-3 rounded border border-white/10 bg-white/[0.02]">
          <div className="hud-label mb-2 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            ENTITY CONTEXT
          </div>
          <pre className="text-[8px] font-mono text-white/60 whitespace-pre-wrap bg-black/30 p-2 rounded">{entityContext}</pre>
        </div>
      )}

      <div className="mb-4 p-3 rounded border border-white/10 bg-white/[0.02]">
        <div className="hud-label mb-2 flex items-center gap-1.5">
          <Layers className="w-3 h-3" />
          AVAILABLE FEED DATA
        </div>
        <pre className="text-[8px] font-mono text-white/50 whitespace-pre-wrap bg-black/30 p-2 rounded">{dataSummary}</pre>
      </div>

      <div className="space-y-2">
        <div className="hud-label mb-2 flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          BRIEFING CONTROLS
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setBriefingMode('highlights')}
            className={`px-3 py-2 rounded border font-mono text-[8px] tracking-wider transition-colors ${briefingMode === 'highlights' ? 'border-[var(--cyan-primary)]/50 bg-[var(--cyan-primary)]/15 text-[var(--cyan-primary)]' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white'}`}
          >
            HOTSPOTS
          </button>
          <button
            type="button"
            onClick={() => setBriefingMode('full')}
            className={`px-3 py-2 rounded border font-mono text-[8px] tracking-wider transition-colors ${briefingMode === 'full' ? 'border-[var(--gold-primary)]/50 bg-[var(--gold-primary)]/15 text-[var(--gold-primary)]' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white'}`}
          >
            FULL REPORT
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-3 h-3" />
            <div>
              <span className="text-[9px] font-mono">Role:</span>
              <select
                value={role}
                onChange={(e) => {
                  setRole((e.target as HTMLSelectElement).value as BriefingRole);
                }}
                className="border border-white/20 bg-white/[0.05] text-white rounded px-2 py-1"
              >
                <option value="general">General</option>
                <option value="chaplain">Chaplain</option>
                <option value="police">Police</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Search className="w-3 h-3" />
            <div>
              <span className="text-[9px] font-mono">Translation:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={translateNonEnglish}
                  onChange={(e) => setTranslateNonEnglish(e.target.checked)}
                  className="w-4 h-4 text-[var(--gold-primary)]"
                />
                <span className="text-[8px]">Auto-translate non-English</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerateBrief}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] font-mono text-[9px] font-bold tracking-wider hover:bg-[var(--gold-primary)]/20 transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4" /> GENERATING...
              </>
            ) : briefing ? (
              <>
                <CheckCircle className="w-4 h-4" /> VIEW BRIEFING
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> {briefingMode === 'highlights' ? 'HOTSPOTS BRIEF' : 'FULL BRIEF'}
              </>
            )}
          </button>

          {briefing && (
            <>
              <button
                onClick={handleCopyBrief}
                disabled={isCopying}
                className="px-3 py-2 rounded border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] font-mono text-[8px] hover:bg-[var(--gold-primary)]/20 transition-colors"
              >
                {isCopying ? 'COPYING...' : (<> <Copy className="w-3 h-3" /> COPY </>)}
              </button>

              <button
                onClick={handleTranslateText}
                disabled={isTranslating}
                className="ml-2 px-3 py-2 rounded border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] font-mono text-[8px] hover:bg-[var(--gold-primary)]/20 transition-colors"
              >
                {isTranslating ? 'TRANSLATING...' : (<> <Mail className="w-3 h-3" /> TRANSLATE </>)}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-[var(--alert-red)]/20 bg-[var(--alert-red)]/5">
          <div className="hud-label mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-[var(--alert-red)]" />
            ERROR
          </div>
          <p className="text-[8px] text-[var(--alert-red)]/80 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {briefing && !isGenerating && (
        <div className="mt-4 p-4 rounded border border-[var(--gold-primary)]/20 bg-[var(--gold-primary)]/5">
          <div className="hud-label mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {briefingMode === 'highlights' ? 'HOTSPOTS BRIEF' : 'INTELLIGENCE BRIEFING'}
          </div>
          <div className="text-[9px] font-mono text-white/70 whitespace-pre-wrap">
            {briefing}
          </div>
          <div className="mt-2 text-[8px] text-white/50">
            Mode: {briefingMode.toUpperCase()} | Role: {role.charAt(0).toUpperCase() + role.slice(1)} | Generated: {new Date().toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="hud-label mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-[#FF9500]" />
          CONSTRAINTS
        </div>
        <ul className="text-[8px] font-mono text-white/40 space-y-1 ml-5 list-disc">
          <li>Only BEACON feed data as source material</li>
          <li>Explicit confidence &amp; uncertainty markers</li>
          <li>Citations linked to source records</li>
          <li>OpenRouter-only AI generation</li>
          <li>Role-based analysis: {role.charAt(0).toUpperCase() + role.slice(1)}</li>
          <li>{translateNonEnglish ? 'Auto-translation enabled' : 'Auto-translation disabled'}</li>
          <li>No external knowledge injection</li>
        </ul>
      </div>
    </div>
  );
}