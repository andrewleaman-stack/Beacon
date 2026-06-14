'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronDown, ChevronUp, PanelLeft, Bot, Target, Link, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import EntityDetailsPanel from '@/components/EntityDetailsPanel';
import ReconOutputPanel from '@/components/ReconOutputPanel';
import RelatedIncidentsPanel from '@/components/RelatedIncidentsPanel';
import SourceLinksTimelinePanel from '@/components/SourceLinksTimelinePanel';
import AIBriefingPanel from '@/components/AIBriefingPanel';
import { registerPanel, getActivePanels, type PanelContext, type EntityRef, clearRegistry } from '@/lib/panel-registry.mjs';

const PANEL_CONFIG = [
  { id: 'entity-details', label: 'ENTITY', icon: PanelLeft, Component: EntityDetailsPanel, priority: 10 },
  { id: 'recon-output', label: 'RECON', icon: Target, Component: ReconOutputPanel, priority: 20 },
  { id: 'related-incidents', label: 'INCIDENTS', icon: AlertTriangle, Component: RelatedIncidentsPanel, priority: 30 },
  { id: 'source-links-timeline', label: 'SOURCES', icon: Link, Component: SourceLinksTimelinePanel, priority: 40 },
  { id: 'ai-brief', label: 'AI BRIEF', icon: Bot, Component: AIBriefingPanel, priority: 50 },
];

const AlertCircle = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  entityRef?: EntityRef | null;
  reconResults?: Array<{
    target: string;
    targetType: string;
    findings: Record<string, unknown>;
    sources: string[];
    timestamp: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  beaconData: Record<string, unknown>;
  width?: number;
}

export default function RightDrawer({ 
  open, 
  onClose, 
  entityRef, 
  reconResults = [], 
  beaconData, 
  width = 420 
}: RightDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>('entity-details');
  const [panels, setPanels] = useState<Array<{ id: string; Component: React.ComponentType<any>; data: any }>>([]);

  useEffect(() => {
    if (!open) return;
    
    // Register panels on mount
    PANEL_CONFIG.forEach(({ id, label, icon, priority, Component }) => {
      let canActivate = (ctx: any) => false;
      let buildData = async (ctx: any, beaconData: any): Promise<any> => null;

      switch (id) {
        case 'entity-details':
          canActivate = (ctx) => ctx.type === 'entity';
          buildData = async (ctx) => {
            if (ctx.type !== 'entity') return null;
            return { 
              title: ctx.entity.label, 
              sections: [], 
              lastUpdated: new Date().toISOString(),
              entity: ctx.entity 
            };
          };
          break;
        case 'recon-output':
          canActivate = (ctx) => ctx.type === 'recon' || (ctx.type === 'entity' && reconResults.length > 0);
          buildData = async (ctx) => {
            return { 
              title: 'RECON OUTPUT', 
              sections: [], 
              lastUpdated: new Date().toISOString(),
              reconResults 
            };
          };
          break;
        case 'related-incidents':
          canActivate = (ctx) => ctx.type === 'entity' && !!ctx.entity.coords;
          buildData = async (ctx) => {
            if (ctx.type !== 'entity') return null;
            return { 
              title: 'RELATED INCIDENTS', 
              sections: [], 
              lastUpdated: new Date().toISOString(),
              entity: ctx.entity,
              beaconData 
            };
          };
          break;
        case 'source-links-timeline':
          canActivate = (ctx) => ctx.type === 'entity';
          buildData = async (ctx) => {
            if (ctx.type !== 'entity') return null;
            return { 
              title: 'SOURCE LINKS', 
              sections: [], 
              lastUpdated: new Date().toISOString(),
              entity: ctx.entity,
              beaconData 
            };
          };
          break;
        case 'ai-brief':
          canActivate = (ctx) => ctx.type === 'entity';
          buildData = async (ctx) => {
            if (ctx.type !== 'entity') return null;
            return { 
              title: 'AI BRIEF', 
              sections: [], 
              lastUpdated: new Date().toISOString(),
              entity: ctx.entity,
              beaconData 
            };
          };
          break;
      }

      registerPanel({ id: id as any, label, description: '', icon: '', priority, canActivate, buildData });
    });

    // Determine context
    let context: PanelContext = { type: 'none' };
    if (entityRef) {
      context = { type: 'entity', entity: entityRef };
    } else if (reconResults.length > 0) {
      context = { type: 'recon', results: reconResults };
    }

    // Get active panels
    getActivePanels(context, beaconData).then(active => {
      const panelData = active
        .map(({ panel, data }) => {
          const config = PANEL_CONFIG.find(c => c.id === panel.id);
          return config?.Component ? { id: panel.id, Component: config.Component, data } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
      setPanels(panelData as any);
      if (panelData.length > 0 && !panelData.find(p => p.id === activeTab)) {
        setActiveTab(panelData[0].id);
      }
    });

    return () => clearRegistry();
  }, [open, entityRef, reconResults, beaconData]);

  if (!open) return null;

  const currentPanel = panels.find(p => p.id === activeTab);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed right-0 top-0 bottom-0 z-[300] flex flex-row-reverse pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto lg:hidden"
          onClick={onClose}
        />
        
        <div 
          className="pointer-events-auto flex flex-col h-full w-[420px] max-w-[90vw] glass-panel border-l border-white/10 bg-black/95 backdrop-blur-xl shadow-[-30px_0_60px_rgba(0,0,0,0.5)]"
          style={{ width: `${width}px` }}
        >
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--cyan-primary)]/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[var(--cyan-primary)]" />
              </div>
              <h3 className="text-sm font-mono font-bold text-white tracking-wider">ANALYST PANEL</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-2 border-b border-white/10 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {panels.map(({ id }) => {
                const config = PANEL_CONFIG.find(c => c.id === id);
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[8px] font-mono tracking-wider whitespace-nowrap transition-colors ${
                      activeTab === id
                        ? 'bg-[var(--cyan-primary)]/15 text-[var(--cyan-primary)] border border-[var(--cyan-primary)]/30'
                        : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {currentPanel && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="h-full w-full"
                >
                  <currentPanel.Component {...currentPanel.data} />
                </motion.div>
              )}
              {!currentPanel && (
                <div className="h-full w-full flex items-center justify-center text-white/40">
                  <div className="text-center p-8">
                    <PanelLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <div className="text-[9px] font-mono tracking-widest">NO PANEL ACTIVE</div>
                    <div className="text-[8px] mt-1">Select an entity or run recon</div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}