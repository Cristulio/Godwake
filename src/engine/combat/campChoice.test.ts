import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'sharpen-tester',
      name: 'Whetstone',
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

describe('camp choice — Sharpen the Blade (delveAttackBonus)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it("playerAttack adds character.delveAttackBonus to the attack roll's bonus", () => {
    const goblin = getMonster('goblin');
    const baseline = makeFighter();
    const sharpened = makeFighter({ delveAttackBonus: 1 });

    // Same seed → same d20 roll. Only the attack bonus should differ by +1.
    const rollerA = createDiceRoller(99);
    const rollerB = createDiceRoller(99);

    const stateA = createCombat({ roller: rollerA, character: baseline, monsters: [{ def: goblin }] });
    const stateB = createCombat({ roller: rollerB, character: sharpened, monsters: [{ def: goblin }] });

    const goblinIdA = (stateA.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
    const goblinIdB = (stateB.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

    const afterA = playerAttack({ roller: rollerA, character: baseline, state: stateA }, goblinIdA, 'longsword').state;    const afterB = playerAttack({ roller: rollerB, character: sharpened, state: stateB }, goblinIdB, 'longsword').state;
    expect(afterA.lastAttack).toBeDefined();
    expect(afterB.lastAttack).toBeDefined();
    // Same natural roll, different attack bonus by exactly 1.
    expect(afterB.lastAttack!.natural).toBe(afterA.lastAttack!.natural);
    expect(afterB.lastAttack!.attackBonus - afterA.lastAttack!.attackBonus).toBe(1);
    expect(afterB.lastAttack!.total - afterA.lastAttack!.total).toBe(1);
  });

  it('stacks with permanentAttackBonus', () => {
    const goblin = getMonster('goblin');
    const baseline = makeFighter();
    const both = makeFighter({ delveAttackBonus: 1, permanentAttackBonus: 1 });

    const rollerA = createDiceRoller(11);
    const rollerB = createDiceRoller(11);

    const stateA = createCombat({ roller: rollerA, character: baseline, monsters: [{ def: goblin }] });
    const stateB = createCombat({ roller: rollerB, character: both, monsters: [{ def: goblin }] });

    const goblinIdA = (stateA.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;
    const goblinIdB = (stateB.combatants.find((c) => c.kind === 'monster') as MonsterCombatant).id;

    const afterA = playerAttack({ roller: rollerA, character: baseline, state: stateA }, goblinIdA, 'longsword').state;    const afterB = playerAttack({ roller: rollerB, character: both, state: stateB }, goblinIdB, 'longsword').state;
    expect(afterB.lastAttack!.attackBonus - afterA.lastAttack!.attackBonus).toBe(2);
  });
});
