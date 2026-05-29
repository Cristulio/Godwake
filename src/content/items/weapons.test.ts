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
