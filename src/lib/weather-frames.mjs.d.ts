export interface TimedRadarFrame { time: number; tiles: string[] }
export interface WeatherFrames {
  radar: { maxzoom: number; frames: TimedRadarFrame[] } | null;
  lightning: number[];
  /** Keyed by cloud layer id: goes-west, goes-east, himawari, meteosat. */
  clouds: Record<string, number[]>;
  errors: string[];
  fetchedAt: number;
}
export function settledGibsTimes(times: number[]): number[];
export function fetchWeatherFrames(options?: { fetchImpl?: typeof fetch; now?: number; previous?: WeatherFrames | null }): Promise<WeatherFrames>;
