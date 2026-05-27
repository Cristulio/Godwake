import { describe, it, expect } from 'vitest';
import {
  computeAC,
  critRange,
  effectiveAbilityScores,
  initiativeModifier,
  modifierFor,
  proficiencyBonus,
} from './derived';
import { createCharacter, STANDARD_ARRAY } from './initialize';

describe('proficiencyBonus', () => {
  it('is +2 at levels 1-4', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(2)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
  });
  it('is +3 at levels 5-8', () => {
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(8)).toBe(3);
  });
  it('is +4 at levels 9-12', () => {
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(12)).toBe(4);
  });
  it('is +5 at 13-16, +6 at 17-20', () => {
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(16)).toBe(5);
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });
});

describe('character derivation — human fighter', () => {
  const human = createCharacter({
    id: 'test-1',
    name: 'Sir Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0], // 15
      dex: STANDARD_ARRAY[2], // 13
      con: STANDARD_ARRAY[1], // 14
      int: STANDARD_ARRAY[5], // 8
      wis: STANDARD_ARRAY[3], // 12
      cha: STANDARD_ARRAY[4], // 10
    },
    skillProficiencies: ['athletics', 'perception'],
  });

  it('applies human +1 to every ability', () => {
    const scores = effectiveAbilityScores(human);
    expect(scores.str).toBe(16);
    expect(scores.dex).toBe(14);
    expect(scores.con).toBe(15);
    expect(scores.int).toBe(9);
    expect(scores.wis).toBe(13);
    expect(scores.cha).toBe(11);
  });

  it('modifiers reflect effective scores', () => {
    expect(modifierFor(human, 'str')).toBe(3); // 16 -> +3
    expect(modifierFor(human, 'dex')).toBe(2); // 14 -> +2
    expect(modifierFor(human, 'con')).toBe(2); // 15 -> +2
  });

  it('max HP at level 1 = 10 (fighter d10 max) + CON mod (+2) = 12', () => {
    expect(human.hp.max).toBe(12);
    expect(human.hp.current).toBe(12);
  });

  it('AC with no armor = 10 + DEX mod', () => {
    expect(computeAC(human)).toBe(10 + 2);
  });

  it('initiative modifier = DEX mod (no speed coupling)', () => {
    expect(initiativeModifier(human)).toBe(2);
  });

  it('Wood Elf init = DEX mod + Fey Reflexes (+1); speed 35 does not also bump it', () => {
    // Wood Elf grants +2 DEX on top of base 13 → effective DEX 15 (+2 mod).
    // Fey Reflexes adds an explicit +1 racial init bonus.
    const woodElf = { ...human, raceId: 'wood-elf' as const };
    expect(initiativeModifier(woodElf)).toBe(3);
  });

  it('Hill Dwarf init = DEX mod only — speed 25 does not penalise init', () => {
    // Hill Dwarf gives no DEX bonus; effective DEX = base 13 (+1 mod).
    const hillDwarf = { ...human, raceId: 'hill-dwarf' as const };
    expect(initiativeModifier(hillDwarf)).toBe(1);
  });

  it('starts with only the lv20 crit range (Improved Critical not yet)', () => {
    expect(critRange(human)).toEqual([20]);
  });

  it('Improved Critical kicks in at Champion level 2', () => {
    const champion2 = { ...human, level: 2, subclassId: 'champion' };
    expect(critRange(champion2)).toEqual([19, 20]);
  });

  it('Defense fighting style adds +1 AC when wearing armor', () => {
    const withLeather = {
      ...human,
      equipped: {
        mainHand: null,
        offHand: null,
        armor: { itemId: 'leather-armor' },
      },
    };
    // Leather: 11 + DEX(2) = 13. Defense fighting style +1 = 14.
    expect(computeAC(withLeather)).toBe(14);
  });

  it('shield adds +2 AC', () => {
    const withLeatherAndShield = {
      ...human,
      equipped: {
        mainHand: null,
        offHand: { itemId: 'shield' },
        armor: { itemId: 'leather-armor' },
      },
    };
    // Leather (11+2) + Defense (1) + Shield (2) = 16.
    expect(computeAC(withLeatherAndShield)).toBe(16);
  });

  it('chain mail caps DEX entirely (heavy armor)', () => {
    const withChain = {
      ...human,
      equipped: {
        mainHand: null,
        offHand: null,
        armor: { itemId: 'chain-mail' },
      },
    };
    // Chain 16 + Defense +1 = 17. DEX ignored.
    expect(computeAC(withChain)).toBe(17);
  });

  it('Bloody-Minded quirk subtracts 1 AC', () => {
    const cursed = { ...human, quirks: ['bloody-minded'] };
    // 10 + DEX(2) − 1 = 11
    expect(computeAC(cursed)).toBe(11);
  });

  it("Helm's Aegis blessing adds 1 AC", () => {
    const blessed = { ...human, blessings: ['helms-aegis'] };
    expect(computeAC(blessed)).toBe(13);
  });

  it("Silvanus's Root stacks +1 AC, −1 initiative", () => {
    const rooted = { ...human, blessings: ['silvanus-root'] };
    expect(computeAC(rooted)).toBe(13);
    expect(initiativeModifier(rooted)).toBe(1); // DEX(2) − 1
  });

  it('Vertigo quirk subtracts 2 from initiative', () => {
    const dizzy = { ...human, quirks: ['vertigo'] };
    expect(initiativeModifier(dizzy)).toBe(0); // DEX(2) − 2
  });

  it("Helm's Vigil adds 2 to initiative", () => {
    const watched = { ...human, blessings: ['helms-vigil'] };
    expect(initiativeModifier(watched)).toBe(4); // DEX(2) + 2
  });

  it('Remarkable Athlete adds +2 to initiative at Champion level 5', () => {
    const champion5 = { ...human, level: 5, subclassId: 'champion' };
    expect(initiativeModifier(champion5)).toBe(4); // DEX(2) + 2
  });

  it('Remarkable Athlete does not apply below Champion level 5', () => {
    const champion4 = { ...human, level: 4, subclassId: 'champion' };
    expect(initiativeModifier(champion4)).toBe(2); // DEX(2) only
  });

  it("Tempus's Edge widens crit range by 1", () => {
    const withEdge = { ...human, blessings: ['tempus-edge'] };
    // Lv1 fighter — no Improved Critical — base 20 → edge brings it to 19-20
    expect(critRange(withEdge)).toEqual([19, 20]);
  });

  it("Tempus's Edge stacks with Improved Critical", () => {
    const champion2 = {
      ...human,
      level: 2,
      subclassId: 'champion',
      blessings: ['tempus-edge'],
    };
    // Champion 19-20 + 1 → 18-20
    expect(critRange(champion2)).toEqual([18, 19, 20]);
  });
});
