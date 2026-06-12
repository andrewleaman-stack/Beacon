'use client';

import { useMemo } from 'react';
import { Link, Clock, ExternalLink, FileText, Globe, Layers, Radio } from 'lucide-react';

interface SourceLinksTimelinePanelProps {
  entity?: {
    type: string;
    id: string;
    label: string;
    properties?: Record<string, unknown>;
  };
  beaconData: Record<string, unknown>;
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

function extractLinks(item: Record<string, unknown>): string[] {
  const links = [];
  const candidates = ['url', 'link', 'source_url', 'article_url', 'web_url', 'permalink'];
  for (const key of candidates) {
    if (item[key] && typeof item[key] === 'string') links.push(String(item[key]));
  }
  if (item.sources && Array.isArray(item.sources)) {
    for (const s of item.sources) {
      if (typeof s === 'string' && s.startsWith('http')) links.push(s);
    }
  }
  return [...new Set(links)];
}

export default function SourceLinksTimelinePanel({ entity, beaconData }: SourceLinksTimelinePanelProps) {
  const timelineItems = useMemo(() => {
    if (!entity) return [];

    const sources = [
      { key: 'news', data: beaconData.news, label: 'OSINT NEWS' },
      { key: 'gdelt', data: beaconData.gdelt, label: 'GDELT EVENTS' },
      { key: 'earthquakes', data: beaconData.earthquakes, label: 'USGS QUAKES' },
      { key: 'live_feeds', data: beaconData.live_feeds, label: 'LIVE FEEDS' },
    ];

    const items = [];
    for (const source of sources) {
      const sourceData = Array.isArray(source.data) ? source.data : [];
      for (const item of sourceData) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        
        // Filter by entity relevance if we have an entity
        if (entity) {
          const title = String(record.title || record.description || '').toLowerCase();
          const entityLabel = entity.label.toLowerCase();
          const entityId = entity.id.toLowerCase();
          if (!title.includes(entityLabel) && !title.includes(entityId)) continue;
        }

        const time = getTime(record);
        const links = extractLinks(record);
        
        items.push({
          source: source.label,
          time,
          title: String(record.title || record.description || record.place || 'Untitled'),
          links,
          raw: record,
        });
      }
    }

    return items
      .filter(i => i.links.length > 0)
      .sort((a, b) => (b.time || 0) - (a.time || 0))
      .slice(0, 20);
  }, [entity, beaconData]);

  if (!entity) {
    return (
      <div className="glass-panel p-8 h-full flex items-center justify-center">
        <div className="text-center text-white/40">
          <Link className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-[9px] font-mono tracking-widest">SELECT AN ENTITY</div>
          <div className="text-[8px] mt-1">Click a map feature to see source links</div>
        </div>
      </div>
    );
  }

  if (!timelineItems.length) {
    return (
      <div className="glass-panel p-8 h-full flex items-center justify-center">
        <div className="text-center text-white/40">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="text-[9px] font-mono tracking-widest">NO SOURCE LINKS</div>
          <div className="text-[8px] mt-1">No linked sources found for this entity</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 h-full overflow-y-auto styled-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-bold text-white tracking-wider">SOURCE LINKS & TIMELINE</h3>
        <div className="flex items-center gap-2 text-[8px] font-mono text-white/40">
          <Radio className="w-3 h-3" />
          <span>{timelineItems.length} SOURCES</span>
        </div>
      </div>

      <div className="space-y-3">
        {timelineItems.map((item, idx) => (
          <div key={`${item.source}-${item.time || idx}`} className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Link className="w-3.5 h-3.5 text-[var(--cyan-primary)] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold text-white truncate">{item.title}</div>
                  <div className="flex items-center gap-2 text-[8px] font-mono text-white/40 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[7px] font-mono text-white/50 border border-white/10 bg-white/[0.02]">
                      {item.source}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {item.time ? new Date(item.time).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 ml-5">
              {item.links.slice(0, 5).map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10 hover:text-white transition-colors border border-[var(--cyan-primary)]/20"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {new URL(link).hostname.replace('www.', '')}
                </a>
              ))}
              {item.links.length > 5 && (
                <span className="px-2 py-1 rounded text-[8px] font-mono text-white/40 border border-white/10">
                  +{item.links.length - 5} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}