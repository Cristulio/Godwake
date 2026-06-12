import { describe, it, expect } from 'vitest';
import { consumableStockForChapter, rollGearStock, sellValue, tierForChapter } from './shopStock';
import { CONSUMABLE_CHAPTER_GATE } from '../../content/items/consumables';
import { getItem } from '../../content/items';
import { classWeaponProficient, classArmorProficient } from '../../engine/character/equip';
import { rolledItemCost } from '../../engine/items';
import type { GearRarity, Weapon, Armor } from '../../schemas/item';

const RARITY_RANK: Record<GearRarity, number> = {
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  legendary: 4,
  set: 4,
};

/**
 * The merchant stock is the run's gold sink, shared by the camp caravan and the
 * route-map merchant. Draughts are a fixed, depth-scaled list; the arms rack is
 * rolled gear. Both halves must stay obtainable (no orphaned consumable ids, no
 * class-illegal rolled bases) and scale with depth.
 */
describe('consumableStockForChapter', () => {
  it('every stocked id resolves through getItem and is a consumable (no orphans)', () => {
    for (const chapter of [1, 3, 8, 11, 14, undefined] as const) {
      for (const id of consumableStockForChapter(chapter)) {
        expect(() => getItem(id)).not.toThrow();
        expect(getItem(id).kind).toBe('consumable');
      }
    }
  });

  it('from-gated rungs grow cumulatively with depth — a deeper merchant only adds', () => {
    const fromGated = (ids: string[]) =>
      ids.filter((id) => 'from' in CONSUMABLE_CHAPTER_GATE[id]);
    let prev: string[] = [];
    for (let chapter = 1; chapter <= 14; chapter++) {
      const cur = fromGated(consumableStockForChapter(chapter));
      expect(prev.every((id) => cur.includes(id))).toBe(true);
      prev = cur;
    }
    expect(consumableStockForChapter(14).length).toBeGreaterThan(
      consumableStockForChapter(1).length,
    );
  });

  it('every consumable obeys its gate in every chapter — from-rungs enter and stay, only-rungs shelve solely in their chapters', () => {
    for (const [id, gate] of Object.entries(CONSUMABLE_CHAPTER_GATE)) {
      for (let chapter = 1; chapter <= 14; chapter++) {
        const stocked = consumableStockForChapter(chapter).includes(id);
        const expected = 'from' in gate ? chapter >= gate.from : gate.only.includes(chapter);
        expect(stocked, `${id} @ ch${chapter}`).toBe(expected);
      }
    }
  });

  it('the deep ladder gates: Superior/Elixir/Oil at Ch8+, Vigor at Ch11+', () => {
    const ch7 = consumableStockForChapter(7);
    expect(ch7).not.toContain('potion-of-superior-healing');
    expect(ch7).not.toContain('elixir-of-iron');
    expect(ch7).not.toContain('oil-of-sharpness');
    const ch8 = consumableStockForChapter(8);
    expect(ch8).toContain('potion-of-superior-healing');
    expect(ch8).toContain('elixir-of-iron');
    expect(ch8).toContain('oil-of-sharpness');
    expect(ch8).not.toContain('potion-of-vigor');
    expect(consumableStockForChapter(11)).toContain('potion-of-vigor');
  });

  it("antitoxin shelves ONLY in the poisoner chapters (3/4/10/13) — the vial on the shelf is the road's warning", () => {
    const poisonerChapters = [3, 4, 10, 13];
    for (let chapter = 1; chapter <= 14; chapter++) {
      expect(
        consumableStockForChapter(chapter).includes('antitoxin'),
        `antitoxin @ ch${chapter}`,
      ).toBe(poisonerChapters.includes(chapter));
    }
  });

  it('undefined chapter (defensive) falls back to the chapter-1 floor', () => {
    expect(consumableStockForChapter(undefined)).toEqual(consumableStockForChapter(1));
  });

  it('deeper chapters carry the dearest draught — the gold sink', () => {
    const maxCost = (ids: string[]) => Math.max(...ids.map((id) => getItem(id).cost));
    expect(maxCost(consumableStockForChapter(11))).toBeGreaterThan(
      maxCost(consumableStockForChapter(1)),
    );
  });
});

describe('tierForChapter', () => {
  it('maps chapter depth to a stock tier (1/2/3+)', () => {
    expect(tierForChapter(undefined)).toBe(1);
    expect(tierForChapter(1)).toBe(1);
    expect(tierForChapter(2)).toBe(2);
    expect(tierForChapter(3)).toBe(3);
    expect(tierForChapter(4)).toBe(3);
  });
});

describe('rollGearStock', () => {
  it('is deterministic per seed so re-renders do not reroll', () => {
    const a = rollGearStock('room-7', 2, 'fighter');
    const b = rollGearStock('room-7', 2, 'fighter');
    expect(a).toEqual(b);
  });

  it('rolls only class-legal bases (a wizard never gets martial arms or armour)', () => {
    for (const tier of [1, 2, 3] as const) {
      for (const { ref } of rollGearStock(`wiz-${tier}`, tier, 'wizard')) {
        const base = getItem(ref.itemId);
        if (base.kind === 'weapon') {
          expect(classWeaponProficient('wizard', base as Weapon)).toBe(true);
        } else if (base.kind === 'armor') {
          expect(classArmorProficient('wizard', base as Armor)).toBe(true);
        }
      }
    }
  });

  it('prices every rolled item above zero — the gold sink', () => {
    for (const { cost } of rollGearStock('priced', 3, 'fighter')) {
      expect(cost).toBeGreaterThan(0);
    }
  });

  it('stocks four pieces per visit (trimmed rack)', () => {
    expect(rollGearStock('count', 1, 'ranger')).toHaveLength(4);
  });

  it('omitting depth matches depth 0 (backward-compatible signature)', () => {
    expect(rollGearStock('d', 2, 'fighter')).toEqual(rollGearStock('d', 2, 'fighter', 0));
  });

  it('scales with depth — a deeper shop stocks strictly richer rarity', () => {
    const totalRank = (stock: ReturnType<typeof rollGearStock>) =>
      stock.reduce((sum, { ref }) => sum + RARITY_RANK[ref.rolled?.rarity ?? 'white'], 0);
    const shallow = totalRank(rollGearStock('depth', 1, 'fighter', 0));
    const deep = totalRank(rollGearStock('depth', 1, 'fighter', 8));
    expect(deep).toBeGreaterThan(shallow);
  });

  it('never promotes shop stock to legendary (those are the hub layer)', () => {
    for (const tier of [1, 2, 3] as const) {
      for (const { ref } of rollGearStock(`cap-${tier}`, tier, 'fighter', 20)) {
        expect(ref.rolled?.rarity).not.toBe('legendary');
      }
    }
  });

  it('never saturates to all-purple — lower rarities stay on the rack at any depth', () => {
    for (let chapter = 1; chapter <= 14; chapter++) {
      for (const layer of [0, 4, 12, 30]) {
        const rarities = rollGearStock(`flat-${chapter}-${layer}`, chapter, 'fighter', layer).map(
          (s) => s.ref.rolled?.rarity ?? 'white',
        );
        expect(rarities.filter((r) => r === 'purple').length).toBeLessThanOrEqual(2);
        expect(rarities.filter((r) => r !== 'purple').length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('opens the ladder at white in the early chapters', () => {
    const rarities = rollGearStock('white-floor', 1, 'fighter').map((s) => s.ref.rolled?.rarity);
    expect(rarities).toContain('white');
  });

  it('caps a monk rack at one weapon, filling the rest with accessories (no weapon spam)', () => {
    // Monks have no legal body armour, so an unforced roll falls back to a monk
    // weapon every time and the rack used to show all three. Now: ≤1 weapon, no
    // armour, the freed slots become accessories — across every depth and layer.
    for (let chapter = 1; chapter <= 14; chapter++) {
      for (const layer of [0, 3, 8]) {
        const kinds = rollGearStock(`monk-${chapter}-${layer}`, chapter, 'monk', layer).map(
          (s) => getItem(s.ref.itemId).kind,
        );
        expect(kinds.filter((k) => k === 'weapon').length).toBeLessThanOrEqual(1);
        expect(kinds.filter((k) => k === 'armor').length).toBe(0);
        expect(kinds.filter((k) => k === 'accessory').length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('leaves non-monk racks unchanged — fighters still roll armour and multi-weapon racks', () => {
    // The monk cap must not leak to other classes: a fighter keeps the unforced
    // weapon-or-armour roll, so across seeds their racks still surface armour and
    // racks carrying 2+ weapons (neither of which a capped monk rack ever shows).
    let sawArmor = false;
    let sawMultiWeapon = false;
    for (let seed = 0; seed < 40; seed++) {
      const kinds = rollGearStock(`fighter-unchanged-${seed}`, 3, 'fighter', 0).map(
        (s) => getItem(s.ref.itemId).kind,
      );
      if (kinds.includes('armor')) sawArmor = true;
      if (kinds.filter((k) => k === 'weapon').length >= 2) sawMultiWeapon = true;
    }
    expect(sawArmor).toBe(true);
    expect(sawMultiWeapon).toBe(true);
  });
});

describe('sellValue', () => {
  it('pays a positive fraction below the item value (the buy/sell spread)', () => {
    const stock = rollGearStock('sell', 3, 'fighter');
    for (const { ref } of stock) {
      const value = rolledItemCost(ref);
      const paid = sellValue(ref);
      expect(paid).toBeGreaterThanOrEqual(1);
      expect(paid).toBeLessThan(value);
    }
  });

  it('a richer item sells for more', () => {
    const [green] = rollGearStock('a', 1, 'fighter', 0);
    const dearer = rollGearStock('b', 3, 'fighter', 10).reduce((best, s) =>
      rolledItemCost(s.ref) > rolledItemCost(best.ref) ? s : best,
    );
    expect(sellValue(dearer.ref)).toBeGreaterThan(sellValue(green.ref));
  });
});
