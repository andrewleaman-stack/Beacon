import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { EarthquakeEvent, NewsItem, ThreatEvent, CyberAlert, IntelligenceContext } from '@/types/feeds';

interface FeedResponse<T> {
  data: T[];
  timestamp: string;
  meta?: Record<string, unknown>;
}

// Generic feed fetcher
async function fetchFeed<T>(url: string, transform?: (d: any) => T[]): Promise<T[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return transform ? transform(json) : json;
}

// Earthquakes
export function useEarthquakes(options?: Partial<UseQueryOptions<EarthquakeEvent[]>>) {
  return useQuery({
    queryKey: ['earthquakes'],
    queryFn: () => fetchFeed<EarthquakeEvent>('/api/earthquakes'),
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 15 * 60 * 1000, // 15 min
    ...options,
  });
}

// News
export function useNews(options?: Partial<UseQueryOptions<NewsItem[]>>) {
  return useQuery({
    queryKey: ['news'],
    queryFn: () => fetchFeed<NewsItem>('/api/news'),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    ...options,
  });
}

// Markets
export interface MarketData {
  vix: number;
  spy: number;
  dxy: number;
  gold: number;
  oil: number;
  btc: number;
  timestamp: string;
}

export function useMarkets(options?: Partial<UseQueryOptions<MarketData>>) {
  return useQuery({
    queryKey: ['markets'],
    queryFn: () => fetchFeed<MarketData>('/api/markets', (d) => d),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    ...options,
  });
}

// Space Weather
export interface SpaceWeatherData {
  kpIndex: number;
  solarWindSpeed: number;
  bz: number;
  protonFlux: number;
  xrayFlux: string;
  timestamp: string;
}

export function useSpaceWeather(options?: Partial<UseQueryOptions<SpaceWeatherData>>) {
  return useQuery({
    queryKey: ['space-weather'],
    queryFn: () => fetchFeed<SpaceWeatherData>('/api/space-weather', (d) => d),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    ...options,
  });
}

// Layer-aware feeds (only fetch when enabled)
export function useFlights(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['flights'],
    queryFn: () => fetchFeed('/api/flights'),
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    ...options,
  });
}

export function useSatellites(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['satellites'],
    queryFn: () => fetchFeed('/api/satellites'),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    ...options,
  });
}

export function useFires(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['fires'],
    queryFn: () => fetchFeed('/api/fires'),
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    ...options,
  });
}

export function useCCTV(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['cctv'],
    queryFn: () => fetchFeed('/api/cctv?region=all&v=2'),
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    ...options,
  });
}

export function useMaritime(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['maritime'],
    queryFn: () => fetchFeed('/api/maritime', (d) => ({
      ports: d.ports,
      chokepoints: d.chokepoints,
      ships: d.ships,
    })),
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    ...options,
  });
}

export function useBalloons(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['balloons'],
    queryFn: () => fetchFeed('/api/balloons', (d) => d.balloons),
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    ...options,
  });
}

export function useRadiation(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['radiation'],
    queryFn: () => fetchFeed('/api/radiation', (d) => d.stations),
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    ...options,
  });
}

export function usePortDisruptions(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['port-disruptions'],
    queryFn: () => fetchFeed('/api/port-disruptions'),
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
    ...options,
  });
}

export function useConflictEvents(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['conflict-events'],
    queryFn: () => fetchFeed('/api/conflict-events'),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    ...options,
  });
}

export function useGPSJamming(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['gps-jamming'],
    queryFn: () => fetchFeed('/api/gps-jamming'),
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    ...options,
  });
}

export function useWarAlerts(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['war-alerts'],
    queryFn: () => fetchFeed('/api/war-alerts'),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    ...options,
  });
}

export function useMalware(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['malware'],
    queryFn: () => fetchFeed('/api/malware'),
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
    ...options,
  });
}

export function useIPsweep(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['ip-sweep'],
    queryFn: () => fetchFeed('/api/ip-sweep'),
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
    ...options,
  });
}

export function useLiveNews(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['live-news'],
    queryFn: () => fetchFeed('/api/live-news'),
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    ...options,
  });
}

export function useNewsIntel(enabled: boolean, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: ['news-intel'],
    queryFn: () => fetchFeed('/api/news-intel'),
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    ...options,
  });
}

// Combined intelligence context for AI briefing
export function useIntelligenceContext(
  activeLayers: Record<string, boolean>,
  options?: Partial<UseQueryOptions<IntelligenceContext>>
) {
  const earthquakes = useEarthquakes();
  const news = useNews();
  const markets = useMarkets();
  const spaceWeather = useSpaceWeather();
  const flights = useFlights(activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers['private-fl']);
  const satellites = useSatellites(activeLayers.satellites);
  const fires = useFires(activeLayers.fires);
  const cctv = useCCTV(activeLayers.cctv);
  const maritime = useMaritime(activeLayers.maritime);
  const balloons = useBalloons(activeLayers.balloons);
  const radiation = useRadiation(activeLayers.radiation);
  const portDisruptions = usePortDisruptions(activeLayers.port_disruptions);
  const conflictEvents = useConflictEvents(activeLayers.conflict_events);
  const gpsJamming = useGPSJamming(activeLayers.gps_jamming);
  const warAlerts = useWarAlerts(activeLayers.war_alerts);
  const malware = useMalware(activeLayers.malware);
  const ipSweep = useIPsweep(activeLayers['ip-sweep-devices'] || activeLayers['ip-sweep-pulse'] || activeLayers['ip-sweep-connections']);
  const liveNews = useLiveNews(activeLayers['live-news']);
  const newsIntel = useNewsIntel(activeLayers['news-intel']);

  return useQuery({
    queryKey: ['intelligence-context', activeLayers],
    queryFn: (): IntelligenceContext => ({
      earthquakes: earthquakes.data || [],
      news: news.data || [],
      threats: [], // GDELT/threats would need separate hook
      cyberAlerts: [], // Cyber alerts would need separate hook
      timestamp: new Date().toISOString(),
    }),
    enabled: true,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}