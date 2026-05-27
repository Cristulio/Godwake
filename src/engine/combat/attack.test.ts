import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { Character } from '../../types/character';

function extractAttackBonus(line: string): number {
  const m = line.match(/d20([+-]\d+)/);
  if (!m) throw new Error(`no d20 bonus in: ${line}`);
  return Number(m[1]);
}

function findMonster(state: CombatState): MonsterCombatant {
  return state.combatants.find((c) => c.kind === 'monster') as MonsterCombatant;
}

function makeRogueDexBuild(): Character {
  return {
    ...createCharacter({
      id: 'r1',
      name: 'Shiv',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5], // 8 → human +1 = 9 → mod -1
        dex: STANDARD_ARRAY[1], // 14 → +1 = 15... let's get +3 instead
        con: STANDARD_ARRAY[2],
        int: STANDARD_ARRAY[3],
        wis: STANDARD_ARRAY[4],
        cha: STANDARD_ARRAY[0], // bump cha into the 15 slot
      },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    }),
    // Force the DEX-17 / STR-8 build the brief specifies — bypass the array
    // ordering and write the scores directly.
    inventory: [{ itemId: 'shortbow' }, { itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'shortbow' }, offHand: null, armor: null },
  };
}

function makeFighterStrBuild(): Character {
  return {
    ...createCharacter({
      id: 'f1',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0], // 15 → +1 = 16 → mod +3
        dex: STANDARD_ARRAY[2], // 13
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[5],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    inventory: [{ itemId: 'longsword' }],
    equipped: { mainHand: { itemId: 'longsword' }, offHand: null, armor: null },
  };
}

describe('playerAttack — weapon ability selection', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('Rogue with shortbow uses DEX, not STR (would-be +1 STR build prints +6 DEX)', () => {
    const rogue = makeRogueDexBuild();
    // Base STR 8, base DEX 17. Human race adds +1 to every stat → STR 9 / DEX 18,
    // mods -1 / +4. L1 proficiency = +2. So the bow should print +6 (DEX path).
    // If the bug were still live, it would print +1 (STR path).
    rogue.baseAbilityScores = {
      str: 8,
      dex: 17,
      con: 12,
      int: 10,
      wis: 10,
      cha: 8,
    };
    const goblin = getMonster('goblin');
    const roller = createDiceRoller(1);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    let character = init.character;
    const goblinId = findMonster(state).id;
    ({ state, character } = playerAttack({ roller, character, state }, goblinId, 'shortbow'));
    const line = state.log.find((l) => /fires at .* with Shortbow/.test(l.text));
    expect(line).toBeDefined();
    const bonus = extractAttackBonus(line!.text);
    expect(bonus).toBe(6);
    expect(bonus).not.toBe(1);
    void character;
  });

  it('Fighter with longsword still uses STR', () => {
    const fighter = makeFighterStrBuild();
    fighter.baseAbilityScores = {
      str: 16,
      dex: 12,
      con: 14,
      int: 8,
      wis: 10,
      cha: 10,
    };
    const goblin = getMonster('goblin');
    const roller = createDiceRoller(3);
    const init = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    let state = init.state;
    let character = init.character;
    const goblinId = findMonster(state).id;
    ({ state, character } = playerAttack({ roller, character, state }, goblinId, 'longsword'));
    void character;
    const line = state.log.find((l) => /attacks .* with Longsword/.test(l.text));
    expect(line).toBeDefined();
    // STR 16 → +3 mod. L1 proficiency = +2. Expected +5.
    expect(extractAttackBonus(line!.text)).toBe(5);
  });

  it('ranged attack log uses "fires at" verb (not "attacks")', () => {
    const rogue = makeRogueDexBuild();
    rogue.baseAbilityScores = { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 8 };
    const goblin = getMonster('goblin');
    const roller = createDiceRoller(2);
    const init = createCombat({ roller, character: rogue, monsters: [{ def: goblin }] });
    let state = init.state;
    let character = init.character;
    const goblinId = findMonster(state).id;
    ({ state, character } = playerAttack({ roller, character, state }, goblinId, 'shortbow'));
    void character;
    const shortbowLine = state.log.find((l) => l.text.includes('Shortbow'));
    expect(shortbowLine?.text).toContain('fires at');
    expect(shortbowLine?.text).not.toContain('attacks Goblin with Shortbow');
  });
});
