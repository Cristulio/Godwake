import { WeaponSchema, type Weapon } from '../../schemas/item';

export const LONGSWORD: Weapon = WeaponSchema.parse({
  id: 'longsword',
  kind: 'weapon',
  name: 'Longsword',
  category: 'martial',
  damage: '1d8',
  damageType: 'slashing',
  properties: ['versatile'],
  versatileDamage: '1d10',
  weight: 3,
  cost: 15,
  rarity: 'common',
  attunement: false,
});

export const DAGGER: Weapon = WeaponSchema.parse({
  id: 'dagger',
  kind: 'weapon',
  name: 'Dagger',
  category: 'simple',
  damage: '1d4',
  damageType: 'piercing',
  properties: ['finesse', 'light', 'thrown'],
  range: [20, 60],
  weight: 1,
  cost: 2,
  rarity: 'common',
  attunement: false,
});

export const SHORTBOW: Weapon = WeaponSchema.parse({
  id: 'shortbow',
  kind: 'weapon',
  name: 'Shortbow',
  category: 'simple',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['ammunition', 'two-handed'],
  range: [80, 320],
  weight: 2,
  cost: 25,
  rarity: 'common',
  attunement: false,
});

export const ALL_WEAPONS: Weapon[] = [LONGSWORD, DAGGER, SHORTBOW];
