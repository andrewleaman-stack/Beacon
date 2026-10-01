/**
 * Plain-language catalogue of every map layer the modern shell exposes.
 * Keys match the `activeLayers` state used by BeaconMap and the data loaders.
 */

export interface LayerDef {
  key: string;
  label: string;
  hint?: string;
  color: string;
  /** Comma-separated keys in the dashboard data object used for the count. */
  dataKey?: string;
  /** Shown instead of a count when the layer needs setup. */
  note?: string;
}

export interface LayerGroup {
  id: string;
  label: string;
  layers: LayerDef[];
}

export const LAYER_GROUPS: LayerGroup[] = [
  {
    id: 'hazards',
    label: 'Hazards & weather',
    layers: [
      { key: 'earthquakes', label: 'Earthquakes', hint: 'Last 24 hours, USGS', color: '#F9A825', dataKey: 'earthquakes' },
      { key: 'weather', label: 'Severe weather', hint: 'NWS warnings and NASA events', color: '#A78BFA', dataKey: 'weather_events' },
      { key: 'weather_radar', label: 'Rain radar', hint: 'Updated every 10 minutes', color: '#4C8DFF' },
      { key: 'lightning', label: 'Lightning', hint: 'Americas, 15-minute density', color: '#FFE066' },
      { key: 'wind', label: 'Surface wind', hint: 'Arrows coloured by speed', color: '#90CAF9' },
      { key: 'fires', label: 'Active fires', hint: 'NASA FIRMS satellite detections', color: '#E65100', dataKey: 'fires' },
      { key: 'forest_alerts', label: 'Forest-loss alerts', hint: 'Global Forest Watch', color: '#EC407A' },
      { key: 'radiation', label: 'Radiation monitors', color: '#26A69A', dataKey: 'radiation' },
    ],
  },
  {
    id: 'incidents',
    label: 'Incidents & signals',
    layers: [
      { key: 'global_incidents', label: 'Reported incidents', hint: 'GDELT, machine-coded from news', color: '#D32F2F', dataKey: 'gdelt' },
      { key: 'conflict_events', label: 'Conflict events', hint: 'UCDP / ACLED', color: '#E53935', dataKey: 'conflict_events' },
      { key: 'wiki_surges', label: 'Wikipedia edit surges', hint: 'Breaking-news signal', color: '#ECEFF1', dataKey: 'wiki_surges' },
      { key: 'news_intel', label: 'Geolocated news', color: '#D4AF37', dataKey: 'news' },
      { key: 'gps_jamming', label: 'GPS jamming', color: '#D32F2F', dataKey: 'gps_jamming' },
    ],
  },
  {
    id: 'air-sea',
    label: 'Air, sea & space',
    layers: [
      { key: 'flights', label: 'Commercial flights', color: '#64B5F6', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Private aircraft', color: '#B0BEC5', dataKey: 'private_flights' },
      { key: 'jets', label: 'Business jets', color: '#7E57C2', dataKey: 'private_jets' },
      { key: 'military', label: 'Military aircraft', color: '#E53935', dataKey: 'military_flights' },
      { key: 'maritime', label: 'Ships & ports', hint: 'AIS vessels, ports, chokepoints', color: '#26C6DA', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
      { key: 'port_disruptions', label: 'Port disruptions', hint: 'IMF PortWatch', color: '#4DD0E1', dataKey: 'port_disruptions' },
      { key: 'satellites', label: 'Satellites', color: '#D4AF37', dataKey: 'satellites' },
      { key: 'launches', label: 'Space launches', hint: 'Past week and next two', color: '#FF7043', dataKey: 'launch_pads' },
    ],
  },
  {
    id: 'watch',
    label: 'Cameras & TV',
    layers: [
      { key: 'cctv', label: 'Public cameras', color: '#7E57C2', dataKey: 'cameras' },
      { key: 'live_news', label: 'Live TV channels', color: '#EC407A', dataKey: 'live_feeds' },
    ],
  },
  {
    id: 'infra',
    label: 'Infrastructure & cyber',
    layers: [
      { key: 'infrastructure', label: 'Nuclear facilities', color: '#26A69A', dataKey: 'infrastructure' },
      { key: 'sdk_sea', label: 'Submarine cables', color: '#4FC3F7', dataKey: 'submarine_cables' },
      { key: 'malware', label: 'Malware servers', hint: 'abuse.ch', color: '#D32F2F', dataKey: 'malware_threats' },
    ],
  },
  {
    id: 'base',
    label: 'Map style',
    layers: [
      { key: 'day_night', label: 'Day / night shading', color: '#448AFF' },
      { key: 'imagery_live', label: 'Live clouds', hint: 'Weather satellites, 10 minutes', color: '#90CAF9' },
      { key: 'imagery_truecolor', label: 'Satellite photo', hint: 'NASA, yesterday', color: '#81C784' },
    ],
  },
];

/** Layers that are part of the base map rather than data; presets leave them alone. */
export const STYLE_LAYER_KEYS = ['day_night', 'imagery_live', 'imagery_truecolor'];

export interface MapPreset {
  id: string;
  label: string;
  description: string;
  layers: string[];
}

export const MAP_PRESETS: MapPreset[] = [
  { id: 'overview', label: 'Overview', description: 'Quakes, incidents and severe weather', layers: ['earthquakes', 'global_incidents', 'weather', 'launches'] },
  { id: 'hazards', label: 'Hazards', description: 'Quakes, weather, radar, fires', layers: ['earthquakes', 'weather', 'weather_radar', 'fires', 'lightning'] },
  { id: 'air-sea', label: 'Air & Sea', description: 'Flights, ships, satellites', layers: ['flights', 'military', 'maritime', 'satellites', 'launches'] },
  { id: 'intel', label: 'Intel', description: 'Incidents, conflict, surges, news', layers: ['global_incidents', 'conflict_events', 'wiki_surges', 'news_intel', 'gps_jamming'] },
  { id: 'infra', label: 'Infrastructure', description: 'Nuclear, cables, ports, cyber', layers: ['infrastructure', 'sdk_sea', 'port_disruptions', 'malware'] },
  { id: 'quiet', label: 'Quiet', description: 'Just the map', layers: [] },
];

export function countForLayer(data: Record<string, unknown>, layer: LayerDef): number | null {
  if (!layer.dataKey) return null;
  let total = 0;
  let found = false;
  for (const k of layer.dataKey.split(',')) {
    const v = data?.[k];
    if (Array.isArray(v)) { total += v.length; found = true; }
  }
  return found ? total : null;
}

/**
 * Hidden state keys that must follow a visible layer. Submarine cables are
 * drawn by `sdk_sea` but their data only loads while `cables` is on.
 */
export const LINKED_LAYERS: Record<string, string[]> = { sdk_sea: ['cables'] };

/** Set one layer, keeping linked loader keys in step. */
export function setLayer<T extends Record<string, boolean>>(current: T, key: string, value: boolean): T {
  const next = { ...current, [key]: value } as Record<string, boolean>;
  for (const linked of LINKED_LAYERS[key] || []) next[linked] = value;
  return next as T;
}

/** Turn a preset into a full activeLayers object; style layers keep their current state. */
export function applyPreset<T extends Record<string, boolean>>(current: T, preset: MapPreset): T {
  const next = { ...current } as Record<string, boolean>;
  for (const key of Object.keys(next)) {
    if (STYLE_LAYER_KEYS.includes(key)) continue;
    next[key] = preset.layers.includes(key);
  }
  for (const [key, linked] of Object.entries(LINKED_LAYERS)) {
    for (const l of linked) if (l in next) next[l] = !!next[key];
  }
  return next as T;
}

export function activePresetId(current: Record<string, boolean>): string | null {
  for (const preset of MAP_PRESETS) {
    const hidden = new Set(Object.values(LINKED_LAYERS).flat());
    const on = Object.entries(current).filter(([k, v]) => v && !STYLE_LAYER_KEYS.includes(k) && !hidden.has(k)).map(([k]) => k).sort();
    if (on.join(',') === [...preset.layers].sort().join(',')) return preset.id;
  }
  return null;
}
