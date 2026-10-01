'use client';

import dynamic from 'next/dynamic';
import { Fragment, useEffect, useState } from 'react';
import { Bot, Radar, Network, LineChart, FileText, HeartPulse, Share2 } from 'lucide-react';
import MarketsPanel from '@/components/MarketsPanel';
import ScmPanel from '@/components/ScmPanel';
import AIBriefingPanel from '@/components/AIBriefingPanel';
import SharePanel from '@/components/SharePanel';
import AiAnalyst from '@/components/AiAnalyst';
import type { ShellProps, SpaceId } from './types';

const OsintPanel = dynamic(() => import('@/components/OsintPanel'));

type Tool = 'ask' | 'recon' | 'entity' | 'markets' | 'brief' | 'sources' | 'share';

const TOOLS: { id: Tool; label: string; hint: string; icon: typeof Bot }[] = [
  { id: 'ask', label: 'Ask BEACON', hint: 'AI analyst on live feeds', icon: Bot },
  { id: 'recon', label: 'Recon toolkit', hint: 'IP, DNS, WHOIS, certificates…', icon: Radar },
  { id: 'entity', label: 'Entity graph', hint: 'Aircraft, vessels, IPs, countries', icon: Network },
  { id: 'markets', label: 'Markets & supply', hint: 'Indices, energy, chokepoints', icon: LineChart },
  { id: 'brief', label: 'AI brief', hint: 'Written situation report', icon: FileText },
  { id: 'sources', label: 'Source health', hint: 'Every feed and its status', icon: HeartPulse },
  { id: 'share', label: 'Share & shortcuts', hint: 'Links and keyboard keys', icon: Share2 },
];

const SHORTCUTS: [string, string][] = [
  ['F', 'Full screen'], ['R', 'Go home'], ['G', 'Globe / flat map'], ['1–4', 'Brief, Map, Watch, Investigate'], ['/', 'Search'], ['Esc', 'Close panels'],
];

function SourceHealth() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    fetch('/api/feed-health', { cache: 'no-store' }).then((r) => r.json()).then(setHealth).catch(() => setHealth({ feeds: [] }));
  }, []);
  if (!health) return <div style={{ color: 'var(--ui-text-2)' }}>Checking sources…</div>;
  const statusSev: Record<string, string> = { healthy: 'clear', stale: 'advisory', offline: 'critical', idle: 'watch' };
  return (
    <div className="flex flex-col gap-3">
      {health.summary && (
        <p style={{ margin: 0, fontSize: 15 }}>
          {health.summary.healthy} of {health.summary.totalFeeds} sources healthy · {health.summary.stale} stale · {health.summary.offline} offline · {health.summary.idle} idle (layer off)
        </p>
      )}
      <ul className="ui-card" style={{ margin: 0, padding: 0, listStyle: 'none', overflow: 'hidden' }}>
        {(health.feeds || []).map((f: any, i: number) => (
          <li key={f.key} className="flex items-center justify-between gap-3" style={{ padding: '12px 16px', borderTop: i ? '1px solid var(--ui-line)' : 0 }}>
            <span className="flex flex-col" style={{ minWidth: 0 }}>
              <b style={{ fontSize: 15 }}>{f.label}</b>
              <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{f.count != null ? `${Number(f.count).toLocaleString()} records` : ''}{f.ageSeconds != null ? ` · updated ${Math.round(f.ageSeconds / 60)} min ago` : ''}</span>
            </span>
            <span className="ui-sev" data-sev={statusSev[f.status] || 'watch'}>{String(f.status).toUpperCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EntityLauncher({ openEntityGraph }: { openEntityGraph: ShellProps['openEntityGraph'] }) {
  const [type, setType] = useState('aircraft');
  const [id, setId] = useState('');
  return (
    <form className="ui-card flex flex-col gap-3" style={{ padding: 18, maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); if (id.trim()) openEntityGraph({ type, id: id.trim(), label: id.trim() }); }}>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--ui-text-2)' }}>Start from something you know: a flight callsign, a ship name or IMO, an IP address or a country. You can also open the graph from any aircraft or ship on the map.</p>
      <div className="flex gap-2 flex-wrap">
        <label htmlFor="entity-type" className="sr-only">Type</label>
        <select id="entity-type" value={type} onChange={(e) => setType(e.target.value)} style={{ height: 44, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)', color: 'var(--ui-text)', padding: '0 10px', fontSize: 15 }}>
          <option value="aircraft">Aircraft</option>
          <option value="vessel">Vessel</option>
          <option value="ip">IP address</option>
          <option value="country">Country</option>
        </select>
        <label htmlFor="entity-id" className="sr-only">Identifier</label>
        <input id="entity-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. UAL123, 8.8.8.8, Ukraine" style={{ flexGrow: 1, minWidth: 180, height: 44, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line-strong)', background: 'var(--ui-bg)', color: 'var(--ui-text)', padding: '0 12px', fontSize: 15 }} />
        <button type="submit" className="ui-btn ui-btn-primary">Open graph</button>
      </div>
    </form>
  );
}

interface Props extends ShellProps { goSpace: (s: SpaceId) => void }

export default function InvestigateSpace(props: Props) {
  const { data, layout } = props;
  const [tool, setTool] = useState<Tool>('ask');
  const narrow = layout === 'phone' || layout === 'tablet-portrait';
  const current = TOOLS.find((t) => t.id === tool)!;

  const body = (() => {
    switch (tool) {
      case 'ask': return <div className="legacy-scope" style={{ height: 'min(720px, calc(100vh - 160px))' }}><AiAnalyst data={data} embedded /></div>;
      case 'recon': return <div className="legacy-scope" style={{ maxWidth: 520 }}><OsintPanel onSweepVisualize={props.setSweepData} onScanGeolocate={(target: string, d: any) => { props.addScanTarget(target, d); props.flyTo(d.lat, d.lng); }} /></div>;
      case 'entity': return <EntityLauncher openEntityGraph={props.openEntityGraph} />;
      case 'markets': return <div className="legacy-scope grid gap-4" style={{ gridTemplateColumns: narrow ? '1fr' : 'repeat(2, minmax(0, 1fr))', alignItems: 'start' }}><MarketsPanel data={data} spaceWeather={props.spaceWeather} /><ScmPanel data={data} /></div>;
      case 'brief': return <div className="legacy-scope" style={{ maxWidth: 720 }}><AIBriefingPanel beaconData={data} /></div>;
      case 'sources': return <SourceHealth />;
      case 'share': return (
        <div className="flex flex-col gap-4" style={{ maxWidth: 560 }}>
          <div className="legacy-scope"><SharePanel mapView={props.mapView} activeLayers={props.activeLayers} mouseCoords={null} /></div>
          <div className="ui-card" style={{ padding: 16 }}>
            <h3 className="ui-heading" style={{ margin: '0 0 8px', fontSize: 16 }}>Keyboard</h3>
            <dl className="grid" style={{ gridTemplateColumns: 'auto 1fr', gap: '6px 14px', margin: 0, fontSize: 15 }}>
              {SHORTCUTS.map(([k, d]) => (
                <Fragment key={k}><dt className="ui-data" style={{ color: 'var(--ui-accent-text)' }}>{k}</dt><dd style={{ margin: 0 }}>{d}</dd></Fragment>
              ))}
            </dl>
          </div>
        </div>
      );
    }
  })();

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--ui-bg)', display: 'flex', flexDirection: narrow ? 'column' : 'row' }}>
      <nav aria-label="Tools" className={narrow ? 'flex gap-2' : 'ui-scroll flex flex-col gap-1'} style={narrow ? { padding: '14px 16px 6px', overflowX: 'auto', flexShrink: 0 } : { width: 260, padding: '24px 14px', borderRight: '1px solid var(--ui-line)', flexShrink: 0 }}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tool;
          return narrow ? (
            <button key={t.id} className="ui-chip" aria-pressed={active} onClick={() => setTool(t.id)}>{t.label}</button>
          ) : (
            <button key={t.id} onClick={() => setTool(t.id)} aria-current={active ? 'page' : undefined} className="flex items-center gap-3 text-left"
              style={{ minHeight: 56, padding: '8px 12px', borderRadius: 'var(--ui-control-radius)', border: 0, background: active ? 'var(--ui-accent-soft)' : 'transparent', color: active ? 'var(--ui-accent-text)' : 'var(--ui-text)', cursor: 'pointer' }}>
              <Icon size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span className="flex flex-col"><span style={{ fontSize: 15, fontWeight: 600 }}>{t.label}</span><span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{t.hint}</span></span>
            </button>
          );
        })}
      </nav>
      <main className="ui-scroll" style={{ flexGrow: 1, minWidth: 0, padding: narrow ? '12px 16px 24px' : '24px 28px' }}>
        <h1 className="ui-heading" style={{ margin: '0 0 16px', fontSize: narrow ? 24 : 28, fontWeight: 700, textTransform: 'none' }}>{current.label}</h1>
        {body}
      </main>
    </div>
  );
}
