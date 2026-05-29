import { describe, it, expect } from 'vitest';
import { ALL_WEAPONS } from './weapons';
import { getItem } from './index';
import type { Weapon } from '../../schemas/item';

describe('weapons — new caravan stock', () => {
  const NEW_IDS = ['mace', 'quarterstaff', 'battleaxe', 'flail', 'hand-crossbow'];

  it.each(NEW_IDS)('%s is registered and resolves through getItem', (id) => {
    const item = getItem(id) as Weapon;
    expect(item.kind).toBe('weapon');
    expect(ALL_WEAPONS.some((w) => w.id === id)).toBe(true);
  });

  it('each new weapon has a distinct damage / property profile', () => {
    const profiles = NEW_IDS.map((id) => {
      const w = getItem(id) as Weapon;
      return `${w.damage}|${w.damageType}|${w.versatileDamage ?? '-'}|${w.properties.join(',')}`;
    });
    expect(new Set(profiles).size).toBe(NEW_IDS.length);
  });

  it('weapon ids are unique across the catalogue', () => {
    const ids = ALL_WEAPONS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('weapons — prices track power', () => {
  const cost = (id: string) => (getItem(id) as Weapon).cost;

  it('cheap simple sidearms are the floor (under 10gp)', () => {
    for (const id of ['dagger', 'quarterstaff', 'mace']) {
      expect(cost(id)).toBeLessThan(10);
    }
  });

  it('martial weapons cost more than the cheap simple ones (the old 10gp battleaxe/flail bug)', () => {
    const cheapSimpleMax = Math.max(cost('mace'), cost('quarterstaff'), cost('dagger'));
    for (const id of ['battleaxe', 'flail', 'longsword', 'warhammer', 'rapier', 'greatsword']) {
      expect(cost(id)).toBeGreaterThan(cheapSimpleMax);
    }
  });

  it('the two-handed greatsword is the dearest common melee weapon', () => {
    const meleeCommon = ['longsword', 'warhammer', 'rapier', 'battleaxe', 'flail', 'mace', 'quarterstaff'];
    for (const id of meleeCommon) {
      expect(cost('greatsword')).toBeGreaterThanOrEqual(cost(id));
    }
  });
});
