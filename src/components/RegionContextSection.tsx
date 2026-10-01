'use client';

import { useEffect, useState } from 'react';

interface LocalSun { timezone: string; timezoneAbbreviation: string; utcOffsetSeconds: number; isDay: boolean; sunrise: string | null; sunset: string | null }
interface WorldBankIndicator { key: string; label: string; unit: string; value: number; year: number }

function formatIndicator(ind: WorldBankIndicator): string {
  if (ind.unit === 'usd') return `$${Math.round(ind.value).toLocaleString()}`;
  if (ind.unit === 'years') return `${ind.value.toFixed(1)} yrs`;
  return `${ind.value.toFixed(1)}%`;
}

/** "2026-10-01T06:57" (already local wall-clock time) -> "06:57" */
function wallClock(value: string | null): string {
  return value?.split('T')[1]?.slice(0, 5) || '—';
}

function useLocalTime(timeZone?: string): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!timeZone) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(now);
  } catch {
    return '—';
  }
}

export default function RegionContextSection({ localSun, indicators, modern = false }: { localSun?: LocalSun | null; indicators?: WorldBankIndicator[]; modern?: boolean }) {
  const localTime = useLocalTime(localSun?.timezone);
  if (!localSun && !indicators?.length) return null;
  if (modern) return <ModernContext localSun={localSun} indicators={indicators} localTime={localTime} />;

  return (
    <div className="space-y-3">
      {localSun && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="hud-label mb-0.5">LOCAL TIME</div>
            <div className="text-xs text-[var(--text-primary)] font-mono">{localTime}</div>
            <div className="text-[8px] text-[var(--text-muted)]">{localSun.timezone} ({localSun.timezoneAbbreviation})</div>
          </div>
          <div>
            <div className="hud-label mb-0.5">SUNRISE</div>
            <div className="text-xs text-[var(--text-primary)] font-mono">{wallClock(localSun.sunrise)}</div>
          </div>
          <div>
            <div className="hud-label mb-0.5">SUNSET</div>
            <div className="text-xs text-[var(--text-primary)] font-mono">{wallClock(localSun.sunset)}</div>
            <div className="text-[8px] text-[var(--text-muted)]">{localSun.isDay ? 'Daylight now' : 'Dark now'}</div>
          </div>
        </div>
      )}
      {!!indicators?.length && (
        <div>
          <div className="hud-label mb-1">DEVELOPMENT INDICATORS</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {indicators.map((ind) => (
              <div key={ind.key} className="flex items-baseline justify-between gap-2">
                <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">{ind.label}</span>
                <span className="text-xs text-[var(--text-primary)] font-mono tabular-nums">
                  {formatIndicator(ind)} <span className="text-[8px] text-[var(--text-muted)]">{ind.year}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="text-[7px] text-[var(--text-muted)] mt-1">World Bank Open Data (CC BY 4.0) · Sun times: Open-Meteo.com</div>
        </div>
      )}
    </div>
  );
}

/** Modern-shell rendering: theme tokens, readable sizes. */
function ModernContext({ localSun, indicators, localTime }: { localSun?: LocalSun | null; indicators?: WorldBankIndicator[]; localTime: string }) {
  const label = { fontSize: 13, color: 'var(--ui-text-2)' } as const;
  const value = { fontSize: 15, fontFamily: 'var(--ui-font-data)' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {localSun && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div><div style={label}>Local time</div><div style={value}>{localTime}</div><div style={{ ...label, fontSize: 12 }}>{localSun.timezone}</div></div>
          <div><div style={label}>Sunrise</div><div style={value}>{wallClock(localSun.sunrise)}</div></div>
          <div><div style={label}>Sunset</div><div style={value}>{wallClock(localSun.sunset)}</div><div style={{ ...label, fontSize: 12 }}>{localSun.isDay ? 'Daylight now' : 'Dark now'}</div></div>
        </div>
      )}
      {!!indicators?.length && (
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Development indicators</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px 16px' }}>
            {indicators.map((ind) => (
              <div key={ind.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, color: 'var(--ui-text-2)' }}>{ind.label}</span>
                <span style={{ fontSize: 14, fontFamily: 'var(--ui-font-data)' }}>{formatIndicator(ind)} <span style={{ fontSize: 12, color: 'var(--ui-text-3)' }}>{ind.year}</span></span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ui-text-3)', marginTop: 6 }}>World Bank Open Data (CC BY 4.0) · Sun times: Open-Meteo.com</div>
        </div>
      )}
    </div>
  );
}
