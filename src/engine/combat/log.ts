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

/**
 * Mark the roll/damage log lines a player action just produced as the hero's
 * own (`source: 'player'`), so CombatLog can render them dominant. Call once at
 * a player-action choke point (playerAttack, castSpell): pass `before`, the set
 * of log entries captured BEFORE the action ran — every roll/damage entry not in
 * it is one the action appended and thus the player's own beat. Identity-based
 * (entry objects are reused by reference across appendLog's array spreads and
 * the MAX_COMBAT_LOG clip), so it stays correct even when an overlong fight
 * clips older lines and shifts indices. System/narration lines are left alone;
 * already-sourced entries are untouched.
 */
export function markPlayerLog(
  state: CombatState,
  before: ReadonlySet<CombatLogEntry>,
): CombatState {
  let changed = false;
  const log = state.log.map((e) => {
    if (before.has(e) || e.source || (e.kind !== 'roll' && e.kind !== 'damage')) return e;
    changed = true;
    return { ...e, source: 'player' as const };
  });
  return changed ? { ...state, log } : state;
}
