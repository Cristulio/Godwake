import { describe, it, expect } from 'vitest';
import {
  LEGENDARIES,
  LEGENDARY_ORDER,
  getLegendary,
  canEquipLegendary,
  aggregateLegendaryEffects,
  legendaryDropPool,
  legendaryBankPool,
  RELIC_SLOTS,
  RELIC_SLOT_META,
  relicsInSlot,
  relicSlotOf,
  type RelicSlot,
} from './legendaries';
import type { AffixModifiers } from '../schemas/item';
import { ascensionAscendantLoot, ASCENDANT_LOOT_FROM } from '../engine/delve/ascension';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { characterAffixMods } from '../engine/items/affixMods';

describe('legendary content', () => {
  it('has a stable id list matching the set, no duplicates', () => {
    expect(LEGENDARY_ORDER).toHaveLength(LEGENDARIES.length);
    expect(LEGENDARY_ORDER).toEqual(LEGENDARIES.map((l) => l.id));
    expect(new Set(LEGENDARY_ORDER).size).toBe(LEGENDARY_ORDER.length);
  });

  it('holds the full reliquary pool (>= 27 relics)', () => {
    expect(LEGENDARIES.length).toBeGreaterThanOrEqual(27);
  });

  it('every relic effect field is read by the modifier aggregation (no dead fields)', () => {
    for (const relic of LEGENDARIES) {
      const ch = buildPlayerCharacter(presetCreationInput('fighter'));
      ch.legendaryEffects = [relic.effects];
      const mods = characterAffixMods(ch) as unknown as Record<string, number | unknown[]>;
      for (const [key, val] of Object.entries(relic.effects)) {
        if (key === 'resist') {
          expect(mods.resists, `${relic.id}.resist not folded`).toContain(val);
        } else if (typeof val === 'number' && val !== 0) {
          expect(mods[key] as number, `${relic.id}.${key} is a dead field`).toBeGreaterThanOrEqual(
            val,
          );
        }
      }
    }
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
    expect(out.find((m) => (m.lifestealPct ?? 0) > 0)?.lifestealPct).toBe(6);
    expect(out.find((m) => (m.critRangeBonus ?? 0) > 0)?.critRangeBonus).toBe(1);
  });

  it('ignores unknown ids and returns an empty list for none', () => {
    expect(aggregateLegendaryEffects([])).toEqual([]);
    expect(aggregateLegendaryEffects(['nonexistent'])).toEqual([]);
  });

  it('legendaries are boon-only now (no class gate) and reject unknown ids', () => {
    // The class/set binding moved to set gear; every real relic equips for any class.
    expect(canEquipLegendary('heartwood-talisman', 'wizard')).toBe(true);
    expect(canEquipLegendary('heartwood-talisman', 'fighter')).toBe(true);
    expect(canEquipLegendary('nonexistent', 'fighter')).toBe(false);
  });

  it('looks relics up by id', () => {
    expect(getLegendary('bulwark-sigil')?.name).toBe('Bulwark Sigil');
    expect(getLegendary('nope')).toBeUndefined();
  });
});

describe('relic slots (the typed 9-slot loadout)', () => {
  it('assigns every relic exactly one valid slot', () => {
    for (const relic of LEGENDARIES) {
      expect(RELIC_SLOTS, `${relic.id} slot`).toContain(relic.slot);
      expect(relicSlotOf(relic.id)).toBe(relic.slot);
    }
  });

  it('fills all nine slots (none empty) and partitions the whole collection', () => {
    expect(RELIC_SLOTS).toHaveLength(9);
    for (const slot of RELIC_SLOTS) {
      expect(relicsInSlot(slot).length, `${slot} is empty`).toBeGreaterThan(0);
    }
    const summed = RELIC_SLOTS.reduce((n, s) => n + relicsInSlot(s).length, 0);
    expect(summed).toBe(LEGENDARIES.length);
  });

  it('each relic carries its slot’s defining effect channel (its primary effect)', () => {
    const channelFor: Record<RelicSlot, (e: AffixModifiers) => number> = {
      vampire: (e) => e.lifestealPct ?? 0,
      aegis: (e) => e.tempHpPerCombat ?? 0,
      precision: (e) => e.critRangeBonus ?? 0,
      rend: (e) => e.bleedDamage ?? 0,
      cascade: (e) => e.followupDamageBonus ?? 0,
      renewal: (e) => e.regenPerTurn ?? 0,
      spellpower: (e) => (e.spellDamageBonus ?? 0) + (e.spellAttackBonus ?? 0),
      spellfocus: (e) => e.spellDcBonus ?? 0,
      signature: (e) =>
        (e.rageDamageBonus ?? 0) + (e.markDamageBonus ?? 0) + (e.sneakDamageBonus ?? 0),
    };
    for (const relic of LEGENDARIES) {
      expect(
        channelFor[relic.slot](relic.effects),
        `${relic.id} lacks its ${relic.slot} channel`,
      ).toBeGreaterThan(0);
    }
  });

  it('gives every slot display copy', () => {
    for (const slot of RELIC_SLOTS) {
      expect(RELIC_SLOT_META[slot].name.length).toBeGreaterThan(0);
      expect(RELIC_SLOT_META[slot].blurb.length).toBeGreaterThan(0);
    }
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

  it('no legendary carries a set piece any more (set gear is a separate layer)', () => {
    for (const l of LEGENDARIES) {
      expect((l as unknown as Record<string, unknown>).setId).toBeUndefined();
    }
  });
});
