import { describe, it, expect } from 'vitest';
import {
  computeAC,
  critRange,
  effectiveAbilityScores,
  modifierFor,
  proficiencyBonus,
  ragedHealAmount,
} from './derived';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import type { Character } from '../../types/character';

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

describe('ragedHealAmount — Rage halves healing (rounded up), never negates it', () => {
  const base = createCharacter({
    id: 'rage-heal',
    name: 'Cali',
    raceId: 'human',
    classId: 'barbarian',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      dex: STANDARD_ARRAY[2],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[5],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['athletics', 'intimidation'],
  });
  const raging: Character = { ...base, resources: { ...base.resources, rageRoundsRemaining: 3 } };

  it('passes the full amount through when not raging', () => {
    expect(ragedHealAmount(base, 10)).toBe(10);
    expect(ragedHealAmount(base, 7)).toBe(7);
  });

  it('halves and rounds UP while raging, and never drops a real heal to 0', () => {
    expect(ragedHealAmount(raging, 10)).toBe(5);
    expect(ragedHealAmount(raging, 7)).toBe(4); // ceil(3.5)
    expect(ragedHealAmount(raging, 1)).toBe(1); // a 1-point heal still restores 1
  });

  it('leaves zero/negative amounts untouched (no spurious heal)', () => {
    expect(ragedHealAmount(raging, 0)).toBe(0);
    expect(ragedHealAmount(base, 0)).toBe(0);
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

  it("Argus's Aegis blessing adds 1 AC", () => {
    const blessed = { ...human, blessings: ['helms-aegis'] };
    expect(computeAC(blessed)).toBe(13);
  });

  it("Silvanus's Root grants +1 AC while bloodied, not at full HP", () => {
    // at full HP the bloodied conditional doesn't fire
    expect(computeAC({ ...human, blessings: ['silvanus-root'] })).toBe(12);
    // at 1 HP (bloodied = hp.current ≤ hp.max / 2 = 6) the bonus applies
    const bloodied = { ...human, blessings: ['silvanus-root'], hp: { ...human.hp, current: 1 } };
    expect(computeAC(bloodied)).toBe(13);
  });

  it("Ares's Edge widens crit range by 1", () => {
    const withEdge = { ...human, blessings: ['tempus-edge'] };
    // Lv1 fighter — no Improved Critical — base 20 → edge brings it to 19-20
    expect(critRange(withEdge)).toEqual([19, 20]);
  });

  it("Ares's Edge stacks with Improved Critical", () => {
    const champion2 = {
      ...human,
      level: 2,
      subclassId: 'champion',
      blessings: ['tempus-edge'],
    };
    // Champion 19-20 + 1 → 18-20
    expect(critRange(champion2)).toEqual([18, 19, 20]);
  });

  it("Argus's Vigil adds +2 AC only while at full HP", () => {
    const full = { ...human, blessings: ['helms-vigil'] };
    // human starts at full HP → 10 + DEX(2) + 2 = 14
    expect(computeAC(full)).toBe(14);
    const scratched = { ...full, hp: { ...full.hp, current: full.hp.max - 1 } };
    // one point of damage drops the turtle bonus → back to 12
    expect(computeAC(scratched)).toBe(12);
  });

  it("Atlas's Forbearance adds +2 AC only while bloodied", () => {
    const blessed = { ...human, blessings: ['ilmaters-forbearance'] };
    // full HP → no bonus
    expect(computeAC(blessed)).toBe(12);
    const bloodied = { ...blessed, hp: { ...blessed.hp, current: Math.floor(blessed.hp.max / 2) } };
    // at or below half → +2
    expect(computeAC(bloodied)).toBe(14);
  });

  it("Silvanus's Burden adds +1 AC per bane quirk", () => {
    // pinchpurse / hollow-coin are gold-only banes — no acMod to muddy the math.
    const twoBanes = { ...human, blessings: ['silvanus-burden'], quirks: ['pinchpurse', 'hollow-coin'] };
    // 10 + DEX(2) + 2 banes = 14
    expect(computeAC(twoBanes)).toBe(14);
    const noBanes = { ...human, blessings: ['silvanus-burden'], quirks: [] };
    expect(computeAC(noBanes)).toBe(12);
  });

  it('two crit-range blessings stack to +2 (crit on 18-20)', () => {
    const one = { ...human, blessings: ['tempus-edge'] };
    expect(critRange(one)).toEqual([19, 20]);
    const both = { ...human, blessings: ['tempus-edge', 'tymoras-gambit'] };
    expect(critRange(both)).toEqual([18, 19, 20]);
  });
});
