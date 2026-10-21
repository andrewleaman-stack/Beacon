export const TIMELINE: {
  pastMs: number;
  futureMs: number;
  pastStepMs: number;
  futureStepMs: number;
  pastShare: number;
  loopMs: number;
};
export function snapTime(t: number, now: number): number;
export function timeToPosition(t: number, now: number): number;
export function positionToTime(p: number, now: number): number;
export function stepTime(t: number, now: number, dir: 1 | -1): number;
export function nextPlayTime(t: number, now: number): number;
export function frameIndexAt(frames: number[], t: number, toleranceMs: number): number;
export function framesToKeep(frames: number[], t: number | null, toleranceMs: number, preload?: number): { keep: number[]; current: number | null };
export function parseIsoDuration(text: string): number;
export function expandTimeDimension(text: string, from: number, to: number): number[];
export function activeAt(start: string | null | undefined, end: string | null | undefined, t: number): boolean;
export function formatOffset(t: number, now: number): string;
