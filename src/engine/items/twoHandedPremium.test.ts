import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../dice';
import { createCharacter, STANDARD_ARRAY } from '../character/initialize';
import { critRange } from '../character/derived';
import { getItem } from '../../content/items';
import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import { rollItem, rolledItemCost, depthEnhanceCap } from './rollItem';
import { aggregateAffixMods, characterAffixMods, type AffixMods } from './affixMods';
import {
  TWO_HANDED_AFFIX_SCALE,
  isTwoHandedPremiumBase,
  affixScaleForRef,
  scaleAffixMagnitude,
} from './twoHandedPremium';

/** The owner floor: a two-hander's rolled affix magnitudes ≥1.33× the one-hand roll. */
const PREMIUM_FLOOR = 1.33;

const NUMERIC_KEYS = [
  'acBonus',
  'acBonusWhileFull',
  'acBonusWhileBloodied',
  'attackBonus',
  'damageBonus',
  'critRangeBonus',
  'bleedDamage',
  'lifestealPct',
  'spellLifestealPct',
  'regenPerTurn',
  'tempHpPerCombat',
  'spellDcBonus',
  'spellDamageBonus',
  'spellAttackBonus',
  'bonusSpellSlotsL1',
  'rageDamageBonus',
  'markDamageBonus',
  'sneakDamageBonus',
  'followupDamageBonus',
] as const satisfies ReadonlyArray<keyof AffixMods>;

function fighter(): Character {
  return createCharacter({
    id: 't',
    name: 'Brick',
    raceId: 'human',
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      int: STANDARD_ARRAY[5],
    },
    skillProficiencies: [],
  });
}

function rolled(itemId: string, affixes: string[], enhancement = 0): ItemRef {
  return {
    itemId,
    rolled: { baseId: itemId, rarity: 'blue', affixes, enhancement, name: `Rolled ${itemId}` },
  };
}

function wielding(base: Character, ref: ItemRef, ring?: ItemRef): Character {
  return {
    ...base,
    equipped: { mainHand: ref, offHand: null, armor: null, ...(ring ? { ring1: ring } : {}) },
  };
}

describe('isTwoHandedPremiumBase', () => {
  it('matches true two-handers only — versatile counts as one-handed', () => {
    for (const id of ['greatsword', 'greataxe', 'shortbow', 'longbow']) {
      expect(isTwoHandedPremiumBase(getItem(id))).toBe(true);
    }
    // Versatile keeps shield access, so it never earns the premium.
    for (const id of ['longsword', 'warhammer', 'quarterstaff', 'battleaxe', 'monk-war-staff']) {
      expect(isTwoHandedPremiumBase(getItem(id))).toBe(false);
    }
    for (const id of ['dagger', 'rapier', 'mace', 'war-lute', 'monk-temple-glaive']) {
      expect(isTwoHandedPremiumBase(getItem(id))).toBe(false);
    }
    expect(isTwoHandedPremiumBase(getItem('shield'))).toBe(false);
    expect(isTwoHandedPremiumBase(getItem('iron-ring'))).toBe(false);
  });
});

describe('scaleAffixMagnitude', () => {
  it('scales up by the knob, rounded up, never less than +1 over the base', () => {
    for (let v = 1; v <= 12; v++) {
      const scaled = scaleAffixMagnitude(v, TWO_HANDED_AFFIX_SCALE);
      expect(scaled).toBeGreaterThanOrEqual(v + 1);
      expect(scaled / v).toBeGreaterThanOrEqual(PREMIUM_FLOOR);
    }
    expect(scaleAffixMagnitude(2, TWO_HANDED_AFFIX_SCALE)).toBe(3);
    expect(scaleAffixMagnitude(5, TWO_HANDED_AFFIX_SCALE)).toBe(7);
  });

  it('is the identity at scale 1 and for zero', () => {
    expect(scaleAffixMagnitude(4, 1)).toBe(4);
    expect(scaleAffixMagnitude(0, TWO_HANDED_AFFIX_SCALE)).toBe(0);
  });
});

describe('affixScaleForRef', () => {
  it('reads the premium off the base, rolled refs only', () => {
    expect(affixScaleForRef(rolled('greatsword', ['cruel']))).toBe(TWO_HANDED_AFFIX_SCALE);
    expect(affixScaleForRef(rolled('longsword', ['cruel']))).toBe(1);
    expect(affixScaleForRef({ itemId: 'greatsword' })).toBe(1);
    expect(affixScaleForRef(rolled('no-such-base', ['cruel']))).toBe(1);
    expect(affixScaleForRef(null)).toBe(1);
  });
});

describe('engine read path — characterAffixMods applies the premium per item', () => {
  const base = fighter();

  it('scales a two-hander’s affix magnitudes (ceil ×1.35, min +1)', () => {
    expect(characterAffixMods(wielding(base, rolled('greatsword', ['cruel']))).damageBonus).toBe(3);
    expect(characterAffixMods(wielding(base, rolled('greatsword', ['honed']))).attackBonus).toBe(2);
    expect(characterAffixMods(wielding(base, rolled('greatsword', ['keen']))).critRangeBonus).toBe(2);
    expect(characterAffixMods(wielding(base, rolled('greatsword', ['vampiric']))).lifestealPct).toBe(7);
    expect(characterAffixMods(wielding(base, rolled('greatsword', ['mending']))).regenPerTurn).toBe(6);
    expect(
      characterAffixMods(wielding(base, rolled('greatsword', ['relentless']))).followupDamageBonus,
    ).toBe(5);
  });

  it('leaves one-handers and versatile weapons at face value', () => {
    expect(characterAffixMods(wielding(base, rolled('longsword', ['cruel']))).damageBonus).toBe(2);
    expect(characterAffixMods(wielding(base, rolled('dagger', ['cruel']))).damageBonus).toBe(2);
    expect(characterAffixMods(wielding(base, rolled('longsword', ['keen']))).critRangeBonus).toBe(1);
  });

  it('scopes the premium to the two-hander — the rest of the kit stays unscaled', () => {
    const mods = characterAffixMods(
      wielding(base, rolled('greatsword', ['cruel']), rolled('iron-ring', ['savage'])),
    );
    // Scaled greatsword Cruel (3) + unscaled ring Savage (1).
    expect(mods.damageBonus).toBe(4);
  });

  it('feeds the derived pipeline — a Keen greatsword crits on 18-20', () => {
    expect(critRange(wielding(base, rolled('greatsword', ['keen'])))).toEqual([18, 19, 20]);
    expect(critRange(wielding(base, rolled('longsword', ['keen'])))).toEqual([19, 20]);
  });
});

describe('rolled two-handers beat the one-hand distribution by ≥33% (same seed schedule)', () => {
  it('holds per item and over the whole sample', () => {
    const base = fighter();
    const rarities = ['green', 'blue', 'purple'] as const;
    let premiumCount = 0;
    let versatileCount = 0;
    let plainCount = 0;
    let premiumEffSum = 0;
    let premiumBaseSum = 0;

    for (let i = 0; i < 300; i++) {
      const ref = rollItem(createDiceRoller(`2h-stat-${i}`), {
        rarity: rarities[i % rarities.length],
        classId: 'fighter',
        kind: 'weapon',
        depth: (i % 14) + 1,
      });
      const weapon = getItem(ref.itemId);
      const ids = ref.rolled!.affixes;
      // The one-hand roll: the same affix schedule at face value.
      const oneHand = aggregateAffixMods(ids);
      // The effective roll: what the engine reads with the item equipped.
      const effective = characterAffixMods(wielding(base, ref));

      if (isTwoHandedPremiumBase(weapon)) {
        premiumCount++;
        for (const key of NUMERIC_KEYS) {
          if (oneHand[key] <= 0) continue;
          expect(effective[key] / oneHand[key]).toBeGreaterThanOrEqual(PREMIUM_FLOOR);
          expect(effective[key]).toBeGreaterThanOrEqual(oneHand[key] + 1);
          premiumEffSum += effective[key];
          premiumBaseSum += oneHand[key];
        }
      } else {
        if (weapon.kind === 'weapon' && weapon.properties.includes('versatile')) versatileCount++;
        else plainCount++;
        for (const key of NUMERIC_KEYS) {
          expect(effective[key]).toBe(oneHand[key]);
        }
      }
    }

    // The sample really exercised all three populations.
    expect(premiumCount).toBeGreaterThan(20);
    expect(versatileCount).toBeGreaterThan(20);
    expect(plainCount).toBeGreaterThan(20);
    // Distribution-level floor across every rolled magnitude.
    expect(premiumBaseSum).toBeGreaterThan(0);
    expect(premiumEffSum / premiumBaseSum).toBeGreaterThanOrEqual(PREMIUM_FLOOR);
  });
});

describe('enhancement bias — two-handers sit one step closer to the depth cap', () => {
  const sample = (depth: number, n: number, tag: string) => {
    const premium: number[] = [];
    const rest: number[] = [];
    for (let i = 0; i < n; i++) {
      const ref = rollItem(createDiceRoller(`${tag}-${i}`), {
        rarity: 'blue',
        classId: 'fighter',
        kind: 'weapon',
        depth,
      });
      const enh = ref.rolled?.enhancement ?? 0;
      (isTwoHandedPremiumBase(getItem(ref.itemId)) ? premium : rest).push(enh);
    }
    return { premium, rest };
  };

  it('a Chapter-1 two-hander always rolls exactly +1 (cap 1); one-handers can roll +0', () => {
    const { premium, rest } = sample(1, 80, 'enh-d1');
    expect(premium.length).toBeGreaterThan(5);
    expect(rest.length).toBeGreaterThan(5);
    for (const enh of premium) expect(enh).toBe(1);
    expect(rest.some((enh) => enh === 0)).toBe(true);
  });

  it('shifts the +N distribution up without breaching the depth cap (Ch6)', () => {
    const { premium, rest } = sample(6, 150, 'enh-d6');
    expect(premium.length).toBeGreaterThan(10);
    expect(rest.length).toBeGreaterThan(10);
    const cap = depthEnhanceCap(6);
    for (const enh of premium) {
      expect(enh).toBeGreaterThanOrEqual(1);
      expect(enh).toBeLessThanOrEqual(cap);
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(premium)).toBeGreaterThan(mean(rest));
  });

  it('never exceeds the hard maxes — +3 in the base game, +5 in NG+ Ch14', () => {
    const d11 = sample(11, 120, 'enh-d11');
    for (const enh of d11.premium) expect(enh).toBeLessThanOrEqual(3);
    const d14 = sample(14, 120, 'enh-d14');
    for (const enh of d14.premium) expect(enh).toBeLessThanOrEqual(5);
    expect(d14.premium.some((enh) => enh === 5)).toBe(true);
  });
});

describe('pricing reads the premium', () => {
  it('a two-hander with the same rolled shape prices above the one-hander', () => {
    const gs = rolledItemCost(rolled('greatsword', ['cruel', 'keen']));
    const ls = rolledItemCost(rolled('longsword', ['cruel', 'keen']));
    expect(gs).toBeGreaterThan(ls);
  });

  it('versatile and plain bases price identically — the premium never leaks', () => {
    expect(rolledItemCost(rolled('longsword', ['cruel', 'keen']))).toBe(
      rolledItemCost(rolled('rapier', ['cruel', 'keen'])),
    );
    // With no affixes there is nothing amplified to pay for.
    expect(rolledItemCost(rolled('greatsword', []))).toBe(rolledItemCost(rolled('longsword', [])));
  });
});
