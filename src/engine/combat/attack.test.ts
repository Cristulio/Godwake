import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { playerAttack, weaponDamageDice } from './attack';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import { getItem } from '../../content/items';
import type { Weapon } from '../../schemas/item';
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

  it('stamps the full pre-clamp damage on lastAttack so overkill reads true (fix #1)', () => {
    const fighter = makeFighterStrBuild();
    fighter.baseAbilityScores = { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 };
    const goblin = getMonster('goblin');
    // Seed picked so the longsword connects (asserted below).
    const roller = createDiceRoller(5);
    const init = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    let state = init.state;
    let character = init.character;
    const goblinId = findMonster(state).id;
    ({ state, character } = playerAttack({ roller, character, state }, goblinId, 'longsword'));
    void character;
    expect(state.lastAttack?.hit).toBe(true);
    const dmgLine = state.log.find((l) => l.kind === 'damage');
    expect(dmgLine).toBeDefined();
    const headlineTotal = Number(dmgLine!.text.match(/Damage: (\d+)/)![1]);
    // damageDealt carries the full rolled number, independent of how little HP
    // the goblin had left — that's what the floating combat number reads.
    expect(state.lastAttack?.damageDealt).toBe(headlineTotal);
    expect(state.lastAttack?.damageType).toBe('slashing');
  });

  it('splits off-type radiant from the weapon type and the breakdown sums (fix #2)', () => {
    const fighter = makeFighterStrBuild();
    fighter.baseAbilityScores = { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 };
    fighter.blessings = ['helms-bulwark']; // +1 radiant on hits
    const goblin = getMonster('goblin');
    const roller = createDiceRoller(5);
    const init = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
    let state = init.state;
    let character = init.character;
    const goblinId = findMonster(state).id;
    ({ state, character } = playerAttack({ roller, character, state }, goblinId, 'longsword'));
    void character;
    expect(state.lastAttack?.hit).toBe(true);
    const dmgLine = state.log.find((l) => l.kind === 'damage');
    expect(dmgLine).toBeDefined();
    const text = dmgLine!.text;
    // Headline reads "<N> slashing + 1 radiant (<breakdown>)" — radiant is
    // never folded into / mislabeled as slashing.
    const head = text.match(/Damage: (\d+) slashing \+ (\d+) radiant \((.+)\)/);
    expect(head).toBeTruthy();
    const weaponTotal = Number(head![1]);
    expect(Number(head![2])).toBe(1);
    // The parenthetical components sum to the weapon-type subtotal.
    const terms = head![3].split(/ (?=[+-] )/);
    const sum = terms.reduce((acc, t) => {
      const m = t.match(/^([+-]?)\s*(\d+)/);
      return m ? acc + (m[1] === '-' ? -1 : 1) * Number(m[2]) : acc;
    }, 0);
    expect(sum).toBe(weaponTotal);
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

describe('versatile weapons — two-handed die (item 16)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it('weaponDamageDice picks the 2H die only when versatile and the off-hand is empty', () => {
    const longsword = getItem('longsword') as Weapon; // 1d8 / 1d10 versatile
    expect(weaponDamageDice(longsword, true)).toBe('1d10'); // off-hand empty → 2H
    expect(weaponDamageDice(longsword, false)).toBe('1d8'); // shield/off-hand → 1H

    const greatsword = getItem('greatsword') as Weapon; // 2d6, two-handed (not versatile)
    expect(weaponDamageDice(greatsword, true)).toBe('2d6');

    const dagger = getItem('dagger') as Weapon; // 1d4, no versatile
    expect(weaponDamageDice(dagger, true)).toBe('1d4');
  });

  // Raw dice are logged as "(<N> dice ...)" — independent of STR/affix bonuses —
  // so we can read the die span straight from the damage line.
  function rawDice(state: CombatState): number | null {
    const line = state.log.find((l) => l.kind === 'damage');
    const m = line?.text.match(/\((\d+) dice/);
    return m ? Number(m[1]) : null;
  }

  it('a longsword swung with an empty off-hand rolls 1d10 (can exceed 8); with a shield it stays 1d8', () => {
    const goblin = getMonster('goblin');
    const collect = (offHandShield: boolean): number[] => {
      const dice: number[] = [];
      for (let seed = 1; seed <= 400; seed++) {
        _resetMonsterInstanceCounter();
        const fighter = makeFighterStrBuild();
        fighter.baseAbilityScores = { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 };
        if (offHandShield) fighter.equipped = { ...fighter.equipped, offHand: { itemId: 'shield' } };
        const roller = createDiceRoller(seed);
        const init = createCombat({ roller, character: fighter, monsters: [{ def: goblin }] });
        const goblinId = findMonster(init.state).id;
        const { state } = playerAttack(
          { roller, character: init.character, state: init.state },
          goblinId,
          'longsword',
        );
        // Only count non-crit hits — a crit doubles the dice and would muddy the span.
        if (state.lastAttack?.hit && !state.lastAttack.crit) {
          const n = rawDice(state);
          if (n !== null) dice.push(n);
        }
      }
      return dice;
    };

    const twoHanded = collect(false);
    const oneHanded = collect(true);

    // Both variants must actually land hits over 400 seeds.
    expect(twoHanded.length).toBeGreaterThan(20);
    expect(oneHanded.length).toBeGreaterThan(20);

    // Empty off-hand → 1d10, so 9 or 10 shows up. Shield → 1d8, capped at 8.
    expect(Math.max(...twoHanded)).toBeGreaterThan(8);
    expect(Math.max(...oneHanded)).toBeLessThanOrEqual(8);
  });
});
