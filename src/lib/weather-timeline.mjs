/**
 * Shared map timeline: one clock that every time-aware layer follows.
 *
 * The slider is split in two: the left part covers the last few hours of
 * observations in 10-minute steps, the right part the next three days of
 * forecasts in 1-hour steps. "Now" sits on the boundary.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;

export const TIMELINE = {
  pastMs: 3 * HOUR,
  futureMs: 72 * HOUR,
  pastStepMs: 10 * MIN,
  futureStepMs: HOUR,
  /** Share of the slider width given to the past. */
  pastShare: 0.4,
  /** Playing in the past loops over this window, like a radar loop. */
  loopMs: 2 * HOUR,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Snap to 10 minutes in the past and to the hour in the future, inside the range. */
export function snapTime(t, now) {
  const lo = now - TIMELINE.pastMs;
  const hi = now + TIMELINE.futureMs;
  const v = clamp(t, lo, hi);
  if (v <= now) return Math.max(lo, Math.floor(v / TIMELINE.pastStepMs) * TIMELINE.pastStepMs);
  return Math.min(hi, Math.max(now, Math.round(v / TIMELINE.futureStepMs) * TIMELINE.futureStepMs));
}

/** Time → slider position 0..1. */
export function timeToPosition(t, now) {
  if (t <= now) return clamp(TIMELINE.pastShare * (1 - (now - t) / TIMELINE.pastMs), 0, TIMELINE.pastShare);
  return clamp(TIMELINE.pastShare + (1 - TIMELINE.pastShare) * ((t - now) / TIMELINE.futureMs), TIMELINE.pastShare, 1);
}

/** Slider position 0..1 → time (unsnapped). */
export function positionToTime(p, now) {
  const x = clamp(p, 0, 1);
  if (x <= TIMELINE.pastShare) return now - TIMELINE.pastMs * (1 - x / TIMELINE.pastShare);
  return now + TIMELINE.futureMs * ((x - TIMELINE.pastShare) / (1 - TIMELINE.pastShare));
}

/** Arrow-key / play step from `t`, in the direction `dir` (+1 or -1). */
export function stepTime(t, now, dir) {
  const inPast = dir > 0 ? t < now : t <= now;
  const step = inPast ? TIMELINE.pastStepMs : TIMELINE.futureStepMs;
  const next = snapTime(t + dir * step, now);
  // Stepping forward out of the past lands on "now", not on the first hour after it.
  if (dir > 0 && t < now && next > now) return now;
  return next;
}

/**
 * Next frame while playing. In the past it loops over the last `loopMs`;
 * in the future it steps hourly and wraps back to now.
 */
export function nextPlayTime(t, now) {
  if (t < now) {
    const next = t + TIMELINE.pastStepMs;
    return next >= now ? snapTime(now - TIMELINE.loopMs, now) : next;
  }
  const next = t + TIMELINE.futureStepMs;
  return next > now + TIMELINE.futureMs ? now : snapTime(next, now);
}

/**
 * Index of the frame to show at `t`: the newest frame at or before `t`, as
 * long as it is no older than `toleranceMs`. Frames are epoch ms, ascending.
 * Returns -1 when no frame covers `t`.
 */
export function frameIndexAt(frames, t, toleranceMs) {
  let found = -1;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i] <= t) found = i;
    else break;
  }
  if (found < 0 || t - frames[found] > toleranceMs) return -1;
  return found;
}

/**
 * Which frames to keep on the map at `t` (null = live): the frame shown plus
 * the next `preload` ones, wrapping to the start so a looping animation
 * already has its first frames. Live shows just the newest frame.
 */
export function framesToKeep(frames, t, toleranceMs, preload = 0) {
  if (!frames.length) return { keep: [], current: null };
  if (t == null) {
    const last = frames[frames.length - 1];
    return { keep: [last], current: last };
  }
  const i = frameIndexAt(frames, t, toleranceMs);
  if (i < 0) return { keep: [], current: null };
  const count = Math.min(frames.length, 1 + preload);
  const keep = [];
  for (let k = 0; k < count; k++) keep.push(frames[(i + k) % frames.length]);
  return { keep, current: frames[i] };
}

/** ISO 8601 durations used by WMS/WMTS time dimensions (PT10M, PT15M, PT1H, P1D). */
export function parseIsoDuration(text) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(text || '').trim());
  if (!m) return 0;
  const [, d, h, mi, s] = m.map((v) => Number(v || 0));
  return ((d * 24 + h) * 60 + mi) * MIN + s * 1000;
}

/**
 * Expand a WMS/WMTS time dimension ("t1,t2,..." and/or "start/end/PT10M"
 * intervals, comma-separated) into epoch ms within [from, to], ascending.
 */
export function expandTimeDimension(text, from, to) {
  const out = new Set();
  for (const part of String(text || '').split(',')) {
    const item = part.trim();
    if (!item) continue;
    const [a, b, period] = item.split('/');
    if (!b) {
      const t = Date.parse(a);
      if (Number.isFinite(t) && t >= from && t <= to) out.add(t);
      continue;
    }
    const start = Date.parse(a);
    const end = Date.parse(b);
    const step = parseIsoDuration(period);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (!step) {
      for (const t of [start, end]) if (t >= from && t <= to) out.add(t);
      continue;
    }
    // Jump straight to the first step inside the window.
    let t = start < from ? start + Math.ceil((from - start) / step) * step : start;
    for (; t <= end && t <= to; t += step) out.add(t);
  }
  return [...out].sort((x, y) => x - y);
}

/** True when [start, end) covers `t`. A missing end means open-ended. */
export function activeAt(start, end, t) {
  const s = Date.parse(start);
  const e = end ? Date.parse(end) : Infinity;
  if (Number.isFinite(s) && t < s) return false;
  if (Number.isFinite(e) && t >= e) return false;
  return true;
}

/** Short offset label: "Now", "−1h 20m", "+5h", "+2d 3h". */
export function formatOffset(t, now) {
  const diff = t - now;
  if (Math.abs(diff) < MIN) return 'Now';
  const sign = diff < 0 ? '−' : '+';
  let mins = Math.round(Math.abs(diff) / MIN);
  const days = Math.floor(mins / (24 * 60));
  mins -= days * 24 * 60;
  const hours = Math.floor(mins / 60);
  mins -= hours * 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins && !days) parts.push(`${mins}m`);
  return sign + parts.join(' ');
}
