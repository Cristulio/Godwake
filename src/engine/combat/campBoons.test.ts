import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';
import { computeAC } from '../character/derived';
import { spellSaveDC } from './spells/helpers';
import { rollPlayerSave } from './holdPerson';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'boon-tester',
      name: 'Boon-Bearer',
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
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
    ...extra,
  };
}

function makeWizard(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'boon-wizard',
      name: 'Spelltaker',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5],
        dex: STANDARD_ARRAY[2],
        con: STANDARD_ARRAY[3],
        int: STANDARD_ARRAY[0],
        wis: STANDARD_ARRAY[1],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    ...extra,
  };
}

describe('camp boons — derived modifiers', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Steel of the Brave adds +1 to computed AC', () => {
    const baseline = makeFighter();
    const buffed = makeFighter({ campBoons: ['steel-of-the-brave'] });
    expect(computeAC(buffed)).toBe(computeAC(baseline) + 1);
  });

  it('Eye of the Hawk adds +1 to weapon attack rolls', () => {
    const goblin = getMonster('goblin');
    const baseline = makeFighter();
    const buffed = makeFighter({ campBoons: ['eye-of-the-hawk'] });

    const rollerA = createDiceRoller(42);
    const rollerB = createDiceRoller(42);

    const stateA = createCombat({ roller: rollerA, character: baseline, monsters: [{ def: goblin }] }).state;
    const stateB = createCombat({ roller: rollerB, character: buffed, monsters: [{ def: goblin }] }).state;

    const targetA = (stateA.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
    const targetB = (stateB.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

    const afterA = playerAttack({ roller: rollerA, character: baseline, state: stateA }, targetA, 'longsword').state;
    const afterB = playerAttack({ roller: rollerB, character: buffed, state: stateB }, targetB, 'longsword').state;

    expect(afterB.lastAttack!.attackBonus - afterA.lastAttack!.attackBonus).toBe(1);
  });

  it('Stillness of the Mind adds +1 to WIS saves (and only WIS)', () => {
    const baseline = makeFighter();
    const buffed = makeFighter({ campBoons: ['stillness-of-the-mind'] });
    const seed = 7;

    const rA = createDiceRoller(seed);
    const rB = createDiceRoller(seed);
    const wisA = rollPlayerSave(rA, baseline, 'wis', 12);
    const wisB = rollPlayerSave(rB, buffed, 'wis', 12);
    // Same roll, +1 modifier → total differs by 1.
    expect(wisB.total - wisA.total).toBe(1);
    expect(wisB.mod - wisA.mod).toBe(1);

    const rC = createDiceRoller(seed);
    const rD = createDiceRoller(seed);
    const dexA = rollPlayerSave(rC, baseline, 'dex', 12);
    const dexB = rollPlayerSave(rD, buffed, 'dex', 12);
    expect(dexB.total).toBe(dexA.total);
  });

  it('Surge of the Storm raises spell DC by +1 (Wizard)', () => {
    const baseline = makeWizard();
    const buffed = makeWizard({ campBoons: ['surge-of-the-storm'] });
    expect(spellSaveDC(buffed) - spellSaveDC(baseline)).toBe(1);
  });

  it('Might of the Mountain adds +1 weapon damage on a hit', () => {
    // Use a sturdier monster (Ilyich, Ch1 boss) so a 1-shot kill can't mask
    // the +1 damage delta by flooring both monsters at 0 HP.
    const ilyich = getMonster('duergar-ilyich');
    const baseline = makeFighter();
    const buffed = makeFighter({ campBoons: ['might-of-the-mountain'] });

    let foundDelta: number | null = null;
    for (let seed = 1; seed < 200 && foundDelta === null; seed++) {
      _resetMonsterInstanceCounter();
      const rA = createDiceRoller(seed);
      _resetMonsterInstanceCounter();
      const rB = createDiceRoller(seed);

      const stateA = createCombat({ roller: rA, character: baseline, monsters: [{ def: ilyich }] }).state;
      const stateB = createCombat({ roller: rB, character: buffed, monsters: [{ def: ilyich }] }).state;

      const tA = (stateA.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
      const tB = (stateB.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

      const afterA = playerAttack({ roller: rA, character: baseline, state: stateA }, tA, 'longsword').state;
      const afterB = playerAttack({ roller: rB, character: buffed, state: stateB }, tB, 'longsword').state;

      if (afterA.lastAttack!.hit && afterB.lastAttack!.hit) {
        const hpA = (afterA.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).instance.hp.current;
        const hpB = (afterB.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).instance.hp.current;
        if (hpA > 0 && hpB > 0) {
          foundDelta = hpA - hpB;
        }
      }
    }
    expect(foundDelta).toBe(1);
  });

  it('Blade of the Vow seeds 3 per-combat rerolls; each damaging hit consumes one', () => {
    const goblin = getMonster('goblin');
    const buffed = makeFighter({ campBoons: ['blade-of-the-vow'] });
    const seed = 5;
    const roller = createDiceRoller(seed);
    _resetMonsterInstanceCounter();
    const initial = createCombat({ roller, character: buffed, monsters: [{ def: goblin }] });
    expect(initial.state.bladeOfVowRerollsRemaining).toBe(3);
    const target = (initial.state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

    // Drive attacks until three have hit — burning through all reroll charges.
    let state = initial.state;
    let char = initial.character;
    let hitsLanded = 0;
    for (let i = 0; i < 18 && hitsLanded < 3; i++) {
      const r = playerAttack({ roller, character: char, state }, target, 'longsword');
      state = r.state;
      char = r.character;
      if (r.state.lastAttack?.hit) hitsLanded += 1;
    }
    expect(state.bladeOfVowRerollsRemaining).toBe(0);
  });

  it('boons stack: AC and attack bonus both apply at the same time', () => {
    const goblin = getMonster('goblin');
    const baseline = makeFighter();
    const stacked = makeFighter({
      campBoons: ['steel-of-the-brave', 'eye-of-the-hawk'],
    });

    expect(computeAC(stacked) - computeAC(baseline)).toBe(1);

    const rA = createDiceRoller(13);
    const rB = createDiceRoller(13);
    _resetMonsterInstanceCounter();
    const stateA = createCombat({ roller: rA, character: baseline, monsters: [{ def: goblin }] }).state;
    _resetMonsterInstanceCounter();
    const stateB = createCombat({ roller: rB, character: stacked, monsters: [{ def: goblin }] }).state;
    const tA = (stateA.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
    const tB = (stateB.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

    const afterA = playerAttack({ roller: rA, character: baseline, state: stateA }, tA, 'longsword').state;
    const afterB = playerAttack({ roller: rB, character: stacked, state: stateB }, tB, 'longsword').state;
    expect(afterB.lastAttack!.attackBonus - afterA.lastAttack!.attackBonus).toBe(1);
  });
});
