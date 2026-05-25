import { create } from 'zustand';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import { setActiveRoller } from '../engine/dice';
import { buildDefaultFighter } from '../engine/character/defaultCharacter';

export type Screen = 'title' | 'hub' | 'delve' | 'reincarnation';

interface GameState {
  screen: Screen;
  /** Seed for the current save. Determines dice. */
  saveSeed: string | null;
  /** Active player character. */
  character: Character | null;
  /** Active combat encounter, if any. */
  combat: CombatState | null;

  // Navigation
  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;

  // Lifecycle
  startNewGame: (seed: string) => void;

  // Combat
  setCombat: (combat: CombatState | null) => void;
  setCharacter: (character: Character) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'title',
  saveSeed: null,
  character: null,
  combat: null,

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
      screen: 'hub',
    });
  },

  setCombat: (combat) => set({ combat }),
  setCharacter: (character) => set({ character }),
}));
