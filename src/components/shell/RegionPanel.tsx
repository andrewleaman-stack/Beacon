'use client';

import { X } from 'lucide-react';
import RegionContextSection from '@/components/RegionContextSection';

interface Props {
  dossier: any;
  loading: boolean;
  onClose: () => void;
}

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col" style={{ minWidth: 0 }}>
      <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{label}</span>
      <span style={{ fontSize: 15 }}>{value === null || value === undefined || value === '' ? '—' : value}</span>
    </div>
  );
}

/** About this place: the right-click / long-press region summary. */
export default function RegionPanel({ dossier, loading, onClose }: Props) {
  const c = dossier?.country;
  return (
    <section aria-label="About this place" className="ui-panel ui-scroll flex flex-col" style={{ padding: 18, gap: 14, maxHeight: '100%' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col" style={{ minWidth: 0 }}>
          <span className="ui-data" style={{ fontSize: 12, letterSpacing: '0.08em', color: 'var(--ui-accent-text)' }}>ABOUT THIS PLACE</span>
          <h2 className="ui-heading" style={{ margin: 0, fontSize: 21, fontWeight: 700, textTransform: 'none', lineHeight: 1.2 }}>
            {loading ? 'Looking it up…' : dossier?.location?.display_name || 'Unknown place'}
          </h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex items-center justify-center" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, border: '1px solid var(--ui-line)', background: 'transparent', cursor: 'pointer' }}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {!loading && c && (
        <dl className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px', margin: 0 }}>
          <Fact label="Country" value={`${c.flag || ''} ${c.name || ''}`.trim()} />
          <Fact label="Capital" value={c.capital} />
          <Fact label="Population" value={c.population ? Number(c.population).toLocaleString() : null} />
          <Fact label="Income level" value={c.income_level} />
          <Fact label="Region" value={c.region} />
          <Fact label="Area" value={c.area ? `${Math.round(c.area).toLocaleString()} km²` : null} />
          {dossier.head_of_state && <Fact label={dossier.head_of_state.position || 'Head of state'} value={dossier.head_of_state.name} />}
        </dl>
      )}

      {!loading && dossier && (
        <div style={{ borderTop: '1px solid var(--ui-line)', paddingTop: 12 }}>
          <RegionContextSection modern localSun={dossier.local_sun} indicators={dossier.indicators} />
        </div>
      )}

      {!loading && dossier?.wikipedia?.extract && (
        <div className="flex gap-3" style={{ borderTop: '1px solid var(--ui-line)', paddingTop: 12 }}>
          {dossier.wikipedia.thumbnail && <img src={dossier.wikipedia.thumbnail} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ui-text-2)' }}>{dossier.wikipedia.extract}</p>
        </div>
      )}
    </section>
  );
}
