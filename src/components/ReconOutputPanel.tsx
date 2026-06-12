'use client';

import { useMemo } from 'react';
import { Target, Wifi, Shield, FileText, ExternalLink, Clock, AlertTriangle } from 'lucide-react';

interface ReconOutputPanelProps {
  reconResults: Array<{
    target: string;
    targetType: string;
    findings: Record<string, unknown>;
    sources: string[];
    timestamp: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-[var(--alert-green)]/20 text-[var(--alert-green)] border-[var(--alert-green)]/30',
    medium: 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/30',
    low: 'bg-[#FF3D3D]/20 text-[#FF3D3D] border-[#FF3D3D]/30',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${styles[confidence]}`}>
      {confidence.toUpperCase()}
    </span>
  );
}

function formatFinding(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function ReconOutputPanel({ reconResults }: ReconOutputPanelProps) {
  if (!reconResults.length) {
    return (
      <div className="glass-panel p-8 h-full flex items-center justify-center">
        <div className="text-center text-white/40">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-[9px] font-mono tracking-widest">NO RECON RESULTS</div>
          <div className="text-[8px] mt-1">Run a reconnaissance sweep from the OSINT panel</div>
        </div>
      </div>
    );
  }

  const sortedResults = useMemo(() => 
    [...reconResults].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [reconResults]
  );

  return (
    <div className="glass-panel p-4 h-full overflow-y-auto styled-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white tracking-wider">RECON OUTPUT</h3>
        <span className="text-[8px] font-mono text-white/40">{reconResults.length} RESULT{reconResults.length !== 1 ? 'S' : ''}</span>
      </div>

      <div className="space-y-4">
        {sortedResults.map((result, idx) => (
          <div key={`${result.target}-${result.timestamp}-${idx}`} className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3.5 h-3.5 text-[var(--cyan-primary)] flex-shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-white truncate">{result.target}</span>
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-mono text-white/50 border border-white/10 bg-white/[0.02]">
                    {result.targetType.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[8px] font-mono text-white/40 ml-5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                  <ConfidenceBadge confidence={result.confidence} />
                </div>
              </div>
            </div>

            {Object.keys(result.findings).length > 0 && (
              <div className="mb-3">
                <div className="hud-label mb-2 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  FINDINGS
                </div>
                <div className="space-y-1.5 ml-5">
                  {Object.entries(result.findings).map(([key, value]) => (
                    <div key={key} className="text-[9px] font-mono">
                      <span className="text-white/40">{key.toUpperCase().replace(/_/g, ' ')}:</span>
                      <span className="text-white/80 ml-2 whitespace-pre-wrap">{formatFinding(key, value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.sources.length > 0 && (
              <div className="border-t border-white/10 pt-3">
                <div className="hud-label mb-2 flex items-center gap-1.5">
                  <Wifi className="w-3 h-3" />
                  SOURCES
                </div>
                <div className="flex flex-wrap gap-1.5 ml-5">
                  {result.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10 hover:text-white transition-colors border border-[var(--cyan-primary)]/20"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      {new URL(source).hostname.replace('www.', '')}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}