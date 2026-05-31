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
    // A Wizard is barred from martial weapons and from real armour; its only
    // legal "armour" is a robe, so forcing armour yields a robe (not a fallback
    // weapon), and forcing a weapon stays simple-only.
    for (let i = 0; i < 40; i++) {
      const armorRef = rollItem(createDiceRoller(`wiz-armor-${i}`), {
        rarity: 'green',
        classId: 'wizard',
        kind: 'armor',
      });
      const armorBase = getItem(armorRef.itemId);
      expect(armorBase.kind).toBe('armor');
      if (armorBase.kind === 'armor') expect(armorBase.category).toBe('robe');

      const weaponRef = rollItem(createDiceRoller(`wiz-weapon-${i}`), {
        rarity: 'green',
        classId: 'wizard',
        kind: 'weapon',
      });
      const weaponBase = getItem(weaponRef.itemId);
      expect(weaponBase.kind).toBe('weapon');
      if (weaponBase.kind === 'weapon') expect(weaponBase.category).toBe('simple');
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
    expect(eligibleAffixes('weapon', 'fighter').map((a) => a.id)).toContain('relentless');
  });

  it('gates caster affixes to the wizard', () => {
    const wizardAccessory = eligibleAffixes('accessory', 'wizard').map((a) => a.id);
    expect(wizardAccessory).toEqual(
      expect.arrayContaining(['arcane', 'archmage', 'lucid', 'runic']),
    );
    // No other class rolls them — Diablo-style off-class drops only.
    for (const classId of ['fighter', 'rogue', 'barbarian', 'ranger'] as const) {
      const ids = eligibleAffixes('accessory', classId).map((a) => a.id);
      expect(ids).not.toContain('arcane');
      expect(ids).not.toContain('runic');
    }
  });

  it('lets every class roll the new generic armour resists', () => {
    const armorAffixes = eligibleAffixes('armor', 'fighter').map((a) => a.id);
    expect(armorAffixes).toEqual(
      expect.arrayContaining(['graveward', 'antivenom', 'warded-mind', 'stalwart', 'pristine']),
    );
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
    expect(rolledItemName('Longsword', ['keen', 'mending'])).toBe('Keen Longsword of Mending');
    expect(rolledItemName('Longsword', ['keen'])).toBe('Keen Longsword');
    expect(rolledItemName('Longsword', ['mending'])).toBe('Longsword of Mending');
    expect(rolledItemName('Longsword', [])).toBe('Longsword');
  });

  it('leads the name with the +N enhancement', () => {
    expect(rolledItemName('Longsword', ['keen'], 2)).toBe('+2 Keen Longsword');
    expect(rolledItemName('Longsword', [], 3)).toBe('+3 Longsword');
    expect(rolledItemName('Longsword', ['keen'], 0)).toBe('Keen Longsword');
  });
});

describe('enhancement (+N) axis', () => {
  it('never exceeds the rarity ceiling (green ≤ +1, blue ≤ +2, purple ≤ +3)', () => {
    const caps: Record<'green' | 'blue' | 'purple', number> = { green: 1, blue: 2, purple: 3 };
    for (const [rarity, cap] of Object.entries(caps) as Array<['green' | 'blue' | 'purple', number]>) {
      for (let i = 0; i < 40; i++) {
        const ref = rollItem(createDiceRoller(`enh-${rarity}-${i}`), {
          rarity,
          classId: 'fighter',
          kind: 'weapon',
          depth: 6,
        });
        expect(ref.rolled?.enhancement ?? 0).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('respects the depth ceiling — Chapter 1 weapons never exceed +1', () => {
    for (let i = 0; i < 60; i++) {
      const ref = rollItem(createDiceRoller(`ch1-${i}`), {
        rarity: 'purple',
        classId: 'fighter',
        kind: 'weapon',
        depth: 1,
      });
      expect(ref.rolled?.enhancement ?? 0).toBeLessThanOrEqual(1);
    }
  });

  it('scales up with depth — deep loot averages a higher +N than shallow', () => {
    const totalEnh = (depth: number) => {
      let sum = 0;
      for (let i = 0; i < 80; i++) {
        const ref = rollItem(createDiceRoller(`scale-${i}`), {
          rarity: 'purple',
          classId: 'fighter',
          kind: 'weapon',
          depth,
        });
        sum += ref.rolled?.enhancement ?? 0;
      }
      return sum;
    };
    expect(totalEnh(6)).toBeGreaterThan(totalEnh(1));
  });

  it('never enhances a robe (no AC) or an accessory (pure affix carrier)', () => {
    for (let i = 0; i < 30; i++) {
      const robe = rollItem(createDiceRoller(`robe-${i}`), {
        rarity: 'purple',
        classId: 'wizard',
        kind: 'armor',
        depth: 6,
      });
      expect(robe.rolled?.enhancement ?? 0).toBe(0);
      const accessory = rollItem(createDiceRoller(`acc-${i}`), {
        rarity: 'purple',
        classId: 'fighter',
        kind: 'accessory',
        depth: 6,
      });
      expect(accessory.rolled?.enhancement ?? 0).toBe(0);
    }
  });

  it('deeper chapters surface higher base tiers more often (greatsword/greataxe)', () => {
    const bigBaseCount = (depth: number) => {
      let n = 0;
      for (let i = 0; i < 120; i++) {
        const ref = rollItem(createDiceRoller(`tier-${i}`), {
          rarity: 'green',
          classId: 'fighter',
          kind: 'weapon',
          depth,
        });
        if (ref.itemId === 'greatsword' || ref.itemId === 'greataxe') n += 1;
      }
      return n;
    };
    expect(bigBaseCount(6)).toBeGreaterThan(bigBaseCount(1));
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

  it('prices up with the +N enhancement (the deep-loot gold sink)', () => {
    const mk = (enhancement: number) => ({
      itemId: 'longsword',
      rolled: { baseId: 'longsword', rarity: 'blue' as const, affixes: [], enhancement, name: 'x' },
    });
    expect(rolledItemCost(mk(2))).toBeGreaterThan(rolledItemCost(mk(0)));
    expect(rolledItemCost(mk(3))).toBeGreaterThan(rolledItemCost(mk(2)));
  });
});
