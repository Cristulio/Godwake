import { describe, it, expect } from 'vitest';
import { createCharacter } from './initialize';
import { presetCreationInput } from './defaultCharacter';
import { buyShopConsumables, SIM_HEAL_CARRY_CAP } from './shopPolicy';
import { getItem } from '../../content/items';
import type { Character } from '../../types/character';

function shopper(gold: number, inventory: { itemId: string }[] = []): Character {
  const base = createCharacter({ id: 'shopper-1', ...presetCreationInput('fighter') });
  return { ...base, inventory, goldInPocket: gold };
}

function heldIds(c: Character): string[] {
  return c.inventory.map((r) => r.itemId);
}

function healCount(c: Character): number {
  return c.inventory.filter((r) => {
    const item = getItem(r.itemId);
    return item.kind === 'consumable' && item.effect === 'heal';
  }).length;
}

describe('buyShopConsumables — the sim bot spends late gold on tier-appropriate stock', () => {
  it('deep chapter, rich: buys the dearest legal rungs first and one of each encounter buff', () => {
    const c = buyShopConsumables(shopper(10000), 11);
    // The dearest rung the chapter stocks leads the pocket.
    expect(heldIds(c)).toContain('potion-of-vigor');
    expect(healCount(c)).toBe(SIM_HEAL_CARRY_CAP);
    expect(heldIds(c).filter((id) => id === 'elixir-of-iron')).toHaveLength(1);
    expect(heldIds(c).filter((id) => id === 'oil-of-sharpness')).toHaveLength(1);
    // Gold was actually spent — this is the sink.
    expect(c.goldInPocket).toBeLessThan(10000);
    expect(c.goldInPocket).toBeGreaterThanOrEqual(0);
  });

  it('chapter 1: only the basic rung exists — no deep draughts, no buffs, however rich', () => {
    const c = buyShopConsumables(shopper(10000), 1);
    const bought = new Set(heldIds(c));
    expect(bought).toEqual(new Set(['potion-of-healing']));
    expect(healCount(c)).toBe(SIM_HEAL_CARRY_CAP);
  });

  it('steps down rungs as gold thins — never overdrafts', () => {
    // 500g at Ch11: one Superior (400), then basics with the remainder; the
    // 800g Vigor is out of reach and skipped, not awaited.
    const c = buyShopConsumables(shopper(500), 11);
    expect(heldIds(c)).toContain('potion-of-superior-healing');
    expect(heldIds(c)).not.toContain('potion-of-vigor');
    expect(c.goldInPocket).toBeGreaterThanOrEqual(0);
  });

  it('respects the heal carry cap — a full pocket buys no more draughts', () => {
    const full = Array.from({ length: SIM_HEAL_CARRY_CAP }, () => ({
      itemId: 'potion-of-healing',
    }));
    const c = buyShopConsumables(shopper(10000, full), 11);
    expect(healCount(c)).toBe(SIM_HEAL_CARRY_CAP);
    // The encounter buffs are still picked up — they sit outside the heal cap.
    expect(heldIds(c)).toContain('elixir-of-iron');
    expect(heldIds(c)).toContain('oil-of-sharpness');
  });

  it('holds at most ONE of each encounter buff — no dead-weight second copy', () => {
    const c = buyShopConsumables(shopper(10000, [{ itemId: 'elixir-of-iron' }]), 11);
    expect(heldIds(c).filter((id) => id === 'elixir-of-iron')).toHaveLength(1);
    expect(heldIds(c).filter((id) => id === 'oil-of-sharpness')).toHaveLength(1);
  });

  it('broke: buys nothing, gold untouched', () => {
    const c = buyShopConsumables(shopper(10), 11);
    expect(c.inventory).toHaveLength(0);
    expect(c.goldInPocket).toBe(10);
  });
});
