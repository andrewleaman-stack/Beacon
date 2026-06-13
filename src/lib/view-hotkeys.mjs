export const CONTROLLED_FEED_LAYERS = Object.freeze([
  'flights',
  'private',
  'jets',
  'military',
  'maritime',
  'satellites',
  'cctv',
  'live_news',
  'news_intel',
  'earthquakes',
  'fires',
  'weather',
  'radiation',
  'infrastructure',
  'global_incidents',
  'war_alerts',
  'gps_jamming',
  'malware',
]);

export const HOTKEY_VIEW_PRESETS = Object.freeze([
  {
    id: 'all',
    label: 'ALL',
    shortLabel: 'ALL',
    shortcut: '1',
    description: 'All live intelligence feeds',
    layerKeys: CONTROLLED_FEED_LAYERS,
  },
  {
    id: 'airsea',
    label: 'AIR / SEA',
    shortLabel: 'A/S',
    shortcut: '2',
    description: 'Aviation, maritime, and orbital tracks',
    layerKeys: ['flights', 'private', 'jets', 'military', 'maritime', 'satellites'],
  },
  {
    id: 'hazards',
    label: 'HAZARDS',
    shortLabel: 'HAZ',
    shortcut: '3',
    description: 'Quakes, wildfire, weather, and radiation',
    layerKeys: ['earthquakes', 'fires', 'weather', 'radiation'],
  },
  {
    id: 'intel',
    label: 'INTEL',
    shortLabel: 'INT',
    shortcut: '4',
    description: 'News, incidents, war alerts, and cyber feeds',
    layerKeys: ['live_news', 'news_intel', 'global_incidents', 'war_alerts', 'gps_jamming', 'malware'],
  },
  {
    id: 'infra',
    label: 'INFRA',
    shortLabel: 'INF',
    shortcut: '5',
    description: 'Infrastructure, surveillance, and maritime context',
    layerKeys: ['infrastructure', 'cctv', 'maritime', 'global_incidents'],
  },
  {
    id: 'quiet',
    label: 'QUIET',
    shortLabel: 'Q',
    shortcut: '6',
    description: 'Minimal operating picture',
    layerKeys: ['maritime', 'cctv', 'earthquakes', 'global_incidents'],
  },
]);

export function getHotkeyPresetByShortcut(shortcut) {
  return HOTKEY_VIEW_PRESETS.find((preset) => preset.shortcut === shortcut);
}

export function getHotkeyPresetById(id) {
  return HOTKEY_VIEW_PRESETS.find((preset) => preset.id === id);
}

export function getActiveHotkeyPresetId(activeLayers) {
  for (const preset of HOTKEY_VIEW_PRESETS) {
    const presetKeys = new Set(preset.layerKeys);
    const matches = CONTROLLED_FEED_LAYERS.every((key) => Boolean(activeLayers[key]) === presetKeys.has(key));
    if (matches) return preset.id;
  }
  return null;
}

export function applyHotkeyViewPreset(activeLayers, presetId) {
  const preset = getHotkeyPresetById(presetId);
  if (!preset) return activeLayers;

  const enabledKeys = new Set(preset.layerKeys);
  const next = { ...activeLayers };
  for (const key of CONTROLLED_FEED_LAYERS) {
    next[key] = enabledKeys.has(key);
  }
  return next;
}
