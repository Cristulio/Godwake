import { create } from 'zustand';
import type { CombatState } from '../types/combat';

/**
 * Active combat state. Session-only — never persisted (combat is mid-room
 * ephemera; on reload the player is dropped to the hub).
 */
interface CombatStoreState {
  combat: CombatState | null;
  setCombat: (combat: CombatState | null) => void;
}

export const useCombatStore = create<CombatStoreState>()((set) => ({
  combat: null,
  setCombat: (combat) => set({ combat }),
}));
