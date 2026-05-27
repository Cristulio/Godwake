import { MAX_COMBAT_LOG } from './createCombat';
import type { CombatLogEntry, CombatState } from '../../types/combat';

export function appendLog(state: CombatState, ...entries: CombatLogEntry[]): CombatState {
  const merged = entries.length === 1
    ? [...state.log, entries[0]]
    : [...state.log, ...entries];
  return {
    ...state,
    log: merged.length > MAX_COMBAT_LOG ? merged.slice(-MAX_COMBAT_LOG) : merged,
  };
}
