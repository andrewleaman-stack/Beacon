import type { GlobeTour } from '@/components/BeaconMap';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ResolvedLayout, ThemeId, UiPrefs } from '@/lib/ui-prefs';
import type { TrackTarget } from '@/components/TrackPanel';

export type SpaceId = 'brief' | 'map' | 'watch' | 'investigate';

export interface MapViewState { zoom: number; latitude: number; longitude: number }

/** Everything the modern shell needs from the dashboard's existing state. */
export interface ShellProps {
  layout: ResolvedLayout;
  theme: ThemeId;
  prefs: UiPrefs;
  updatePrefs: (patch: Partial<UiPrefs>) => void;

  data: any;
  dataVersion: number;
  backendStatus: 'connecting' | 'connected' | 'error';
  spaceWeather: any;

  activeLayers: Record<string, boolean>;
  setActiveLayers: Dispatch<SetStateAction<any>>;
  mapView: MapViewState;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  mapProjection: 'globe' | 'mercator';
  setMapProjection: Dispatch<SetStateAction<'globe' | 'mercator'>>;
  mapStyle: 'dark' | 'satellite';
  setMapStyle: Dispatch<SetStateAction<'dark' | 'satellite'>>;

  /** The live BeaconMap element, rendered once and kept mounted. */
  map: ReactNode;
  /** Shared overlays: live feed player, camera viewer, entity graph, right drawer. */
  overlays: ReactNode;

  regionDossier: any;
  dossierLoading: boolean;
  closeDossier: () => void;
  openDossier: (lat: number, lng: number) => void;

  trackTarget: TrackTarget | null;
  setTrackTarget: (t: TrackTarget | null) => void;
  setMapTrack: (t: { trail: [number, number][]; head: [number, number] | null; follow: boolean } | null) => void;

  openCamera: (camera: any) => void;
  openLiveFeed: (url: string, name: string, embedAllowed?: boolean) => void;
  openEntityGraph: (target: { type: string; id: string; label?: string; properties?: Record<string, any> }) => void;
  setSweepData: (d: any) => void;
  addScanTarget: (target: string, d: any) => void;
  /** Rotating globe tour; null when off. */
  tour: GlobeTour | null;
  setTour: (t: GlobeTour | null | ((prev: GlobeTour | null) => GlobeTour | null)) => void;
  tourIndex: number;

  viewSettings: any;
  setViewSettings: Dispatch<SetStateAction<any>>;
  homeLocation: { label: string; lat: number; lng: number; zoom: number };
  setHomeLocation: Dispatch<SetStateAction<any>>;
  goHome: () => void;
}
