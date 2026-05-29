import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { createCombat, _resetMonsterInstanceCounter } from './createCombat';
import { createDiceRoller } from '../dice';
import { getMonster } from '../../content/monsters';
import type { Character } from '../../types/character';

function makeHuman(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-hero',
      name: 'Tester',
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

const goblin = getMonster('goblin');
const roller = createDiceRoller(7);

describe('v2 blessings — start-of-combat temp HP (createCombat)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it("Lathander's Ascendance grants temp HP equal to delve level", () => {
    const hero = makeHuman({ blessings: ['lathanders-ascendance'], level: 5 });
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.temp).toBe(5);
  });

  it("Mystra's Reserve grants 2 temp HP per bane quirk", () => {
    const hero = makeHuman({
      blessings: ['mystras-reserve'],
      quirks: ['vertigo', 'glassbone'],
    });
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.temp).toBe(4);
  });

  it("Mystra's Reserve grants nothing with no banes", () => {
    const hero = makeHuman({ blessings: ['mystras-reserve'], quirks: [] });
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.temp).toBe(0);
  });

  it("Helm's Bastion grants temp HP ONLY on a boss fight", () => {
    const hero = makeHuman({ blessings: ['helms-bastion'] });
    const normal = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(normal.hp.temp).toBe(0);
    const boss = createCombat({
      roller,
      character: hero,
      monsters: [{ def: goblin }],
      isBoss: true,
    }).character;
    expect(boss.hp.temp).toBe(6);
  });

  it('temp HP from multiple sources takes the single largest (RAW: no stacking)', () => {
    const hero = makeHuman({
      blessings: ['lathanders-dawn', 'lathanders-ascendance'],
      level: 5,
    });
    // flat 3 vs level-scaled 5 → 5
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.temp).toBe(5);
  });

  it('does not overwrite a larger existing temp HP pool', () => {
    let hero = makeHuman({ blessings: ['lathanders-ascendance'], level: 2 });
    hero = { ...hero, hp: { ...hero.hp, temp: 9 } };
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.temp).toBe(9);
  });
});

describe('v2 blessings — per-combat regeneration (createCombat)', () => {
  beforeEach(() => _resetMonsterInstanceCounter());

  it("Silvanus's Renewal heals a flat 2 HP at combat start", () => {
    let hero = makeHuman({ blessings: ['silvanus-renewal'] });
    hero = { ...hero, hp: { current: 1, max: 20, temp: 0 } };
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.current).toBe(3);
  });

  it("Ilmater's Mercy heals 10% of max HP at combat start", () => {
    let hero = makeHuman({ blessings: ['ilmaters-mercy'] });
    hero = { ...hero, hp: { current: 1, max: 20, temp: 0 } };
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    // 10% of 20 = 2 → 1 + 2 = 3
    expect(after.hp.current).toBe(3);
  });

  it('regen never overheals past max', () => {
    let hero = makeHuman({ blessings: ['silvanus-renewal'] });
    hero = { ...hero, hp: { current: 19, max: 20, temp: 0 } };
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.current).toBe(20);
  });

  it('regen is a no-op at full HP', () => {
    let hero = makeHuman({ blessings: ['silvanus-renewal'] });
    hero = { ...hero, hp: { current: 20, max: 20, temp: 0 } };
    const after = createCombat({ roller, character: hero, monsters: [{ def: goblin }] }).character;
    expect(after.hp.current).toBe(20);
  });
});
