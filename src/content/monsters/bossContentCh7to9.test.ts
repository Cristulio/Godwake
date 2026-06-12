import { describe, it, expect } from 'vitest';
import { createCharacter } from '../../engine/character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from '../../engine/combat/createCombat';
import { monsterAttack } from '../../engine/combat/attack';
import { applyDamage } from '../../engine/combat/attack/damage';
import {
  effectiveMonsterActions,
  refreshMonsterIntents,
} from '../../engine/combat/attack/monsterIntent';
import {
  applyPlayerCondition,
  playerConditionMods,
} from '../../engine/combat/playerConditions';
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
  it("sounds The Marshal's Horn (telegraphed frighten) and acts twice a turn", () => {
    const def = getMonster('ashen-marshal');
    expect(def.actionsPerTurn).toBe(2);
    const horn = def.actions.find((a) => a.name === "The Marshal's Horn");
    expect(horn?.kind).toBe('debuff');
    expect(horn?.telegraph?.chargeText).toBeTruthy();
    expect(horn && horn.kind === 'debuff' && horn.condition).toBe('frightened');
  });

  it('resolves two actions in one turn — a frightened hero still eats the full drill twice', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(7);
    const def = getMonster('ashen-marshal');
    // Pre-frightened so the picker skips the horn (and round 2 skips the
    // opener): both slots fall through to the Old Campaign multiattack.
    const character = applyPlayerCondition(fighter(1000), { name: 'frightened', rounds: 99 });
    const init = createCombat({ character, monsters: [{ def }] });
    const id = primary(init.state).id;
    const drill = def.actions.find((a) => a.kind === 'multiattack');
    const swings = drill && drill.kind === 'multiattack' ? drill.attacks : 0;
    expect(swings).toBeGreaterThan(0);
    const before = init.state.attackEventCounter;
    const r = turn(roller, init.state, init.character, id, 2);
    expect(r.state.attackEventCounter - before).toBe(2 * swings);
  });

  it('the horn winds up one turn, then frightens through a failed WIS save (attack disadvantage)', () => {
    let landed = false;
    for (let seed = 1; seed <= 200 && !landed; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      const def = getMonster('ashen-marshal');
      const init = createCombat({ character: fighter(1000), monsters: [{ def }] });
      const id = primary(init.state).id;
      // Round 1: the opener, then the horn goes to his lips — a full charging
      // act, no blade. (On seeds where the hero saves the hold, the opener
      // re-fires in the second slot instead — skip those seeds.)
      const r1 = turn(roller, init.state, init.character, id, 1);
      if (primary(r1.state).instance.pendingTelegraph?.actionName !== "The Marshal's Horn") {
        continue;
      }
      // Round 2: the charged call resolves before anything else.
      const r2 = turn(roller, r1.state, r1.character, id, 2);
      if (r2.character.conditions.some((c) => c.name === 'frightened')) {
        landed = true;
        expect(playerConditionMods(r2.character).attackDisadvantage).toBe(true);
        expect(r2.state.log.some((l) => /gripped by fear/.test(l.text))).toBe(true);
      }
    }
    expect(landed).toBe(true);
  });

  it('a passed WIS save shrugs the horn — no fear takes hold, the resist is logged', () => {
    let resisted = false;
    for (let seed = 1; seed <= 300 && !resisted; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      const def = getMonster('ashen-marshal');
      const init = createCombat({ character: fighter(1000), monsters: [{ def }] });
      const id = primary(init.state).id;
      const r1 = turn(roller, init.state, init.character, id, 1);
      if (primary(r1.state).instance.pendingTelegraph?.actionName !== "The Marshal's Horn") {
        continue;
      }
      const r2 = turn(roller, r1.state, r1.character, id, 2);
      if (!r2.character.conditions.some((c) => c.name === 'frightened')) {
        resisted = true;
        expect(r2.state.log.some((l) => /resists The Marshal's Horn/.test(l.text))).toBe(true);
      }
    }
    expect(resisted).toBe(true);
  });

  it('enters the half-HP phase — transforms, drops guard, keeps the brand and the whole base kit', () => {
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
    // The phase re-lists the kit (replaceActions): every base action must
    // survive the boundary — a charged horn re-derives by name on resolve.
    const replaced = effectiveMonsterActions(def, inst).map((a) => a.name);
    expect(replaced).toContain('Cauterising Brand');
    expect(replaced).toContain('The Line Answers');
    for (const a of def.actions) expect(replaced).toContain(a.name);
  });

  it('past half he calls the line — ONE wave of two Slagbound Legionaries, never a second', () => {
    _resetMonsterInstanceCounter();
    const roller = createDiceRoller(7);
    const def = getMonster('ashen-marshal');
    // Pre-frightened so neither slot spends the turn charging the horn — the
    // call must land at the phase beat, not wait behind the signature.
    const character = applyPlayerCondition(fighter(1000), { name: 'frightened', rounds: 99 });
    const init = createCombat({ character, monsters: [{ def }] });
    const id = primary(init.state).id;
    const bloodied = setHp(init.state, id, 100);
    const r3 = turn(roller, bloodied, init.character, id, 3);
    expect(liveDefs(r3.state, 'slagbound-legionary').length).toBe(2);
    // Later bloodied turns never re-call the wave (once: true).
    let r = r3;
    for (let round = 4; round <= 6; round++) {
      r = turn(roller, r.state, r.character, id, round);
    }
    expect(liveDefs(r.state, 'slagbound-legionary').length).toBe(2);
  });

  it('the call points at the registered Slagbound Legionary def', () => {
    const def = getMonster('ashen-marshal');
    const call = def.phases?.[0]?.addActions?.find((a) => a.name === 'The Line Answers');
    expect(call?.kind).toBe('summon');
    expect(call && call.kind === 'summon' && call.summonDefId).toBe('slagbound-legionary');
    expect(call && call.kind === 'summon' && call.count).toBe(2);
    expect(call && call.kind === 'summon' && call.once).toBe(true);
    expect(() => getMonster('slagbound-legionary')).not.toThrow();
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
