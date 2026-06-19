# Page.tsx Patches for Phase 1

## 1. Import new utilities (add after existing imports)

```typescript
import { getCachedLabel, setCachedLabel>setCachedLabel } from '@/lib/geocode-cache';
import { deduplicatedFetchEndpoint } from '@/lib/fetch-dedupe';
```

## 2. Replace geocodeCache usage (lines 140, 297, 304-305)

### Old (line 140):
```typescript
const geocodeCache = useRef<Map<string, string>>(new Map());
```

### New:
```typescript
// Geocode cache now imported from @/lib/geocode-cache
// No local state needed - uses module-level Map with TTL/LRU
```

### Old (line 297):
```typescript
if (geocodeCache.current.has(gk)) { 
  setLocationLabel(geocodeCache.current.get(gk)!); 
  lastGeocodedPos.current = coords; 
  return; 
}
```

### New:
```typescript
const cached = getCachedLabel(gk);
if (cached) { 
  setLocationLabel(cached); 
  lastGeocodedPos.current = coords; 
  return; 
}
```

### Old (lines 304-305):
```typescript
if (geocodeCache.current.size > 500) { 
  const it = geocodeCache.current.keys(); 
  for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
geocodeCache.current.set(gk, label);
```

### New:
```typescript
setCachedLabel(gk, label);
```

## 3. Replace fetchEndpoint with deduplicated version (lines 393-410)

### Old:
```typescript
const fetchEndpoint = useCallback(async (url: string, transform?: (d: any) => any, options?: RequestInit) => {
  try {
    const res = await fetch(url, { ...options, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return transform ? transform(json) : json;
  } catch (e) {
    console.error(`[BEACON] fetch ${url} failed:`, e);
    return null;
  }
}, []);
```

### New:
```typescript
const fetchEndpoint = useCallback(async (url: string, transform?: (d: any) => any, options?: RequestInit) => {
  try {
    return await deduplicatedFetchEndpoint(url, transform, options);
  } catch (e) {
    console.error(`[BEACON] fetch ${url} failed:`, e);
    return null;
  }
}, []);
```

## 4. Type activeLayers with LayerKey (line 145)

### Old:
```typescript
const [activeLayers, setActiveLayers] = useState({
  flights: false,
  private: false,
  // ... 30+ keys
});
```

### New:
```typescript
import type { LayerKey } from '@/types/feeds';

const initialLayers: Record<LayerKey, boolean> = {
  flights: false,
  military: false,
  jets: false,
  'private-fl': false,
  maritime: true,
  satellites: false,
  balloons: false,
  cctv: true,
  'live-news': true,
  'news-intel': true,
  earthquakes: true,
  fires: false,
  weather: false,
  radiation: false,
  port_disruptions: false,
  conflict_events: false,
  // ... rest of keys
} as const;

const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>(initialLayers);
```