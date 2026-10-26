import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { fetchWeatherFrames } from '@/lib/weather-frames.mjs';

type WeatherFrames = Awaited<ReturnType<typeof fetchWeatherFrames>>;

/**
 * Frame times for radar, satellite clouds and lightning. Shared through the
 * query cache, so the map and the timeline make one request between them.
 */
export function useWeatherFrames(enabled: boolean) {
  return useQuery({
    queryKey: ['weather-frames'],
    queryFn: async (): Promise<WeatherFrames> => {
      const res = await fetch('/api/weather-frames', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled,
    staleTime: 4 * 60_000,
    refetchInterval: enabled ? 5 * 60_000 : false,
  });
}

/** The current time, refreshed every `everyMs`. */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(iv);
  }, [everyMs]);
  return now;
}
