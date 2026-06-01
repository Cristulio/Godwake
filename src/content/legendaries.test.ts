import { describe, it, expect } from 'vitest';
import {
  LEGENDARIES,
  LEGENDARY_ORDER,
  getLegendary,
  canEquipLegendary,
  aggregateLegendaryEffects,
  legendaryDropPool,
  legendaryBankPool,
} from './legendaries';
import { ascensionAscendantLoot, ASCENDANT_LOOT_FROM } from '../engine/delve/ascension';

describe('legendary content', () => {
  it('has a stable id list matching the set, no duplicates', () => {
    expect(LEGENDARY_ORDER).toHaveLength(LEGENDARIES.length);
    expect(LEGENDARY_ORDER).toEqual(LEGENDARIES.map((l) => l.id));
    expect(new Set(LEGENDARY_ORDER).size).toBe(LEGENDARY_ORDER.length);
  });

  it('every relic is EFFECT-ONLY (no AC, no weapon damage) yet carries a real effect', () => {
    for (const relic of LEGENDARIES) {
      const e = relic.effects;
      expect(e.acBonus ?? 0, `${relic.id} grants flat AC`).toBe(0);
      expect(e.acBonusWhileFull ?? 0, `${relic.id} grants conditional AC`).toBe(0);
      expect(e.acBonusWhileBloodied ?? 0, `${relic.id} grants conditional AC`).toBe(0);
      expect(e.attackBonus ?? 0, `${relic.id} grants weapon attack`).toBe(0);
      expect(e.damageBonus ?? 0, `${relic.id} grants flat weapon damage`).toBe(0);
      const hasEffect =
        Object.values(e).some((v) => typeof v === 'number' && v !== 0) || !!e.resist;
      expect(hasEffect, `${relic.id} has no mechanical effect`).toBe(true);
      expect(relic.effect.length).toBeGreaterThan(0);
    }
  });

  it('aggregates relic effects into a flat payload list', () => {
    const out = aggregateLegendaryEffects(['heartwood-talisman', 'cloak-of-the-nightwind']);
    // Two relics, no completed set → two entries.
    expect(out).toHaveLength(2);
    expect(out.find((m) => (m.lifestealPct ?? 0) > 0)?.lifestealPct).toBe(12);
    expect(out.find((m) => (m.critRangeBonus ?? 0) > 0)?.critRangeBonus).toBe(1);
  });

  it('folds completed-set bonuses into the aggregate', () => {
    // Full Vigil set: 3 relic effects + 2 met set tiers (2-piece, 3-piece).
    const out = aggregateLegendaryEffects(['vigil-helm', 'vigil-mantle', 'vigil-heart']);
    expect(out).toHaveLength(5);
  });

  it('ignores unknown ids and returns an empty list for none', () => {
    expect(aggregateLegendaryEffects([])).toEqual([]);
    expect(aggregateLegendaryEffects(['nonexistent'])).toEqual([]);
  });

  it('gates class-bound relics to their class for equipping', () => {
    expect(canEquipLegendary('warsong-gauntlet', 'fighter')).toBe(true);
    expect(canEquipLegendary('warsong-gauntlet', 'wizard')).toBe(false);
    expect(canEquipLegendary('vigil-helm', 'wizard')).toBe(true);
    expect(canEquipLegendary('nonexistent', 'fighter')).toBe(false);
  });

  it('looks relics up by id', () => {
    expect(getLegendary('bulwark-sigil')?.name).toBe('Bulwark Sigil');
    expect(getLegendary('nope')).toBeUndefined();
  });
});

describe('ascendant legendary tier (Ascension >= 3 gate)', () => {
  const ascendantIds = LEGENDARIES.filter((l) => l.ascendant).map((l) => l.id);

  it('defines a non-empty apex tier, all flagged ascendant', () => {
    expect(ascendantIds.length).toBeGreaterThanOrEqual(3);
    for (const id of ascendantIds) {
      expect(getLegendary(id)?.ascendant).toBe(true);
    }
  });

  it('the bank (elite-drop) pool excludes the ascendant tier below Asc 3 and includes it at/above', () => {
    const belowLevels = [0, ASCENDANT_LOOT_FROM - 1];
    for (const lvl of belowLevels) {
      const pool = legendaryBankPool(ascensionAscendantLoot(lvl));
      for (const id of ascendantIds) expect(pool).not.toContain(id);
    }
    const atOrAbove = [ASCENDANT_LOOT_FROM, ASCENDANT_LOOT_FROM + 1];
    for (const lvl of atOrAbove) {
      const pool = legendaryBankPool(ascensionAscendantLoot(lvl));
      for (const id of ascendantIds) expect(pool).toContain(id);
    }
  });

  it('the class offer (reliquary) pool excludes the ascendant tier below Asc 3 and includes it at/above', () => {
    const below = legendaryDropPool('fighter', ascensionAscendantLoot(ASCENDANT_LOOT_FROM - 1));
    for (const id of ascendantIds) expect(below).not.toContain(id);
    const at = legendaryDropPool('fighter', ascensionAscendantLoot(ASCENDANT_LOOT_FROM));
    for (const id of ascendantIds) expect(at).toContain(id);
  });
});
