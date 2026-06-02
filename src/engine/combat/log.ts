import type { CombatLogEntry, CombatState } from '../../types/combat';

/**
 * Max entries retained in CombatState.log. The renderer (CombatLog.tsx) tails
 * the last 80 for display; this cap protects engine memory and the persisted
 * save blob during long fights where hundreds of entries could accumulate.
 * Lives in this dependency-free leaf module so consumers can pull it without
 * dragging in createCombat's heavy import graph.
 */
export const MAX_COMBAT_LOG = 200;

export function appendLog(state: CombatState, ...entries: CombatLogEntry[]): CombatState {
  const merged = entries.length === 1
    ? [...state.log, entries[0]]
    : [...state.log, ...entries];
  return {
    ...state,
    log: merged.length > MAX_COMBAT_LOG ? merged.slice(-MAX_COMBAT_LOG) : merged,
  };
}
