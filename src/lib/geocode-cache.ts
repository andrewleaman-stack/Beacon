// Geocode cache with TTL and LRU eviction
// Replaces the inline geocodeCache in page.tsx

interface GeocodeEntry {
  label: string;
  expires: number;  // Unix timestamp
}

const GEOCODE_CACHE_MAX_SIZE = 500;
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const geocodeCache = new Map<string, GeocodeEntry>();

export function getCachedLabel(key: string): string | null {
  const entry = geocodeCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expires) {
    geocodeCache.delete(key);
    return null;
  }
  return entry.label;
}

export function setCachedLabel(key: string, label: string): void {
  if (geocodeCache.size >= GEOCODE_CACHE_MAX_SIZE) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) geocodeCache.delete(firstKey);
  }
  
  geocodeCache.set(key, {
    label,
    expires: Date.now() + GEOCODE_CACHE_TTL_MS,
  });
}

export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of geocodeCache.entries()) {
    if (now > entry.expires) {
      geocodeCache.delete(key);
    }
  }
}

if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 60 * 60 * 1000);
}

export { geocodeCache };