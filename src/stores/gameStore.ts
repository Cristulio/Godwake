import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState } from '../types/delve';
import { setActiveRoller } from '../engine/dice';
import { buildDefaultFighter } from '../engine/character/defaultCharacter';
import { longRest, withResetActionEconomy } from '../engine/character/actions';
import type { TauntContext } from '../components/lore/IrenicusTaunt';

export type Screen = 'title' | 'intro' | 'hub' | 'delve' | 'reincarnation' | 'codex';

interface GameState {
  screen: Screen;
  saveSeed: string | null;
  character: Character | null;
  delve: DelveState | null;
  combat: CombatState | null;
  /** Animation/turn-pacing multiplier. 1 = normal, 2 = fast forward. */
  speedMultiplier: 1 | 2;
  /** Active Irenicus taunt context, or null if no overlay. */
  taunt: { context: TauntContext; seed: number } | null;
  /** True if the player has seen the intro already this save. */
  introSeen: boolean;
  /** Monster def ids the player has fought at least once. Powers the codex. */
  discoveredMonsters: string[];

  // Navigation
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;

  // Lifecycle
  startNewGame: (seed: string) => void;

  // Character + combat
  setCharacter: (character: Character) => void;
  setCombat: (combat: CombatState | null) => void;

  // Delve flow
  startDelve: (delve: DelveState) => void;
  advanceRoom: () => void;
  addDelveReward: (gold: number, xp: number) => void;
  finishDelve: () => void;
  failDelve: () => void;
  /** Player gives up mid-delve: HP restored, rewards dropped, no XP/gold gain. */
  abandonDelve: () => void;

  // Settings
  setSpeed: (s: 1 | 2) => void;

  // Lore overlays
  showTaunt: (context: TauntContext) => void;
  dismissTaunt: () => void;
  markIntroSeen: () => void;

  // Codex
  discoverMonster: (defId: string) => void;
  goToCodex: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  screen: 'title',
  saveSeed: null,
  character: null,
  delve: null,
  combat: null,
  speedMultiplier: 1,
  taunt: null,
  introSeen: false,
  discoveredMonsters: [],

  goToTitle: () => set({ screen: 'title' }),
  goToHub: () => set({ screen: 'hub' }),
  goToDelve: () => set({ screen: 'delve' }),
  goToReincarnation: () => set({ screen: 'reincarnation' }),

  startNewGame: (seed) => {
    setActiveRoller(seed);
    const character = buildDefaultFighter();
    set({
      saveSeed: seed,
      character,
      combat: null,
      delve: null,
      taunt: null,
      introSeen: false,
      screen: 'intro',
    });
  },

  setCharacter: (character) => set({ character }),
  setCombat: (combat) => set({ combat }),

  startDelve: (delve) => {
    const ch = get().character;
    if (!ch) return;
    set({
      delve,
      combat: null,
      // Make sure action economy is fresh entering a delve.
      character: withResetActionEconomy(ch),
      screen: 'delve',
    });
  },

  advanceRoom: () =>
    set((s) => {
      if (!s.delve) return s;
      const wasLast = s.delve.currentRoomIdx >= s.delve.rooms.length - 1;
      return {
        delve: {
          ...s.delve,
          currentRoomIdx: wasLast ? s.delve.currentRoomIdx : s.delve.currentRoomIdx + 1,
          phase: wasLast ? 'completed' : 'in-room',
          roomsCleared: s.delve.roomsCleared + 1,
        },
        combat: null,
      };
    }),

  addDelveReward: (gold, xp) =>
    set((s) => {
      if (!s.delve) return s;
      return {
        delve: {
          ...s.delve,
          goldEarned: s.delve.goldEarned + gold,
          xpEarned: s.delve.xpEarned + xp,
        },
      };
    }),

  finishDelve: () =>
    set((s) => {
      if (!s.character || !s.delve) return s;
      const earnedGold = s.delve.goldEarned;
      const earnedXp = s.delve.xpEarned;
      const rested = longRest({
        ...s.character,
        goldInPocket: s.character.goldInPocket + earnedGold,
        xp: s.character.xp + earnedXp,
      });
      return {
        character: rested,
        delve: null,
        combat: null,
        screen: 'hub',
      };
    }),

  failDelve: () =>
    set((s) => {
      if (!s.delve) return s;
      return {
        delve: { ...s.delve, phase: 'failed' },
      };
    }),

  abandonDelve: () =>
    set((s) => {
      if (!s.character) return s;
      return {
        // Restore HP and rest, but drop all delve rewards.
        character: longRest(s.character),
        delve: null,
        combat: null,
        screen: 'hub',
      };
    }),

  setSpeed: (s) => set({ speedMultiplier: s }),

  showTaunt: (context) =>
    set({ taunt: { context, seed: Math.floor(Math.random() * 1000) } }),
  dismissTaunt: () => set({ taunt: null }),
  markIntroSeen: () => set({ introSeen: true, screen: 'hub' }),

  discoverMonster: (defId) =>
    set((s) =>
      s.discoveredMonsters.includes(defId)
        ? s
        : { discoveredMonsters: [...s.discoveredMonsters, defId] },
    ),
  goToCodex: () => set({ screen: 'codex' }),
    }),
    {
      name: 'godwake-save',
      storage: createJSONStorage(() => localStorage),
      // Only persist long-term state; delve/combat are session-scoped.
      partialize: (state) => ({
        screen: state.screen === 'delve' ? 'hub' : state.screen,
        saveSeed: state.saveSeed,
        character: state.character,
        speedMultiplier: state.speedMultiplier,
        introSeen: state.introSeen,
        discoveredMonsters: state.discoveredMonsters,
      }),
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Re-arm the dice roller from the persisted save seed on load.
        if (state?.saveSeed) {
          setActiveRoller(state.saveSeed);
        }
      },
    },
  ),
);
