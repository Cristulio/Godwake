/**
 * Determinism + output pin for the shared `takeTurn` AI harness.
 *
 * `takeTurn` is imported by three balance sims (crossFeatureStressSim,
 * immortalHypothesisSim, sim-reincarnation-loop) and the encounter-stress
 * matrix. A silent behavior change here biases all of them at once, so this
 * pins its output for fixed seeds against a trivial encounter.
 *
 * These are seed-pinned snapshots, not balance targets: if combat math
 * legitimately changes (weapon dice, monster HP), re-baseline the literals.
 */
import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../../engine/dice';
import { createCombat } from '../../engine/combat/createCombat';
import { currentCombatantId } from '../../engine/combat';
import { getMonster } from '../../content/monsters';
import type { CombatState } from '../../types/combat';
import { characterAtLevel, takeTurn, liveMonsters } from './encounterStress';

function monsterHpTotal(state: CombatState): number {
  return state.combatants.reduce(
    (sum, c) => (c.kind === 'monster' ? sum + c.instance.hp.current : sum),
    0,
  );
}

/** Fresh fighter-L3-vs-one-goblin encounter, seeded. Player always acts first. */
function freshEncounter(seed: number) {
  const roller = createDiceRoller(seed);
  const character = characterAtLevel('fighter', 3);
  const goblin = getMonster('goblin');
  const created = createCombat({ roller, character, monsters: [{ def: goblin }] });
  return { roller, created };
}

describe('takeTurn harness', () => {
  it('is deterministic for a fixed seed', () => {
    const a = freshEncounter(12345);
    const ra = takeTurn(a.roller, a.created.state, a.created.character);

    const b = freshEncounter(12345);
    const rb = takeTurn(b.roller, b.created.state, b.created.character);

    expect(monsterHpTotal(ra.state)).toBe(monsterHpTotal(rb.state));
    expect(ra.character.actionEconomy.actionUsed).toBe(rb.character.actionEconomy.actionUsed);
    expect(ra.state.status).toBe(rb.state.status);
  });

  it('pins the fighter turn output for a hitting seed', () => {
    const { roller, created } = freshEncounter(12345);
    expect(currentCombatantId(created.state)).toBe('player');
    const startHp = monsterHpTotal(created.state);
    expect(startHp).toBe(7); // goblin

    const r = takeTurn(roller, created.state, created.character);
    const dmgDealt = startHp - monsterHpTotal(r.state);

    expect(r.character.actionEconomy.actionUsed).toBe(true);
    expect(dmgDealt).toBe(7);
    expect(liveMonsters(r.state).length).toBe(0);
    expect(r.state.status).toBe('player-victory');
  });

  it('pins the fighter turn output for a missing seed (action still consumed)', () => {
    const { roller, created } = freshEncounter(7);
    const startHp = monsterHpTotal(created.state);

    const r = takeTurn(roller, created.state, created.character);
    const dmgDealt = startHp - monsterHpTotal(r.state);

    expect(r.character.actionEconomy.actionUsed).toBe(true);
    expect(dmgDealt).toBe(0);
    expect(liveMonsters(r.state).length).toBe(1);
    expect(r.state.status).toBe('active');
  });
});
