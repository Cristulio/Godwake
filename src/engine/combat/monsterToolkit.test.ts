import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack, playerAttack, refreshMonsterIntents } from './attack';
import { endTurn } from './turn';
import { createDiceRoller } from '../dice';
import {
  applyPlayerCondition,
  playerConditionMods,
  tickPlayerConditions,
} from './playerConditions';
import { getMonster as getDef } from '../../content/monsters';
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';

function makeFighter(): Character {
  return {
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
}

function monstersOf(state: CombatState, defId: string): MonsterCombatant[] {
  return state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.defId === defId,
  );
}

function patchInstanceHp(state: CombatState, defId: string, current: number): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.instance.defId === defId
        ? { ...c, instance: { ...c.instance, hp: { ...c.instance.hp, current } } }
        : c,
    ),
  };
}

describe('playerConditions', () => {
  it('poisoned and frightened impose attack disadvantage', () => {
    const base = makeFighter();
    expect(playerConditionMods(applyPlayerCondition(base, { name: 'poisoned', rounds: 2 })).attackDisadvantage).toBe(true);
    expect(playerConditionMods(applyPlayerCondition(base, { name: 'frightened', rounds: 2 })).attackDisadvantage).toBe(true);
  });

  it('blinded and restrained grant attackers advantage', () => {
    const base = makeFighter();
    const blinded = playerConditionMods(applyPlayerCondition(base, { name: 'blinded', rounds: 2 }));
    expect(blinded.attackDisadvantage).toBe(true);
    expect(blinded.grantsAttackerAdvantage).toBe(true);
    const restrained = playerConditionMods(applyPlayerCondition(base, { name: 'restrained', rounds: 2 }));
    expect(restrained.grantsAttackerAdvantage).toBe(true);
  });

  it('weakened reduces outgoing damage by its stored level', () => {
    const base = makeFighter();
    const c = applyPlayerCondition(base, { name: 'weakened', rounds: 3, level: 4 });
    expect(playerConditionMods(c).outgoingDamagePenalty).toBe(4);
  });

  it('ticks down and expires rounds-based conditions, skipping paralyzed', () => {
    let c = applyPlayerCondition(makeFighter(), { name: 'poisoned', rounds: 2 });
    c = applyPlayerCondition(c, { name: 'paralyzed', rounds: 2 });
    const t1 = tickPlayerConditions(c);
    expect(t1.expired).toEqual([]);
    expect(t1.character.conditions.find((x) => x.name === 'poisoned')?.duration).toEqual({ kind: 'rounds', value: 1 });
    // paralyzed untouched by the generic ticker
    expect(t1.character.conditions.find((x) => x.name === 'paralyzed')?.duration).toEqual({ kind: 'rounds', value: 2 });
    const t2 = tickPlayerConditions(t1.character);
    expect(t2.expired).toContain('poisoned');
    expect(t2.character.conditions.some((x) => x.name === 'poisoned')).toBe(false);
  });
});

describe('monster debuff action', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('applies its condition to the player on a failed save (Plaguebound Cur → poisoned)', () => {
    // Find a seed where the CON save fails so the poison lands.
    let landed = false;
    for (let seed = 1; seed <= 200 && !landed; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      const init = createCombat({ roller, character: makeFighter(), monsters: [{ def: getDef('plaguebound-cur') }] });
      const curId = monstersOf(init.state, 'plaguebound-cur')[0].id;
      const r = monsterAttack({ roller, character: init.character, state: init.state }, curId);
      if (r.character.conditions.some((c) => c.name === 'poisoned')) {
        landed = true;
        expect(r.state.log.some((l) => /wracked with poison/.test(l.text))).toBe(true);
        expect(playerConditionMods(r.character).attackDisadvantage).toBe(true);
      }
    }
    expect(landed).toBe(true);
  });

  it('poisoned actually makes the player roll attacks at disadvantage', () => {
    // Same seed: a clean roll hits the goblin (AC 15) but the low half of a
    // disadvantage pair misses — proving the disadvantage is wired through.
    let proven = false;
    for (let seed = 1; seed <= 500 && !proven; seed++) {
      _resetMonsterInstanceCounter();
      const rollerA = createDiceRoller(seed);
      const cleanInit = createCombat({ roller: rollerA, character: makeFighter(), monsters: [{ def: getDef('goblin') }] });
      const gidA = monstersOf(cleanInit.state, 'goblin')[0].id;
      const clean = playerAttack({ roller: rollerA, character: cleanInit.character, state: cleanInit.state }, gidA, 'longsword');
      const cleanHit = clean.state.lastAttack?.hit === true;

      _resetMonsterInstanceCounter();
      const rollerB = createDiceRoller(seed);
      const poisonedChar = applyPlayerCondition(makeFighter(), { name: 'poisoned', rounds: 2 });
      const poisonInit = createCombat({ roller: rollerB, character: poisonedChar, monsters: [{ def: getDef('goblin') }] });
      const gidB = monstersOf(poisonInit.state, 'goblin')[0].id;
      const poisoned = playerAttack({ roller: rollerB, character: poisonInit.character, state: poisonInit.state }, gidB, 'longsword');
      const poisonedHit = poisoned.state.lastAttack?.hit === true;

      if (cleanHit && !poisonedHit) proven = true;
    }
    expect(proven).toBe(true);
  });

  it('weakened subtracts flat damage from a landed weapon hit', () => {
    let checked = false;
    for (let seed = 1; seed <= 200 && !checked; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      const weak = applyPlayerCondition(makeFighter(), { name: 'weakened', rounds: 3, level: 3 });
      const init = createCombat({ roller, character: weak, monsters: [{ def: getDef('goblin') }] });
      const gid = monstersOf(init.state, 'goblin')[0].id;
      const r = playerAttack({ roller, character: weak, state: init.state }, gid, 'longsword');
      if (r.state.lastAttack?.hit) {
        checked = true;
        expect(r.state.log.some((l) => /- 3 weakened/.test(l.text))).toBe(true);
      }
    }
    expect(checked).toBe(true);
  });
});

describe('monster summon action', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Duergar Taskmaster spawns a goblin into the encounter', () => {
    const roller = createDiceRoller(7);
    const init = createCombat({ roller, character: makeFighter(), monsters: [{ def: getDef('duergar-taskmaster') }] });
    const tid = monstersOf(init.state, 'duergar-taskmaster')[0].id;
    const before = init.state.combatants.length;
    const r = monsterAttack({ roller, character: init.character, state: init.state }, tid);
    expect(r.state.combatants.length).toBe(before + 1);
    expect(monstersOf(r.state, 'goblin').length).toBe(1);
    expect(r.state.turnOrder.length).toBe(init.state.turnOrder.length + 1);
    expect(r.state.log.some((l) => /calls a Goblin/.test(l.text))).toBe(true);
  });

  it('respects maxActive — will not exceed the brood cap', () => {
    const roller = createDiceRoller(3);
    // Spider Broodmother: count 2, maxActive 4. Two casts → 4 driderlings, a
    // third cast (cooldown forced clear) adds none.
    let s = createCombat({ roller, character: makeFighter(), monsters: [{ def: getDef('spider-broodmother') }] }).state;
    let ch = makeFighter();
    const bid = monstersOf(s, 'spider-broodmother')[0].id;
    const r1 = monsterAttack({ roller, character: ch, state: s }, bid);
    s = r1.state; ch = r1.character;
    expect(monstersOf(s, 'driderling').length).toBe(2);
    // Clear the cooldown so the picker is allowed to summon again immediately,
    // then re-plan the intent (start-of-player-turn refresh) so the next turn
    // resolves a summon rather than the post-summon attack it re-picked.
    s = {
      ...s,
      combatants: s.combatants.map((c) =>
        c.id === bid && c.kind === 'monster'
          ? { ...c, instance: { ...c.instance, actionState: undefined } }
          : c,
      ),
    };
    s = refreshMonsterIntents(s, ch);
    const r2 = monsterAttack({ roller, character: ch, state: s }, bid);
    s = r2.state;
    expect(monstersOf(s, 'driderling').length).toBe(4);
    // Cap reached: another summon attempt adds nothing.
    s = {
      ...s,
      combatants: s.combatants.map((c) =>
        c.id === bid && c.kind === 'monster'
          ? { ...c, instance: { ...c.instance, actionState: undefined } }
          : c,
      ),
    };
    s = refreshMonsterIntents(s, ch);
    const r3 = monsterAttack({ roller, character: ch, state: s }, bid);
    expect(monstersOf(r3.state, 'driderling').length).toBe(4);
  });
});

describe('monster multiattack action', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Famished Ghast resolves two attacks in one turn', () => {
    const roller = createDiceRoller(11);
    const init = createCombat({ roller, character: makeFighter(), monsters: [{ def: getDef('famished-ghast') }] });
    const gid = monstersOf(init.state, 'famished-ghast')[0].id;
    const before = init.state.attackEventCounter;
    const r = monsterAttack({ roller, character: init.character, state: init.state }, gid);
    expect(r.state.attackEventCounter - before).toBe(2);
    const swings = r.state.log.filter((l) => /with Ravening Claws/.test(l.text)).length;
    expect(swings).toBe(2);
  });
});

describe('monster sustain action', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Reknitting Horror heals itself when bloodied', () => {
    const roller = createDiceRoller(5);
    let s = createCombat({ roller, character: makeFighter(), monsters: [{ def: getDef('sphere-aberration') }] }).state;
    s = patchInstanceHp(s, 'sphere-aberration', 10); // max 45 → bloodied
    // Pick-then-resolve: re-plan the intent against the now-bloodied state, as
    // the start-of-player-turn refresh would, so the heal is telegraphed.
    s = refreshMonsterIntents(s, makeFighter());
    const id = monstersOf(s, 'sphere-aberration')[0].id;
    const r = monsterAttack({ roller, character: makeFighter(), state: s }, id);
    const healed = monstersOf(r.state, 'sphere-aberration')[0].instance.hp.current;
    expect(healed).toBeGreaterThan(10);
    expect(r.state.log.some((l) => /Reknit/.test(l.text))).toBe(true);
  });

  it('Cowled Wardpriest wards an ally with temp HP', () => {
    const roller = createDiceRoller(9);
    const init = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('cowled-wardpriest') }, { def: getDef('goblin') }],
    });
    const pid = monstersOf(init.state, 'cowled-wardpriest')[0].id;
    const r = monsterAttack({ roller, character: init.character, state: init.state }, pid);
    const goblin = monstersOf(r.state, 'goblin')[0];
    expect(goblin.instance.hp.temp).toBe(10);
    expect(r.state.log.some((l) => /shields .* with 10 temp HP/.test(l.text))).toBe(true);
  });
});

describe('attack life-drain', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Mind Leech heals itself for half the damage it deals', () => {
    let healed = false;
    for (let seed = 1; seed <= 200 && !healed; seed++) {
      _resetMonsterInstanceCounter();
      const roller = createDiceRoller(seed);
      let s = createCombat({ roller, character: makeFighter(), monsters: [{ def: getDef('mind-leech') }] }).state;
      s = patchInstanceHp(s, 'mind-leech', 5); // max 30
      const id = monstersOf(s, 'mind-leech')[0].id;
      const r = monsterAttack({ roller, character: makeFighter(), state: s }, id);
      const hp = monstersOf(r.state, 'mind-leech')[0].instance.hp.current;
      if (r.state.lastAttack?.hit && hp > 5) {
        healed = true;
        expect(r.state.log.some((l) => /drains \d+ HP/.test(l.text))).toBe(true);
      }
    }
    expect(healed).toBe(true);
  });
});

describe('player-condition tick through endTurn', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('expires a 1-round debuff when the player turn comes back around', () => {
    const roller = createDiceRoller(1);
    const poisoned = applyPlayerCondition(makeFighter(), { name: 'poisoned', rounds: 1 });
    const init = createCombat({ roller, character: poisoned, monsters: [{ def: getDef('goblin') }] });
    // player(0) → monster(1) → player(0, round 2): the second endTurn ticks.
    const t1 = endTurn(init.state, init.character);
    const t2 = endTurn(t1.state, t1.character);
    expect(t2.character.conditions.some((c) => c.name === 'poisoned')).toBe(false);
    expect(t2.state.log.some((l) => /shakes off the poison/.test(l.text))).toBe(true);
  });
});
