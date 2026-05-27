import { describe, it, expect } from 'vitest';
import { useActionSurge } from './actionSurge';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { applyLevelUp } from '../character/leveling';
import type { CombatState } from '../../types/combat';

function mkChar() {
  return createCharacter({
    id: 'test',
    name: 'Surger',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['athletics', 'perception'],
  });
}

function mkState(): CombatState {
  return {
    combatants: [],
    initiativeOrder: [],
    currentTurnIndex: 0,
    round: 1,
    log: [],
    status: 'active',
    attackEventCounter: 0,
    playerHasAttacked: false,
    rerollMissesEncounterRemaining: 0,
    playerAttacksThisTurn: 1,
  };
}

describe('useActionSurge', () => {
  it('does nothing at L1 (no charges)', () => {
    const c = mkChar();
    c.actionEconomy.actionUsed = true;
    const s = mkState();
    const next = useActionSurge({ character: c, state: s }).state;
    expect(next).toBe(s);
    expect(c.actionEconomy.actionUsed).toBe(true);
  });

  it('does nothing if action is not yet spent', () => {
    const c = applyLevelUp({ ...mkChar(), xp: 300 });
    expect(c.resources.actionSurgeRemaining).toBe(1);
    const s = mkState();
    const next = useActionSurge({ character: c, state: s }).state;
    expect(next).toBe(s);
    expect(c.resources.actionSurgeRemaining).toBe(1);
  });

  it('clears actionUsed, decrements remaining, resets attacks-this-turn', () => {
    let c = applyLevelUp({ ...mkChar(), xp: 300 });
    c = { ...c, actionEconomy: { ...c.actionEconomy, actionUsed: true } };
    const s = mkState();
    const result = useActionSurge({ character: c, state: s });
    c = result.character;
    expect(c.actionEconomy.actionUsed).toBe(false);
    expect(c.resources.actionSurgeRemaining).toBe(0);
    expect(result.state.playerAttacksThisTurn).toBe(0);
    expect(result.state.log.length).toBe(1);
  });
});
