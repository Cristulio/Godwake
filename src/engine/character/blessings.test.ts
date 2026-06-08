import { describe, it, expect, vi } from 'vitest';
import { createDiceRoller } from '../dice';
import { BlessingSchema, type Blessing } from '../../schemas/blessing';
import { aggregateBlessingModifiers, blessingSignature, characterBlessingMods, rollBlessingOptions } from './blessings';
import { computeAC, critRange } from './derived';
import { blessingsForClass } from './blessings';
import { spellSaveDC, spellDamageBonus, spellAttackBonus } from '../combat/spells/helpers';
import { characterAtLevel } from '../../test/sim/encounterStress';

const mocks = vi.hoisted(() => ({
  useFakePool: false,
  fakePool: [] as Blessing[],
}));

vi.mock('../../content/blessings', async () => {
  const actual =
    await vi.importActual<typeof import('../../content/blessings')>('../../content/blessings');
  return {
    ...actual,
    listBlessings: () => (mocks.useFakePool ? mocks.fakePool : actual.listBlessings()),
    getBlessing: (id: string) => {
      if (mocks.useFakePool) {
        const found = mocks.fakePool.find((b) => b.id === id);
        if (!found) throw new Error(`Blessing not found: ${id}`);
        return found;
      }
      return actual.getBlessing(id);
    },
  };
});

function fakeBlessing(id: string, modifiers: Blessing['modifiers']): Blessing {
  return BlessingSchema.parse({
    id,
    name: id,
    god: 'helm',
    flavor: 'test',
    effect: 'test',
    modifiers,
  });
}

function withFakePool<T>(pool: Blessing[], fn: () => T): T {
  mocks.useFakePool = true;
  mocks.fakePool = pool;
  try {
    return fn();
  } finally {
    mocks.useFakePool = false;
    mocks.fakePool = [];
  }
}

describe('blessingSignature', () => {
  it('returns identical signatures for identical modifier bundles', () => {
    const a = fakeBlessing('a', { acBonus: 1 });
    const b = fakeBlessing('b', { acBonus: 1 });
    expect(blessingSignature(a)).toBe(blessingSignature(b));
  });

  it('is order-insensitive across modifier keys', () => {
    const a = fakeBlessing('a', { acBonus: 1, damageBonus: 2 });
    const b = fakeBlessing('b', { damageBonus: 2, acBonus: 1 });
    expect(blessingSignature(a)).toBe(blessingSignature(b));
  });

  it('differs when a numeric modifier differs', () => {
    const a = fakeBlessing('a', { acBonus: 1 });
    const b = fakeBlessing('b', { acBonus: 2 });
    expect(blessingSignature(a)).not.toBe(blessingSignature(b));
  });

  it('differs when a boolean modifier differs', () => {
    const a = fakeBlessing('a', { firstAttackAdvantage: true });
    const b = fakeBlessing('b', { acBonus: 1 });
    expect(blessingSignature(a)).not.toBe(blessingSignature(b));
  });
});

describe('rollBlessingOptions — signature dedup', () => {
  it('never returns two blessings with identical mechanical signature in one roll', () => {
    const pool: Blessing[] = [
      fakeBlessing('ac-1-a', { acBonus: 1 }),
      fakeBlessing('ac-1-b', { acBonus: 1 }),
      fakeBlessing('dmg-1', { damageBonus: 1 }),
      fakeBlessing('fa-2', { firstAttackBonus: 2 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 3);
        const sigs = new Set<string>();
        for (const id of result) {
          const b = pool.find((p) => p.id === id)!;
          const sig = blessingSignature(b);
          expect(sigs.has(sig)).toBe(false);
          sigs.add(sig);
        }
      }
    });
  });

  it('returns up to N options when the pool collapses to fewer distinct signatures', () => {
    const pool: Blessing[] = [
      fakeBlessing('a', { acBonus: 1 }),
      fakeBlessing('b', { acBonus: 1 }),
      fakeBlessing('c', { acBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const roller = createDiceRoller(42);
      const result = rollBlessingOptions(roller, 3);
      expect(result.length).toBe(1);
    });
  });
});

describe('rollBlessingOptions — excludes owned non-stacking blessings', () => {
  it('never re-offers a non-stacking blessing (or its signature twin) once owned', () => {
    // acBonus now sums, so use damageBonus (still max-of / non-stacking) for this check.
    const pool: Blessing[] = [
      fakeBlessing('dmg-a', { damageBonus: 1 }),
      fakeBlessing('dmg-b', { damageBonus: 1 }),
      fakeBlessing('ac', { acBonus: 1 }),
      fakeBlessing('reroll', { rerollMissesPerEncounter: 1 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const roller = createDiceRoller(seed);
        // Owns one +1 damage card — both damage cards share its signature, so
        // neither should ever be offered again (damageBonus is still non-stacking).
        const result = rollBlessingOptions(roller, 3, undefined, ['dmg-a']);
        expect(result).not.toContain('dmg-a');
        expect(result).not.toContain('dmg-b');
      }
    });
  });

  it('firstAttackAdvantage is non-stacking: owning one blocks the duplicate', () => {
    const pool: Blessing[] = [
      fakeBlessing('adv-a', { firstAttackAdvantage: true }),
      fakeBlessing('adv-b', { firstAttackAdvantage: true }),
      fakeBlessing('dmg', { damageBonus: 1 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 100; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 3, undefined, ['adv-a']);
        expect(result).not.toContain('adv-a');
        expect(result).not.toContain('adv-b');
      }
    });
  });

  it('consumes the exact owned blessing but still offers a distinct stacking twin', () => {
    const pool: Blessing[] = [
      fakeBlessing('stab-a', { extraStabiliseCharges: 1 }),
      fakeBlessing('stab-b', { extraStabiliseCharges: 1 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 50; seed += 1) {
        const roller = createDiceRoller(seed);
        // Owning stab-a consumes it (never re-offered), but a distinct stacking
        // card with the same lever still surfaces — picking it adds a charge.
        const result = rollBlessingOptions(roller, 1, undefined, ['stab-a']);
        expect(result).not.toContain('stab-a');
        expect(result).toEqual(['stab-b']);
      }
    });
  });
});

describe('rollBlessingOptions — full per-run consumption', () => {
  it('never re-offers any owned blessing, even one whose levers still stack', () => {
    const pool: Blessing[] = [
      fakeBlessing('stab', { extraStabiliseCharges: 1 }),
      fakeBlessing('regen', { regenPerCombat: 2 }),
      fakeBlessing('ac', { acBonus: 1 }),
      fakeBlessing('reroll', { rerollMissesPerEncounter: 1 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 4, undefined, ['stab', 'regen']);
        expect(result).not.toContain('stab');
        expect(result).not.toContain('regen');
      }
    });
  });

  it('returns no options once every offerable blessing is owned (exhausted pool)', () => {
    const pool: Blessing[] = [
      fakeBlessing('a', { acBonus: 1 }),
      fakeBlessing('b', { regenPerCombat: 2 }),
      fakeBlessing('c', { rerollMissesPerEncounter: 1 }),
    ];
    withFakePool(pool, () => {
      const roller = createDiceRoller(3);
      const result = rollBlessingOptions(roller, 3, undefined, ['a', 'b', 'c']);
      expect(result).toEqual([]);
    });
  });
});

describe('aggregateBlessingModifiers — non-stacking fields take max-of-individual', () => {
  it('takes max-of-individual for extraTempHpPerRoom (regression pin for #80)', () => {
    const pool: Blessing[] = [
      fakeBlessing('lath', { extraTempHpPerRoom: 3 }),
      fakeBlessing('ilm', { extraTempHpPerRoom: 2 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['lath', 'ilm']);
      expect(mods.extraTempHpPerRoom).toBe(3);
    });
  });

  it('acBonus now sums — three +1 AC blessings reach +3 (positive values additive)', () => {
    const pool: Blessing[] = [
      fakeBlessing('helm', { acBonus: 1 }),
      fakeBlessing('mystra', { acBonus: 1 }),
      fakeBlessing('silv', { acBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['helm', 'mystra', 'silv']);
      expect(mods.acBonus).toBe(3);
    });
  });

  it('acBonus sums negative values — Gambit penalty correctly reduces net AC', () => {
    const pool: Blessing[] = [
      fakeBlessing('aegis', { acBonus: 1 }),
      fakeBlessing('gambit', { acBonus: -1, critRangeBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['aegis', 'gambit']);
      expect(mods.acBonus).toBe(0); // 1 + (-1) = 0: gambit's penalty applies
    });
  });

  it('SUMS critRangeBonus (Tempus + Tymora stack to +2 → crit on 18–20)', () => {
    const pool: Blessing[] = [
      fakeBlessing('tempus', { critRangeBonus: 1 }),
      fakeBlessing('tymora', { critRangeBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['tempus', 'tymora']);
      expect(mods.critRangeBonus).toBe(2);
    });
  });

  it('takes max-of-individual for damageBonus (Mystra + Silvanus would otherwise reach +2/hit)', () => {
    const pool: Blessing[] = [
      fakeBlessing('mystra', { damageBonus: 1 }),
      fakeBlessing('silv', { damageBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['mystra', 'silv']);
      expect(mods.damageBonus).toBe(1);
    });
  });

  it('takes max-of-individual for holyDamageBonus (Helm + Lathander would otherwise reach +2/hit)', () => {
    const pool: Blessing[] = [
      fakeBlessing('helm', { holyDamageBonus: 1 }),
      fakeBlessing('lath', { holyDamageBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['helm', 'lath']);
      expect(mods.holyDamageBonus).toBe(1);
    });
  });
});

describe('aggregateBlessingModifiers — remaining sum-style fields', () => {
  it('still sums extraStabiliseCharges (Ilmater + Tymora)', () => {
    const pool: Blessing[] = [
      fakeBlessing('ilm', { extraStabiliseCharges: 1 }),
      fakeBlessing('tym', { extraStabiliseCharges: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['ilm', 'tym']);
      expect(mods.extraStabiliseCharges).toBe(2);
    });
  });

  it('still sums firstAttackDamage / firstAttackBonus / rerollMissesPerEncounter', () => {
    const pool: Blessing[] = [
      fakeBlessing('a', { firstAttackDamage: 2, firstAttackBonus: 2, rerollMissesPerEncounter: 1 }),
      fakeBlessing('b', { firstAttackDamage: 1, firstAttackBonus: 1, rerollMissesPerEncounter: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['a', 'b']);
      expect(mods.firstAttackDamage).toBe(3);
      expect(mods.firstAttackBonus).toBe(3);
      expect(mods.rerollMissesPerEncounter).toBe(2);
    });
  });

  it('ORs firstAttackAdvantage', () => {
    const pool: Blessing[] = [
      fakeBlessing('selune', { firstAttackAdvantage: true }),
      fakeBlessing('plain', { acBonus: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['plain', 'selune']);
      expect(mods.firstAttackAdvantage).toBe(true);
    });
  });
});

describe('aggregateBlessingModifiers — v2 conditional/scaling levers', () => {
  it('takes max-of for every temp-HP source (they share one non-stacking pool)', () => {
    const pool: Blessing[] = [
      fakeBlessing('a', { tempHpPerDelveLevel: 1 }),
      fakeBlessing('b', { tempHpPerDelveLevel: 2 }),
      fakeBlessing('c', { tempHpPerBaneQuirk: 2 }),
      fakeBlessing('d', { tempHpPerBaneQuirk: 3 }),
      fakeBlessing('e', { bossTempHp: 4 }),
      fakeBlessing('f', { bossTempHp: 6 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['a', 'b', 'c', 'd', 'e', 'f']);
      expect(mods.tempHpPerDelveLevel).toBe(2);
      expect(mods.tempHpPerBaneQuirk).toBe(3);
      expect(mods.bossTempHp).toBe(6);
    });
  });

  it('takes max-of for conditional AC levers but SUMS conditional crit levers', () => {
    const pool: Blessing[] = [
      fakeBlessing('af1', { acBonusWhileFull: 1 }),
      fakeBlessing('af2', { acBonusWhileFull: 2 }),
      fakeBlessing('ab1', { acBonusWhileBloodied: 2 }),
      fakeBlessing('apb', { acBonusPerBaneQuirk: 1 }),
      fakeBlessing('cf1', { critRangeBonusWhileFull: 1 }),
      fakeBlessing('cf2', { critRangeBonusWhileFull: 1 }),
      fakeBlessing('cb1', { critRangeBonusWhileBloodied: 1 }),
      fakeBlessing('cb2', { critRangeBonusWhileBloodied: 1 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['af1', 'af2', 'ab1', 'apb', 'cf1', 'cf2', 'cb1', 'cb2']);
      expect(mods.acBonusWhileFull).toBe(2);
      expect(mods.acBonusWhileBloodied).toBe(2);
      expect(mods.acBonusPerBaneQuirk).toBe(1);
      expect(mods.critRangeBonusWhileFull).toBe(2);
      expect(mods.critRangeBonusWhileBloodied).toBe(2);
    });
  });

  it('SUMS the two regen fields (a second healing pick genuinely compounds)', () => {
    const pool: Blessing[] = [
      fakeBlessing('r1', { regenPerCombat: 2 }),
      fakeBlessing('r2', { regenPerCombat: 3 }),
      fakeBlessing('p1', { regenPctPerCombat: 10 }),
      fakeBlessing('p2', { regenPctPerCombat: 5 }),
    ];
    withFakePool(pool, () => {
      const mods = aggregateBlessingModifiers(['r1', 'r2', 'p1', 'p2']);
      expect(mods.regenPerCombat).toBe(5);
      expect(mods.regenPctPerCombat).toBe(15);
    });
  });
});

describe('rollBlessingOptions — v2 levers stack/non-stack offer rules', () => {
  it('a conditional AC blessing is non-stacking: owning one blocks its twin', () => {
    const pool: Blessing[] = [
      fakeBlessing('full-a', { acBonusWhileFull: 2 }),
      fakeBlessing('full-b', { acBonusWhileFull: 2 }),
      fakeBlessing('dmg', { damageBonus: 1 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 100; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 3, undefined, ['full-a']);
        expect(result).not.toContain('full-a');
        expect(result).not.toContain('full-b');
      }
    });
  });

  it('a distinct regen blessing still gets offered after the owned one is consumed', () => {
    const pool: Blessing[] = [
      fakeBlessing('regen-a', { regenPerCombat: 2 }),
      fakeBlessing('regen-b', { regenPerCombat: 2 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 50; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 1, undefined, ['regen-a']);
        expect(result).toEqual(['regen-b']);
      }
    });
  });
});

describe('getBlessingCategory', () => {
  it('buckets the three AC blessings the player saw together as one category', async () => {
    const { getBlessing, getBlessingCategory } = await import('../../content/blessings');
    // Helm's Vigil (+2 AC full) / Mystra's Ward (+1 AC) / Ilmater's Forbearance
    // (+2 AC bloodied) — the trio that all showed in one offer. All defensive.
    const cats = ['helms-vigil', 'mystras-ward', 'ilmaters-forbearance'].map((id) =>
      getBlessingCategory(getBlessing(id)),
    );
    expect(new Set(cats)).toEqual(new Set(['defense']));
  });

  it('separates distinct effect levers into distinct categories', async () => {
    const { getBlessing, getBlessingCategory } = await import('../../content/blessings');
    expect(getBlessingCategory(getBlessing('helms-aegis'))).toBe('defense');
    expect(getBlessingCategory(getBlessing('lathanders-dawn'))).toBe('vitality');
    expect(getBlessingCategory(getBlessing('silvanus-renewal'))).toBe('vitality');
    expect(getBlessingCategory(getBlessing('mystras-whisper'))).toBe('offense');
    expect(getBlessingCategory(getBlessing('selunes-veil'))).toBe('precision');
    expect(getBlessingCategory(getBlessing('tempus-edge'))).toBe('crit');
    expect(getBlessingCategory(getBlessing('ilmaters-patience'))).toBe('salvation');
    expect(getBlessingCategory(getBlessing('tymoras-coin'))).toBe('fortune');
  });
});

describe('rollBlessingOptions — effect-category spread', () => {
  it('a single offer never shows three same-category blessings (real pool, every class)', async () => {
    const { getBlessing, getBlessingCategory } = await import('../../content/blessings');
    for (const classId of [undefined, 'fighter', 'rogue', 'wizard'] as const) {
      for (let seed = 0; seed < 200; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 3, classId);
        const counts = new Map<string, number>();
        for (const id of result) {
          const c = getBlessingCategory(getBlessing(id));
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        expect(Math.max(...counts.values())).toBeLessThan(3);
      }
    }
  });

  it('prefers distinct categories when the pool can span them', () => {
    const pool: Blessing[] = [
      fakeBlessing('ac-flat', { acBonus: 1 }),
      fakeBlessing('ac-full', { acBonusWhileFull: 2 }),
      fakeBlessing('ac-bloodied', { acBonusWhileBloodied: 2 }),
      fakeBlessing('dmg', { damageBonus: 1 }),
      fakeBlessing('temp', { extraTempHpPerRoom: 3 }),
    ];
    withFakePool(pool, () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const roller = createDiceRoller(seed);
        const result = rollBlessingOptions(roller, 3);
        expect(result.length).toBe(3);
        // Three defensive cards exist, but defense/offense/vitality can all be
        // spanned — so a roll of three never stacks more than one defense card.
        const defenseCount = result.filter((id) =>
          ['ac-flat', 'ac-full', 'ac-bloodied'].includes(id),
        ).length;
        expect(defenseCount).toBeLessThan(2);
      }
    });
  });

  it('relaxes the spread to still return N when the pool is single-category', () => {
    const pool: Blessing[] = [
      fakeBlessing('ac-a', { acBonus: 1 }),
      fakeBlessing('ac-b', { acBonus: 2 }),
      fakeBlessing('ac-c', { acBonus: 3 }),
    ];
    withFakePool(pool, () => {
      const roller = createDiceRoller(7);
      const result = rollBlessingOptions(roller, 3);
      // All defense but distinct signatures — the relaxed second pass fills all
      // three rather than reducing the count below signature-dedup's yield.
      expect(result.length).toBe(3);
      expect(new Set(result).size).toBe(3);
    });
  });
});

describe('rollBlessingOptions — real pool', () => {
  it('100-roll sweep produces no batch with two identical-signature entries', async () => {
    const { getBlessing } = await import('../../content/blessings');
    for (let seed = 0; seed < 100; seed += 1) {
      const roller = createDiceRoller(seed);
      const result = rollBlessingOptions(roller, 3);
      const sigs = new Set<string>();
      for (const id of result) {
        const sig = blessingSignature(getBlessing(id));
        expect(sigs.has(sig)).toBe(false);
        sigs.add(sig);
      }
    }
  });

  it('dedupes by id (no blessing id appears twice in one roll)', async () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const roller = createDiceRoller(seed);
      const result = rollBlessingOptions(roller, 3);
      expect(new Set(result).size).toBe(result.length);
    }
  });

  it('ships exactly two crit-range blessings (crit tops out at +2 from blessings)', async () => {
    const { listBlessings } = await import('../../content/blessings');
    const critBlessings = listBlessings().filter((b) => {
      const m = b.modifiers;
      return (
        m.critRangeBonus !== undefined ||
        m.critRangeBonusWhileFull !== undefined ||
        m.critRangeBonusWhileBloodied !== undefined
      );
    });
    expect(critBlessings.length).toBe(2);
  });
});

describe('aggregateBlessingModifiers — max-of-individual stacking guard (PR #80/#86)', () => {
  it('post-dedup: three AC blessings use distinct levers and stack at full HP', () => {
    // De-cloned pool: helms-aegis=acBonus(sum), mystras-ward=acBonusWhileFull(max),
    // silvanus-root=acBonusWhileBloodied(max). At full HP, stacked > single because
    // distinct modifier types are intended to add together.
    const single = characterAtLevel('fighter', 5, ['helms-aegis']);
    const stacked = characterAtLevel('fighter', 5, ['helms-aegis', 'mystras-ward', 'silvanus-root']);
    expect(computeAC(stacked)).toBeGreaterThan(computeAC(single));
  });

  it('stacking 2 crit-range blessings widens the crit range beyond one (sum, not max)', () => {
    const single = characterAtLevel('fighter', 5, ['tempus-edge']);
    const stacked = characterAtLevel('fighter', 5, ['tempus-edge', 'tymoras-gambit']);
    expect(critRange(stacked).length).toBe(critRange(single).length + 1);
    expect(characterBlessingMods(stacked).critRangeBonus).toBe(2);
  });

  it('stacking 2 damage blessings yields the same damage bonus as one', () => {
    const single = characterAtLevel('rogue', 5, ['mystras-whisper']);
    const stacked = characterAtLevel('rogue', 5, ['mystras-whisper', 'silvanus-thorn']);
    expect(characterBlessingMods(stacked).damageBonus).toBe(characterBlessingMods(single).damageBonus);
  });

  it('stacking 2 holy-damage blessings yields the same holy bonus as one', () => {
    const single = characterAtLevel('fighter', 5, ['helms-bulwark']);
    const stacked = characterAtLevel('fighter', 5, ['helms-bulwark', 'lathanders-ember']);
    expect(characterBlessingMods(stacked).holyDamageBonus).toBe(characterBlessingMods(single).holyDamageBonus);
  });
});

describe('caster blessing pool — variety expansion', () => {
  it('the caster pool is meaningfully deeper than the old universal-only floor', async () => {
    const { listBlessings } = await import('../../content/blessings');
    const universalOnly = listBlessings().filter(
      (b) => !b.classRelevance || b.classRelevance.length === 0,
    ).length;
    for (const classId of ['wizard', 'druid'] as const) {
      const pool = blessingsForClass(classId);
      // Was 16 (universal-only) before this lane. The deeper pool is the fix
      // for casters cycling a tiny set fast and feeling repetitive.
      expect(pool.length).toBeGreaterThanOrEqual(25);
      expect(pool.length).toBeGreaterThan(universalOnly);
    }
  });

  it('martials never see a caster blessing on their offer pool', async () => {
    const { getBlessing } = await import('../../content/blessings');
    for (const classId of ['fighter', 'rogue', 'barbarian', 'ranger'] as const) {
      for (const b of blessingsForClass(classId)) {
        const m = getBlessing(b.id).modifiers;
        expect(m.spellDcBonus ?? m.spellDamageBonus ?? m.spellAttackBonus).toBeUndefined();
      }
    }
  });

  it('every caster blessing is mechanically live — its spell lever moves an engine value', async () => {
    const { listBlessings } = await import('../../content/blessings');
    const casterBlessings = listBlessings().filter((b) => b.classRelevance?.includes('wizard'));
    expect(casterBlessings.length).toBeGreaterThanOrEqual(8);

    const base = characterAtLevel('wizard', 5);
    for (const b of casterBlessings) {
      const m = b.modifiers;
      // Each carries at least one spell lever — assert that lever is read.
      const withIt = characterAtLevel('wizard', 5, [b.id]);
      if (m.spellDcBonus !== undefined)
        expect(spellSaveDC(withIt)).toBe(spellSaveDC(base) + m.spellDcBonus);
      if (m.spellDamageBonus !== undefined)
        expect(spellDamageBonus(withIt)).toBe(spellDamageBonus(base) + m.spellDamageBonus);
      if (m.spellAttackBonus !== undefined)
        expect(spellAttackBonus(withIt)).toBe(spellAttackBonus(base) + m.spellAttackBonus);
      const hasSpellLever =
        m.spellDcBonus !== undefined ||
        m.spellDamageBonus !== undefined ||
        m.spellAttackBonus !== undefined;
      expect(hasSpellLever).toBe(true);
    }
  });
});
