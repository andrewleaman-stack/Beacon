import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LayerKey } from '@/types/feeds';
import type { DashboardViewSettings, HomeLocation } from '@/lib/dashboard-settings.mjs';

// UI State Store
interface UIState {
  // Panels
  showLayerPanel: boolean;
  showCameraViewer: boolean;
  showOsintPanel: boolean;
  showEntityGraph: boolean;
  showAIBriefing: boolean;
  showKeyboardShortcuts: boolean;
  showViewPresets: boolean;
  showSharePanel: boolean;
  showSearchBar: boolean;
  showRightDrawer: boolean;
  showLowerDrawer: boolean;
  showGlobalStatusBar: boolean;
  showLiveAlerts: boolean;
  showViewControls: boolean;
  showMarkets: boolean;
  showAlerts: boolean;

  // Mobile
  isMobile: boolean;
  mobileDrawerOpen: boolean;
  mobileActiveTab: string | null;

  // Splash
  showSplash: boolean;

  // Actions
  toggleLayerPanel: () => void;
  toggleCameraViewer: () => void;
  toggleOsintPanel: () => void;
  toggleEntityGraph: () => void;
  toggleAIBriefing: () => void;
  toggleKeyboardShortcuts: () => void;
  toggleViewPresets: () => void;
  toggleSharePanel: () => void;
  toggleSearchBar: () => void;
  toggleViewControls: () => void;
  toggleMarkets: () => void;
  toggleAlerts: () => void;
  setShowRightDrawer: (show: boolean) => void;
  setShowLowerDrawer: (show: boolean) => void;
  setShowGlobalStatusBar: (show: boolean) => void;
  setShowLiveAlerts: (show: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  setMobileActiveTab: (tab: string | null) => void;
  setShowSplash: (show: boolean) => void;
  closeAllPanels: () => void;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    // Panels
    showLayerPanel: false,
    showCameraViewer: false,
    showOsintPanel: false,
    showEntityGraph: false,
    showAIBriefing: false,
    showKeyboardShortcuts: false,
    showViewPresets: false,
    showSharePanel: false,
    showSearchBar: false,
    showRightDrawer: false,
    showLowerDrawer: false,
    showGlobalStatusBar: true,
    showLiveAlerts: true,
    showViewControls: false,
    showMarkets: false,
    showAlerts: false,

    // Mobile
    isMobile: false,
    mobileDrawerOpen: false,
    mobileActiveTab: null,

    // Splash
    showSplash: true,

    // Actions
    toggleLayerPanel: () => set((s) => ({ showLayerPanel: !s.showLayerPanel })),
    toggleCameraViewer: () => set((s) => ({ showCameraViewer: !s.showCameraViewer })),
    toggleOsintPanel: () => set((s) => ({ showOsintPanel: !s.showOsintPanel })),
    toggleEntityGraph: () => set((s) => ({ showEntityGraph: !s.showEntityGraph })),
    toggleAIBriefing: () => set((s) => ({ showAIBriefing: !s.showAIBriefing })),
    toggleKeyboardShortcuts: () => set((s) => ({ showKeyboardShortcuts: !s.showKeyboardShortcuts })),
    toggleViewPresets: () => set((s) => ({ showViewPresets: !s.showViewPresets })),
    toggleSharePanel: () => set((s) => ({ showSharePanel: !s.showSharePanel })),
    toggleSearchBar: () => set((s) => ({ showSearchBar: !s.showSearchBar })),
    toggleViewControls: () => set((s) => ({ showViewControls: !s.showViewControls })),
    toggleMarkets: () => set((s) => ({ showMarkets: !s.showMarkets })),
    toggleAlerts: () => set((s) => ({ showAlerts: !s.showAlerts })),
    setShowRightDrawer: (show) => set({ showRightDrawer: show }),
    setShowLowerDrawer: (show) => set({ showLowerDrawer: show }),
    setShowGlobalStatusBar: (show) => set({ showGlobalStatusBar: show }),
    setShowLiveAlerts: (show) => set({ showLiveAlerts: show }),
    setIsMobile: (mobile) => set({ isMobile: mobile }),
    setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
    setMobileActiveTab: (tab) => set({ mobileActiveTab: tab }),
    setShowSplash: (show) => set({ showSplash: show }),
    closeAllPanels: () =>
      set({
        showLayerPanel: false,
        showCameraViewer: false,
        showOsintPanel: false,
        showEntityGraph: false,
        showAIBriefing: false,
        showKeyboardShortcuts: false,
        showViewPresets: false,
        showSharePanel: false,
        showSearchBar: false,
        showRightDrawer: false,
        showLowerDrawer: false,
        showViewControls: false,
        showMarkets: false,
        showAlerts: false,
        mobileDrawerOpen: false,
        mobileActiveTab: null,
      }),
  }))
);

// Map State Store
interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  projection: 'mercator' | 'globe';
  mapStyle: string;
  visualScale: number;
  flyToLocation: { lat: number; lng: number; zoom?: number; ts: number } | null;
}

interface MapState extends MapViewState {
  setMapView: (view: Partial<MapViewState>) => void;
  setFlyToLocation: (location: MapViewState['flyToLocation']) => void;
  resetMapView: () => void;
}

const DEFAULT_MAP_VIEW: MapViewState = {
  latitude: 20,
  longitude: 0,
  zoom: 2.5,
  projection: 'globe',
  mapStyle: 'dark',
  visualScale: 1,
  flyToLocation: null,
};

export const useMapStore = create<MapState>()(
  subscribeWithSelector((set) => ({
    ...DEFAULT_MAP_VIEW,
    setMapView: (view) => set((s) => ({ ...s, ...view })),
    setFlyToLocation: (location) => set({ flyToLocation: location }),
    resetMapView: () => set(DEFAULT_MAP_VIEW),
  }))
);

// Feed/Layers Store
interface LayerState {
  activeLayers: Record<LayerKey, boolean>;
  layerFetched: Set<string>;
  backendStatus: 'connected' | 'error' | 'connecting';
  dataVersion: number;

  toggleLayer: (key: LayerKey) => void;
  setLayer: (key: LayerKey, value: boolean) => void;
  setLayers: (layers: Record<LayerKey, boolean>) => void;
  markLayerFetched: (key: string) => void;
  isLayerFetched: (key: string) => boolean;
  clearLayerFetched: () => void;
  setBackendStatus: (status: LayerState['backendStatus']) => void;
  incrementDataVersion: () => void;
}

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
  infrastructure: false,
  global_incidents: true,
  war_alerts: false,
  gps_jamming: false,
  day_night: true,
  cables: true,
  sdk_sea: true,
  sdk_air: true,
  sdk_naval: true,
  malware: false,
} as const;

export const useLayerStore = create<LayerState>()(
  subscribeWithSelector((set, get) => ({
    activeLayers: initialLayers,
    layerFetched: new Set(),
    backendStatus: 'connecting',
    dataVersion: 0,

    toggleLayer: (key) =>
      set((s) => ({
        activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] },
      })),
    setLayer: (key, value) =>
      set((s) => ({
        activeLayers: { ...s.activeLayers, [key]: value },
      })),
    setLayers: (layers) => set({ activeLayers: layers }),
    markLayerFetched: (key) =>
      set((s) => {
        const next = new Set(s.layerFetched);
        next.add(key);
        return { layerFetched: next };
      }),
    isLayerFetched: (key) => get().layerFetched.has(key),
    clearLayerFetched: () => set({ layerFetched: new Set() }),
    setBackendStatus: (status) => set({ backendStatus: status }),
    incrementDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  }))
);

// Dashboard Settings Store
interface DashboardSettingsState {
  viewSettings: DashboardViewSettings;
  homeLocation: HomeLocation;
  setViewSettings: (settings: DashboardViewSettings) => void;
  setHomeLocation: (location: HomeLocation) => void;
  persistViewSettings: () => void;
  persistHomeLocation: () => void;
}

export const useDashboardSettingsStore = create<DashboardSettingsState>()(
  subscribeWithSelector((set, get) => ({
    viewSettings: {
      fontScale: 1,
      iconScale: 1,
      density: 'standard',
    },
    homeLocation: {
      label: 'Global Overview',
      lat: 20,
      lng: 0,
      zoom: 2.5,
    },
    setViewSettings: (settings) => set({ viewSettings: settings }),
    setHomeLocation: (location) => set({ homeLocation: location }),
    persistViewSettings: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('beacon.dashboard.viewSettings', JSON.stringify(get().viewSettings));
      }
    },
    persistHomeLocation: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('beacon.dashboard.homeLocation', JSON.stringify(get().homeLocation));
      }
    },
  }))
);