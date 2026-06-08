import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Locale } from '../i18n';

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
  /** Display language for the whole game. */
  locale: Locale;
  /** True once the player has cleared the first-run welcome (language + alpha notice). */
  firstRunSeen: boolean;

  setSpeed: (s: 1 | 2) => void;
  setAutoEndTurnDelay: (ms: number) => void;
  setAutoBattle: (on: boolean) => void;
  setLocale: (l: Locale) => void;
  markFirstRunSeen: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      speedMultiplier: 1,
      autoEndTurnDelayMs: 1100,
      autoBattle: false,
      locale: 'en',
      firstRunSeen: false,
      setSpeed: (s) => set({ speedMultiplier: s }),
      setAutoEndTurnDelay: (ms) =>
        set({ autoEndTurnDelayMs: Math.max(200, Math.min(3000, Math.round(ms))) }),
      setAutoBattle: (on) => set({ autoBattle: on }),
      setLocale: (l) => set({ locale: l }),
      markFirstRunSeen: () => set({ firstRunSeen: true }),
    }),
    {
      name: 'godwake-settings',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // v1→v2 only ADDS `locale`; keep every prior field, let locale fall to its
      // default so existing players don't lose their pacing prefs.
      migrate: (persisted) => persisted as Partial<SettingsState>,
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
