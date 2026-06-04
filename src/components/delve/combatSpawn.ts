import type { RoomKind, DelvePhase } from '../../types/delve';

/**
 * The single decision for "should the spawn-on-enter effect build combat NOW?"
 * Pulled out of DelveScreen so the gating — including the dialogue HOLD — is a
 * pure, directly-testable predicate (mirrors combatIntroEligible for the coach).
 */
export interface CombatSpawnGate {
  phase: DelvePhase;
  /** A combat is already live for this room — never rebuild it. */
  hasCombat: boolean;
  roomKind: RoomKind;
  /** The room actually carries an encounter to spawn. */
  hasMonsters: boolean;
  /** Elite nodes wait on the player's risk/reward choice before the fight builds. */
  eliteEngaged: boolean;
  /**
   * A blocking dialogue (a progressive lore beat OR a soul-voice taunt) is on
   * screen. Hold the fight behind it: combat is not created — and so the
   * first-combat coach cannot render — until the dialogue is dismissed. This is
   * what keeps the soul-bond beat (and post-clear taunts) playing BEFORE the
   * next fight instead of stacking on top of combat + the coach.
   */
  dialogueActive: boolean;
}

/**
 * True only when a combat/boss/elite room is ready to fight AND no dialogue is
 * holding the transition. Any pending dialogue returns false, so the effect
 * waits; once the dialogue clears the caller re-runs this and the fight builds.
 */
export function combatShouldSpawn(g: CombatSpawnGate): boolean {
  if (g.phase !== 'in-room') return false;
  if (g.hasCombat) return false;
  if (g.roomKind !== 'combat' && g.roomKind !== 'boss' && g.roomKind !== 'elite') return false;
  if (!g.hasMonsters) return false;
  if (g.roomKind === 'elite' && !g.eliteEngaged) return false;
  if (g.dialogueActive) return false;
  return true;
}
