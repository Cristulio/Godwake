import { describe, it, expect } from 'vitest';
import { createDiceRoller } from '../dice';
import { getItem } from '../../content/items';
import {
  rollItem,
  eligibleAffixes,
  rolledItemName,
  rolledItemCost,
} from './rollItem';

describe('rollItem', () => {
  it('is deterministic for a given seed', () => {
    const a = rollItem(createDiceRoller('seed-1'), { rarity: 'blue', classId: 'fighter' });
    const b = rollItem(createDiceRoller('seed-1'), { rarity: 'blue', classId: 'fighter' });
    expect(a).toEqual(b);
  });

  it('rolls the affix count for each rarity', () => {
    const green = rollItem(createDiceRoller('g'), { rarity: 'green', classId: 'fighter' });
    const blue = rollItem(createDiceRoller('b'), { rarity: 'blue', classId: 'fighter' });
    expect(green.rolled?.affixes).toHaveLength(1);
    expect(blue.rolled?.affixes).toHaveLength(2);
    // Purple rolls 3 or 4.
    for (const seed of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      const purple = rollItem(createDiceRoller(seed), { rarity: 'purple', classId: 'fighter' });
      expect(purple.rolled?.affixes.length).toBeGreaterThanOrEqual(3);
      expect(purple.rolled?.affixes.length).toBeLessThanOrEqual(4);
    }
  });

  it('never rolls duplicate affixes', () => {
    for (let i = 0; i < 50; i++) {
      const ref = rollItem(createDiceRoller(`dup-${i}`), { rarity: 'purple', classId: 'barbarian' });
      const ids = ref.rolled!.affixes;
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('rolls only class-legal bases', () => {
    // A Wizard is barred from martial weapons and all armour; forcing armour
    // falls back to a (simple) weapon.
    for (let i = 0; i < 40; i++) {
      const ref = rollItem(createDiceRoller(`wiz-${i}`), {
        rarity: 'green',
        classId: 'wizard',
        kind: 'armor',
      });
      const base = getItem(ref.itemId);
      expect(base.kind).toBe('weapon');
      if (base.kind === 'weapon') expect(base.category).toBe('simple');
    }
  });

  it('itemId always equals the rolled baseId', () => {
    const ref = rollItem(createDiceRoller('x'), { rarity: 'blue', classId: 'ranger' });
    expect(ref.itemId).toBe(ref.rolled?.baseId);
  });
});

describe('eligibleAffixes — class gating', () => {
  it('keeps class-flavoured affixes off the wrong class', () => {
    const fighterWeapon = eligibleAffixes('weapon', 'fighter').map((a) => a.id);
    expect(fighterWeapon).not.toContain('furious'); // barbarian-only
    expect(fighterWeapon).not.toContain('quarry'); // ranger-only
    expect(fighterWeapon).not.toContain('shadowed'); // rogue-only
    expect(fighterWeapon).toContain('keen'); // generic

    expect(eligibleAffixes('weapon', 'barbarian').map((a) => a.id)).toContain('furious');
    expect(eligibleAffixes('weapon', 'ranger').map((a) => a.id)).toContain('quarry');
    expect(eligibleAffixes('weapon', 'rogue').map((a) => a.id)).toContain('shadowed');
  });

  it('splits affixes by base kind', () => {
    const weaponAffixes = eligibleAffixes('weapon', 'fighter').map((a) => a.id);
    const armorAffixes = eligibleAffixes('armor', 'fighter').map((a) => a.id);
    expect(weaponAffixes).toContain('cruel');
    expect(weaponAffixes).not.toContain('warded');
    expect(armorAffixes).toContain('warded');
    expect(armorAffixes).not.toContain('cruel');
  });
});

describe('rolledItemName', () => {
  it('weaves prefix and suffix around the base name', () => {
    expect(rolledItemName('Longsword', ['keen', 'leeching'])).toBe('Keen Longsword of the Leech');
    expect(rolledItemName('Longsword', ['keen'])).toBe('Keen Longsword');
    expect(rolledItemName('Longsword', ['leeching'])).toBe('Longsword of the Leech');
    expect(rolledItemName('Longsword', [])).toBe('Longsword');
  });
});

describe('rolledItemCost', () => {
  it('prices up with rarity and affix count', () => {
    const green = rollItem(createDiceRoller('c1'), { rarity: 'green', classId: 'fighter', kind: 'weapon' });
    const purple = rollItem(createDiceRoller('c2'), { rarity: 'purple', classId: 'fighter', kind: 'weapon' });
    expect(rolledItemCost(purple)).toBeGreaterThan(rolledItemCost(green));
  });

  it('a plain base ref (no rolled payload) costs its base price', () => {
    expect(rolledItemCost({ itemId: 'longsword' })).toBe(getItem('longsword').cost);
  });
});
