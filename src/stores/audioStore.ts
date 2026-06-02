import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { audioEngine } from '../engine/audio';

interface AudioState {
  masterVolume: number; // 0..1
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  // One-time guard: the default-on music lift fires at most once (see initAudio).
  musicInitialized: boolean;

  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  toggleMuted: () => void;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function pushToEngine(state: AudioState) {
  audioEngine.setVolumes({
    master: state.masterVolume,
    sfx: state.sfxVolume,
    music: state.musicVolume,
    muted: state.muted,
  });
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      masterVolume: 0.7,
      sfxVolume: 1.0,
      musicVolume: 0.35,
      muted: false,
      musicInitialized: false,

      setMasterVolume: (v) => {
        set({ masterVolume: clamp01(v) });
        pushToEngine(get());
      },
      setSfxVolume: (v) => {
        set({ sfxVolume: clamp01(v) });
        pushToEngine(get());
      },
      setMusicVolume: (v) => {
        set({ musicVolume: clamp01(v) });
        pushToEngine(get());
      },
      setMuted: (m) => {
        set({ muted: m });
        pushToEngine(get());
      },
      toggleMuted: () => {
        set({ muted: !get().muted });
        pushToEngine(get());
      },
    }),
    {
      name: 'godwake-audio',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persistedState) => {
        // The default-on music lift is owned by initAudio's musicInitialized
        // guard, not a version branch. Pass persisted state through; persist's
        // merge fills musicInitialized: false for pre-flag saves.
        return (persistedState ?? {}) as AudioState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) pushToEngine(state);
      },
    },
  ),
);

/**
 * Initialize the audio system at app boot:
 * sync persisted volumes into the engine, and wire the autoplay-gate listener.
 */
export function initAudio() {
  const state = useAudioStore.getState();
  if (!state.musicInitialized) {
    // One-time default-on: pre-music saves persisted musicVolume at 0 (drone
    // era). Lift a silenced save to the chiptune default exactly once; from now
    // on musicInitialized is true, so an intentional mute via Settings sticks.
    useAudioStore.setState({
      musicVolume: state.musicVolume || 0.35,
      musicInitialized: true,
    });
  }
  pushToEngine(useAudioStore.getState());
  audioEngine.attachAutoResume();
}
