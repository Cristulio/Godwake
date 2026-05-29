import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Gameplay settings, split out of the god gameStore so they:
 *  - persist independently of save slots (a player should keep their turn-
 *    timing preferences when they switch slots or wipe a save)
 *  - don't re-render every consumer when unrelated gameStore fields change
 *
 * Audio + UI overlay settings are NOT here — audio has its own store in
 * `audioStore.ts`, and UI overlays (taunt, etc.) belong to the run/UI
 * domain in gameStore until that's split too.
 */
interface SettingsState {
  /** Animation/turn-pacing multiplier. 1 = normal, 2 = fast forward. */
  speedMultiplier: 1 | 2;
  /** Delay (ms, pre-speed-multiplier) before auto-ending a turn with no actions remaining. */
  autoEndTurnDelayMs: number;
  /** When true, the player's combat turns are played automatically by the shared action policy. */
  autoBattle: boolean;

  setSpeed: (s: 1 | 2) => void;
  setAutoEndTurnDelay: (ms: number) => void;
  setAutoBattle: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      speedMultiplier: 1,
      autoEndTurnDelayMs: 1100,
      autoBattle: false,
      setSpeed: (s) => set({ speedMultiplier: s }),
      setAutoEndTurnDelay: (ms) =>
        set({ autoEndTurnDelayMs: Math.max(200, Math.min(3000, Math.round(ms))) }),
      setAutoBattle: (on) => set({ autoBattle: on }),
    }),
    {
      name: 'godwake-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Migrate from the legacy slot-0 key — older saves still carry these
      // fields. Read once on first load; thereafter this store is canonical.
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        // If a player had settings in slot 0 (pre-split), pull them in.
        try {
          const legacy = localStorage.getItem('godwake-save-slot-0');
          if (!legacy) return;
          const wrapper = JSON.parse(legacy);
          const inner = wrapper?.state;
          if (!inner) return;
          // Only migrate values that are still at their pristine defaults
          // here; if the user has already touched the new store, respect it.
          if (state.speedMultiplier === 1 && typeof inner.speedMultiplier === 'number') {
            state.speedMultiplier = inner.speedMultiplier === 2 ? 2 : 1;
          }
          if (state.autoEndTurnDelayMs === 1100 && typeof inner.autoEndTurnDelayMs === 'number') {
            state.autoEndTurnDelayMs = Math.max(200, Math.min(3000, inner.autoEndTurnDelayMs));
          }
        } catch {
          /* legacy parse failure is non-fatal */
        }
      },
    },
  ),
);
