import { create } from 'zustand';

/**
 * Map timeline. `time` is null while live (following the clock); otherwise
 * the epoch ms every time-aware layer shows.
 */
interface TimelineState {
  time: number | null;
  playing: boolean;
  setTime: (time: number | null) => void;
  setPlaying: (playing: boolean) => void;
  goLive: () => void;
}

export const useTimeline = create<TimelineState>((set) => ({
  time: null,
  playing: false,
  setTime: (time) => set({ time }),
  setPlaying: (playing) => set({ playing }),
  goLive: () => set({ time: null, playing: false }),
}));
