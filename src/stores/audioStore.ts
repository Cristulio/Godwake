import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { audioEngine } from '../engine/audio';

interface AudioState {
  masterVolume: number; // 0..1
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;

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
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<AudioState>;
        // v3 turns music ON by default. Earlier versions persisted music at 0
        // (drone-only era); lift silenced saves to the new default so the new
        // chiptune tracks are audible, while respecting a user who nudged it.
        if (version < 3) {
          const lifted = !s.musicVolume ? 0.35 : s.musicVolume;
          return { ...s, musicVolume: lifted } as AudioState;
        }
        return s as AudioState;
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
  pushToEngine(useAudioStore.getState());
  audioEngine.attachAutoResume();
}
