import { create } from 'zustand';

export type Screen = 'title' | 'hub' | 'delve' | 'reincarnation';

interface GameState {
  screen: Screen;
  /** Seed string used by the current game/save. Determines dice. */
  saveSeed: string | null;

  goToTitle: () => void;
  goToHub: () => void;
  goToDelve: () => void;
  goToReincarnation: () => void;

  startNewGame: (seed: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  screen: 'title',
  saveSeed: null,

  goToTitle: () => set({ screen: 'title' }),
  goToHub: () => set({ screen: 'hub' }),
  goToDelve: () => set({ screen: 'delve' }),
  goToReincarnation: () => set({ screen: 'reincarnation' }),

  startNewGame: (seed) => set({ saveSeed: seed, screen: 'hub' }),
}));
