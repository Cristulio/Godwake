import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { monsterAttack } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster as getDef } from '../../content/monsters';
import { chapterRamp } from '../delve/chapterRamp';
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

describe('chapter ramp through createCombat (Ascension 0)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('a Ch10 spawn carries the ramp on HP and damage', () => {
    const roller = createDiceRoller(7);
    const base = getDef('goblin').maxHp;
    const init = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      chapter: 10,
    });
    const inst = monstersOf(init.state, 'goblin')[0].instance;
    const expectedHp = Math.round(base * chapterRamp(10).hpMult);
    expect(inst.hp.max).toBe(expectedHp);
    expect(inst.hp.max).toBeGreaterThan(base);
    expect(inst.damageMult).toBeCloseTo(chapterRamp(10).damageMult, 5);
    expect(init.state.chapter).toBe(10);
  });

  it('a Ch1 spawn is untouched — no HP scaling, no damage mult, no chapter stamp', () => {
    const roller = createDiceRoller(7);
    const base = getDef('goblin').maxHp;
    const init = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      chapter: 1,
    });
    const inst = monstersOf(init.state, 'goblin')[0].instance;
    expect(inst.hp.max).toBe(base);
    expect(inst.damageMult).toBeUndefined();
    expect(init.state.chapter).toBeUndefined();
  });

  it('chapters 1-4 are all exactly neutral (the early grind never moves)', () => {
    const base = getDef('goblin').maxHp;
    for (const chapter of [1, 2, 3, 4]) {
      _resetMonsterInstanceCounter();
      const init = createCombat({
        roller: createDiceRoller(7),
        character: makeFighter(),
        monsters: [{ def: getDef('goblin') }],
        chapter,
      });
      const inst = monstersOf(init.state, 'goblin')[0].instance;
      expect(inst.hp.max).toBe(base);
      expect(inst.damageMult).toBeUndefined();
    }
  });

  it('ascension still stacks multiplicatively on top of the ramp', () => {
    const roller = createDiceRoller(7);
    const ch10 = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      chapter: 10,
    });
    _resetMonsterInstanceCounter();
    const ch10asc6 = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('goblin') }],
      chapter: 10,
      ascension: 6,
    });
    const hpRamp = monstersOf(ch10.state, 'goblin')[0].instance.hp.max;
    const hpRampAsc = monstersOf(ch10asc6.state, 'goblin')[0].instance.hp.max;
    expect(hpRampAsc).toBeGreaterThan(hpRamp);
    // Damage: Asc6 (1.3×) on top of the Ch10 ramp.
    const dmgRamp = monstersOf(ch10.state, 'goblin')[0].instance.damageMult ?? 1;
    const dmgRampAsc = monstersOf(ch10asc6.state, 'goblin')[0].instance.damageMult ?? 1;
    expect(dmgRampAsc).toBeGreaterThan(dmgRamp);
    expect(dmgRampAsc).toBeCloseTo(1.3 * chapterRamp(10).damageMult, 5);
  });

  it('a mid-fight summon inherits the chapter ramp (HP + damage), like the room monsters', () => {
    const roller = createDiceRoller(7);
    const base = getDef('goblin').maxHp;
    const init = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('duergar-taskmaster') }],
      chapter: 10,
    });
    const tid = monstersOf(init.state, 'duergar-taskmaster')[0].id;
    const r = monsterAttack({ roller, character: init.character, state: init.state }, tid);
    const summoned = monstersOf(r.state, 'goblin')[0].instance;
    expect(summoned.hp.max).toBe(Math.round(base * chapterRamp(10).hpMult));
    expect(summoned.hp.max).toBeGreaterThan(base);
    expect(summoned.damageMult).toBeCloseTo(chapterRamp(10).damageMult, 5);
  });

  it('a summon in an un-ramped chapter keeps the raw def stat block (parity)', () => {
    const roller = createDiceRoller(7);
    const base = getDef('goblin').maxHp;
    const init = createCombat({
      roller,
      character: makeFighter(),
      monsters: [{ def: getDef('duergar-taskmaster') }],
      chapter: 1,
    });
    const tid = monstersOf(init.state, 'duergar-taskmaster')[0].id;
    const r = monsterAttack({ roller, character: init.character, state: init.state }, tid);
    const summoned = monstersOf(r.state, 'goblin')[0].instance;
    expect(summoned.hp.max).toBe(base);
    expect(summoned.damageMult).toBeUndefined();
  });
});
