'use client';

import { useEffect, useMemo } from 'react';
import { Pause, Play, Radio } from 'lucide-react';
import { useTimeline } from '@/stores/timeline';
import { useNow } from '@/hooks/use-weather-frames';
import { TIMELINE, formatOffset, nextPlayTime, positionToTime, snapTime, stepTime, timeToPosition } from '@/lib/weather-timeline.mjs';

const HOUR = 3_600_000;
const STEPS = 1000;
const PLAY_INTERVAL_MS = 650;

const TICKS = [
  { offset: -3 * HOUR, label: '−3h' },
  { offset: -2 * HOUR, label: '−2h' },
  { offset: -1 * HOUR, label: '−1h' },
  { offset: 0, label: 'Now' },
  { offset: 24 * HOUR, label: '+1d' },
  { offset: 48 * HOUR, label: '+2d' },
  { offset: 72 * HOUR, label: '+3d' },
];

const clockFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Map timeline: the last 3 hours of observations (10-minute steps) and the
 * next 3 days of forecasts (hourly). Play loops the last 2 hours like a radar
 * loop, or steps through the forecast when started from a future time.
 */
export default function WeatherTimeline({ pastLayers, compact = false }: {
  /** Labels of the active layers that only have past data (radar, clouds, lightning). */
  pastLayers: string[];
  compact?: boolean;
}) {
  const { time, playing, setTime, setPlaying, goLive } = useTimeline();
  const now = useNow(30_000);
  const live = time === null;
  const t = time ?? now;
  const future = t > now;

  // Advance while playing. Reading the store inside the timer avoids restarting it every frame.
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      const current = useTimeline.getState().time ?? Date.now();
      useTimeline.getState().setTime(nextPlayTime(current, Date.now()));
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [playing]);

  // Drift back to live if the chosen time slides out of the window (tab left open).
  useEffect(() => {
    if (time !== null && time < now - TIMELINE.pastMs) goLive();
  }, [time, now, goLive]);

  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (live) setTime(snapTime(now - TIMELINE.loopMs, now));
    setPlaying(true);
  };

  const onSlide = (value: number) => {
    setPlaying(false);
    setTime(snapTime(positionToTime(value / STEPS, now), now));
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    setPlaying(false);
    setTime(stepTime(t, now, dir as 1 | -1));
  };

  // A note when some active layers have nothing to show at the chosen time.
  const note = useMemo(() => {
    if (future && pastLayers.length) return `${pastLayers.join(', ')}: observations only, nothing ahead of now`;
    return '';
  }, [future, pastLayers]);

  const position = Math.round(timeToPosition(t, now) * STEPS);
  const nowPosition = TIMELINE.pastShare * 100;
  const label = live ? 'Live' : formatOffset(t, now);

  return (
    <section aria-label="Map timeline" className="flex flex-col"
      style={{ gap: 4, padding: compact ? '8px 10px' : '10px 14px', borderRadius: 'var(--ui-radius)', background: 'var(--ui-raised)', border: '1px solid var(--ui-line)', boxShadow: 'var(--ui-shadow)', color: 'var(--ui-text)' }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <button onClick={togglePlay} aria-label={playing ? 'Pause' : future ? 'Play forecast' : 'Play last 2 hours'} title={playing ? 'Pause' : future ? 'Play forecast' : 'Play last 2 hours'}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 'var(--ui-control-radius)', border: '1px solid var(--ui-line)', background: playing ? 'var(--ui-accent-soft)' : 'transparent', color: playing ? 'var(--ui-accent-text)' : 'var(--ui-text)', cursor: 'pointer' }}>
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button onClick={goLive} aria-pressed={live} aria-label="Back to live" title="Back to live" className="ui-chip flex items-center" style={{ gap: 6, flexShrink: 0 }}>
          <Radio size={14} aria-hidden="true" />{!compact && ' Live'}
        </button>

        <div style={{ position: 'relative', flexGrow: 1, minWidth: 0, height: 40 }}>
          {/* Past and future halves of the track, and the "now" mark. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 4, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${nowPosition}%`, background: 'var(--ui-line)' }} />
            <div style={{ flexGrow: 1, background: 'var(--ui-accent-soft)' }} />
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', left: `${nowPosition}%`, top: 8, width: 2, height: 16, marginLeft: -1, background: 'var(--ui-accent)' }} />
          <input type="range" min={0} max={STEPS} step={1} value={position}
            onChange={(e) => onSlide(Number(e.target.value))} onKeyDown={onKey}
            aria-label="Map time" aria-valuetext={live ? 'Live' : `${label}, ${clockFmt.format(t)}`}
            style={{ position: 'absolute', left: 0, right: 0, top: 4, width: '100%', height: 24, margin: 0, background: 'transparent', accentColor: 'var(--ui-accent)', cursor: 'pointer' }} />
          {!compact && TICKS.map((tick) => (
            <span key={tick.label} aria-hidden="true" className="ui-data"
              style={{ position: 'absolute', top: 27, left: `${timeToPosition(now + tick.offset, now) * 100}%`, transform: tick.offset === TICKS[0].offset ? 'none' : tick.offset === TICKS[TICKS.length - 1].offset ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 11, color: tick.offset === 0 ? 'var(--ui-accent-text)' : 'var(--ui-text-3)', whiteSpace: 'nowrap' }}>
              {tick.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col" style={{ flexShrink: 0, minWidth: compact ? 56 : 104, textAlign: 'right' }} aria-live="polite">
          <span className="ui-data" style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: live ? 'var(--ui-accent-text)' : 'var(--ui-text)' }}>{label}</span>
          {!compact && <span style={{ fontSize: 12, color: 'var(--ui-text-2)' }}>{clockFmt.format(t)}</span>}
        </div>
      </div>
      {note && <div style={{ fontSize: 12, color: 'var(--ui-text-2)', paddingLeft: compact ? 0 : 98 }}>{note}</div>}
    </section>
  );
}
