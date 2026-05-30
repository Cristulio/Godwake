import { describe, it, expect } from 'vitest';
import { consumableStockForTier, rollGearStock, tierForChapter } from './shopStock';
import { getItem } from '../../content/items';
import { classWeaponProficient, classArmorProficient } from '../../engine/character/equip';
import type { Weapon, Armor } from '../../schemas/item';

/**
 * The merchant stock is the run's gold sink, shared by the camp caravan and the
 * route-map merchant. Draughts are a fixed, depth-scaled list; the arms rack is
 * rolled gear. Both halves must stay obtainable (no orphaned consumable ids, no
 * class-illegal rolled bases) and scale with depth.
 */
describe('consumableStockForTier', () => {
  it('every stocked id resolves through getItem and is a consumable (no orphans)', () => {
    for (const tier of [1, 2, 3, null] as const) {
      for (const id of consumableStockForTier(tier)) {
        expect(() => getItem(id)).not.toThrow();
        expect(getItem(id).kind).toBe('consumable');
      }
    }
  });

  it('stock grows with depth — deeper camps strictly add draughts, cumulatively', () => {
    const t1 = consumableStockForTier(1);
    const t2 = consumableStockForTier(2);
    const t3 = consumableStockForTier(3);
    expect(t2.length).toBeGreaterThan(t1.length);
    expect(t3.length).toBeGreaterThan(t2.length);
    expect(t1.every((id) => t2.includes(id))).toBe(true);
    expect(t2.every((id) => t3.includes(id))).toBe(true);
  });

  it('null tier (defensive) falls back to the tier-1 floor', () => {
    expect(consumableStockForTier(null)).toEqual(consumableStockForTier(1));
  });

  it('deeper camps carry the dearest draught — the gold sink', () => {
    const maxCost = (ids: string[]) => Math.max(...ids.map((id) => getItem(id).cost));
    expect(maxCost(consumableStockForTier(3))).toBeGreaterThan(maxCost(consumableStockForTier(1)));
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

  it('stocks three pieces per visit', () => {
    expect(rollGearStock('count', 1, 'ranger')).toHaveLength(3);
  });
});
