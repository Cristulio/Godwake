import { describe, it, expect } from 'vitest';
import { createCharacter } from '../../engine/character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../../engine/combat/createCombat';
import { monsterAttack } from '../../engine/combat/attack';
import { applyDamage } from '../../engine/combat/attack/damage';
import {
  effectiveMonsterActions,
  refreshMonsterIntents,
} from '../../engine/combat/attack/monsterIntent';
import { createDiceRoller } from '../../engine/dice';
import type { DiceRoller } from '../../engine/dice';
import { getMonster } from './index';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

/**
 * boss-content (Ch7-9): proves each layered mechanic actually fires end-to-end
 * against the real boss defs — the framework primitives themselves are covered
 * by bossFramework.test.ts; this guards the per-boss WIRING (summon ids, gate
 * link, phase shift, multi-action) so a content typo can't ship silently.
 */

function fighter(hp = 400): Character {
  const base: Character = {
    ...createCharacter({
      id: 'f1',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
  };
  return { ...base, hp: { current: hp, max: hp, temp: 0 } };
}

function primary(state: CombatState): MonsterCombatant {
  return state.combatants.find((c): c is MonsterCombatant => c.kind === 'monster')!;
}
function setHp(state: CombatState, id: string, current: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.id === id
        ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current } } }
        : c,
    ),
  };
}
const at = (state: CombatState, round: number): CombatState => ({ ...state, round });
const liveDefs = (state: CombatState, defId: string) =>
  state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.defId === defId && c.instance.hp.current > 0,
  );

/**
 * One faithful monster turn at a given round: refresh intents against the
 * current state (what real combat does at the player's turn start) so the boss
 * re-plans against the patched HP/round, then resolve its turn.
 */
function turn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
  id: string,
  round: number,
): { state: CombatState; character: Character } {
  const planned = refreshMonsterIntents(at(state, round), character);
  return monsterAttack({ roller, character, state: planned }, id);
}

describe('Ch7 — Drowned Custodian', () => {
  it('raises a drowned-acolyte add (summon resolves to a registered def)', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(7);
    const def = getMonster('drowned-custodian');
    const init = createCombat({ character: fighter(), monsters: [{ def }] });
    const id = primary(init.state).id;
    // Round 2 (past the round-1 paralyze opener), full HP (sustain gated to ≤half).
    const r = turn(roller, init.state, init.character, id, 2);
    expect(liveDefs(r.state, 'drowned-acolyte').length).toBe(1);
  });

  it('drinks the deep back — self-sustain heals once bloodied', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(7);
    const def = getMonster('drowned-custodian');
    const init = createCombat({ character: fighter(), monsters: [{ def }] });
    const id = primary(init.state).id;
    const bloodied = setHp(init.state, id, 60); // < half of 210
    const r = turn(roller, bloodied, init.character, id, 2);
    expect(r.state.log.some((l) => /heals itself/i.test(l.text))).toBe(true);
    expect(primary(r.state).instance.hp.current).toBeGreaterThan(60);
  });

  it('carries a telegraphed Tidal Surge that restrains', () => {
    const surge = getMonster('drowned-custodian').actions.find((a) => a.name === 'Tidal Surge');
    expect(surge?.kind).toBe('debuff');
    expect(surge?.telegraph?.chargeText).toBeTruthy();
    expect(surge && surge.kind === 'debuff' && surge.condition).toBe('restrained');
  });
});

describe('Ch8 — Ashen Marshal', () => {
  it('winds up Marshalled Volley (telegraphed frighten)', () => {
    const volley = getMonster('ashen-marshal').actions.find((a) => a.name === 'Marshalled Volley');
    expect(volley?.kind).toBe('debuff');
    expect(volley?.telegraph?.chargeText).toBeTruthy();
    expect(volley && volley.kind === 'debuff' && volley.condition).toBe('frightened');
  });

  it('enters the enrage phase at half HP — transforms, drops guard, gains Cauterising Brand', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(7);
    const def = getMonster('ashen-marshal');
    const init = createCombat({ character: fighter(), monsters: [{ def }] });
    const id = primary(init.state).id;
    const acBefore = primary(init.state).instance.ac;
    const bloodied = setHp(init.state, id, 100); // < half of 264
    const r = turn(roller, bloodied, init.character, id, 3);
    const inst = primary(r.state).instance;
    expect(inst.phasesEntered).toEqual([0]);
    expect(inst.transformed).toBe(true);
    expect(inst.ac).toBe(acBefore - 2);
    expect(r.state.log.some((l) => /reignites/i.test(l.text))).toBe(true);
    expect(effectiveMonsterActions(def, inst).map((a) => a.name)).toContain('Cauterising Brand');
  });
});

describe('Ch9 — The Hollow Pretender', () => {
  it('acts twice a turn (endgame multi-action)', () => {
    expect(getMonster('the-hollow-pretender').actionsPerTurn).toBe(2);
  });

  it('is warded to two-fifths of incoming damage while a Mirror-Double decoy lives', () => {
    _resetMonsterInstanceCounter();
    const def = getMonster('the-hollow-pretender');
    const decoy = getMonster('mirror-double');
    const init = createCombat({ character: fighter(), monsters: [{ def }, { def: decoy }] });
    const id = primary(init.state).id;
    const before = primary(init.state).instance.hp.current;
    const warded = applyDamage(init.state, id, 100, init.character);
    expect(before - primary(warded.state).instance.hp.current).toBe(40); // 40% leak
    expect(warded.state.log.some((l) => /Warded|false faces/i.test(l.text))).toBe(true);
  });

  it('the gate link and the summon point at the same registered decoy def', () => {
    const def = getMonster('the-hollow-pretender');
    expect(def.gate?.whileAddAlive).toBe('mirror-double');
    const summon = def.actions.find((a) => a.name === 'The Court Attends');
    expect(summon && summon.kind === 'summon' && summon.summonDefId).toBe('mirror-double');
    expect(() => getMonster('mirror-double')).not.toThrow();
  });

  it('calls Mirror-Double decoys into the fight within the opening rounds', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(3);
    const def = getMonster('the-hollow-pretender');
    const init = createCombat({ character: fighter(), monsters: [{ def }] });
    const id = primary(init.state).id;
    let r = { state: init.state, character: init.character };
    for (let round = 1; round <= 4 && liveDefs(r.state, 'mirror-double').length === 0; round++) {
      r = turn(roller, r.state, r.character, id, round);
    }
    expect(liveDefs(r.state, 'mirror-double').length).toBeGreaterThan(0);
  });
});
