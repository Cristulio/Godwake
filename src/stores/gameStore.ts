import { create } from 'zustand';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState } from '../types/delve';
import { setActiveRoller } from '../engine/dice';
import { buildDefaultFighter } from '../engine/character/defaultCharacter';
import { longRest, withResetActionEconomy } from '../engine/character/actions';

export type Screen = 'title' | 'hub' | 'delve' | 'reincarnation';

interface GameState {
  screen: Screen;
  saveSeed: string | null;
  character: Character | null;
  delve: DelveState | null;
  combat: CombatState | null;
  /** Animation/turn-pacing multiplier. 1 = normal, 2 = fast forward. */
  speedMultiplier: 1 | 2;

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
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'title',
  saveSeed: null,
  character: null,
  delve: null,
  combat: null,
  speedMultiplier: 1,

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
      screen: 'hub',
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
}));
