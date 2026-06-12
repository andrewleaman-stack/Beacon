'use client';

import { useMemo } from 'react';
import { Bot, Sparkles, Shield, FileText, Clock, AlertTriangle, CheckCircle, Layers } from 'lucide-react';

interface AIBriefPlaceholderPanelProps {
  entity?: {
    type: string;
    id: string;
    label: string;
    coords?: { lat: number; lng: number };
    properties?: Record<string, unknown>;
  };
  beaconData: Record<string, unknown>;
  onGenerateBrief?: () => void;
}

function getEntityContext(entity: AIBriefPlaceholderPanelProps['entity']): string {
  if (!entity) return '';
  const parts = [`Type: ${entity.type}`, `Label: ${entity.label}`, `ID: ${entity.id}`];
  if (entity.coords) parts.push(`Coords: ${entity.coords.lat.toFixed(4)}, ${entity.coords.lng.toFixed(4)}`);
  if (entity.properties) {
    const props = Object.entries(entity.properties).map(([k, v]) => `${k}: ${v}`).join(', ');
    parts.push(`Properties: ${props}`);
  }
  return parts.join('\n');
}

function getDataSummary(beaconData: Record<string, unknown>): string {
  const summaries = [];
  for (const [key, value] of Object.entries(beaconData)) {
    if (Array.isArray(value) && value.length > 0) {
      summaries.push(`${key}: ${value.length} items`);
    }
  }
  return summaries.join('\n') || 'No data loaded';
}

export default function AIBriefPlaceholderPanel({ entity, beaconData, onGenerateBrief }: AIBriefPlaceholderPanelProps) {
  const entityContext = useMemo(() => getEntityContext(entity), [entity]);
  const dataSummary = useMemo(() => getDataSummary(beaconData), [beaconData]);

  return (
    <div className="glass-panel p-4 h-full overflow-y-auto styled-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--gold-primary)]/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[var(--gold-primary)]" />
          </div>
          <h3 className="text-sm font-mono font-bold text-white tracking-wider">AI BRIEFING</h3>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[7px] font-mono text-[var(--gold-primary)] border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/10">
          PLACEHOLDER
        </span>
      </div>

      <div className="border border-[var(--gold-primary)]/20 bg-[var(--gold-primary)]/5 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--gold-primary)] mb-2">
          <Sparkles className="w-3 h-3" />
          <span>SOURCE-GROUNDED BRIEFING ENGINE</span>
        </div>
        <div className="text-[8px] text-white/60 leading-relaxed space-y-1">
          <p>This panel will generate intelligence briefings grounded exclusively in BEACON&apos;s live data feeds.</p>
          <p className="text-white/40">No hallucination. No external knowledge. Only what the sensors see.</p>
        </div>
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
          BRIEFING TYPES
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="text-left p-3 rounded border border-white/10 bg-white/[0.02] hover:border-[var(--gold-primary)]/30 hover:bg-[var(--gold-primary)]/5 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-[var(--alert-green)]" />
              <span className="text-[9px] font-mono font-bold text-white">ENTITY BRIEF</span>
            </div>
            <div className="text-[8px] text-white/40 ml-5">Focused intel on selected entity</div>
          </button>
          <button className="text-left p-3 rounded border border-white/10 bg-white/[0.02] hover:border-[var(--gold-primary)]/30 hover:bg-[var(--gold-primary)]/5 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
              <span className="text-[9px] font-mono font-bold text-white">SHIFT SUMMARY</span>
            </div>
            <div className="text-[8px] text-white/40 ml-5">What changed since last check</div>
          </button>
          <button className="text-left p-3 rounded border border-white/10 bg-white/[0.02] hover:border-[var(--gold-primary)]/30 hover:bg-[var(--gold-primary)]/5 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF9500]" />
              <span className="text-[9px] font-mono font-bold text-white">INCIDENT BRIEF</span>
            </div>
            <div className="text-[8px] text-white/40 ml-5">Deep dive on active incident</div>
          </button>
          <button className="text-left p-3 rounded border border-white/10 bg-white/[0.02] hover:border-[var(--gold-primary)]/30 hover:bg-[var(--gold-primary)]/5 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span className="text-[9px] font-mono font-bold text-white">DAILY BRIEF</span>
            </div>
            <div className="text-[8px] text-white/40 ml-5">Comprehensive daily summary</div>
          </button>
        </div>

        {onGenerateBrief && (
          <button
            onClick={onGenerateBrief}
            className="w-full mt-4 px-4 py-3 rounded border border-[var(--gold-primary)]/30 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] font-mono text-[9px] font-bold tracking-wider hover:bg-[var(--gold-primary)]/20 transition-colors flex items-center justify-center gap-2"
            disabled
          >
            <Sparkles className="w-4 h-4" />
            GENERATE BRIEF (NOT YET WIRED)
          </button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="hud-label mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-[#FF9500]" />
          CONSTRAINTS
        </div>
        <ul className="text-[8px] font-mono text-white/40 space-y-1 ml-5 list-disc">
          <li>Only BEACON feed data as source material</li>
          <li>Explicit confidence &amp; uncertainty markers</li>
          <li>Citations linked to source records</li>
          <li>Groq / OpenRouter integration pending</li>
          <li>No external knowledge injection</li>
        </ul>
      </div>
    </div>
  );
}