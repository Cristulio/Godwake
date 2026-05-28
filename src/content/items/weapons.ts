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

export const GREATSWORD: Weapon = WeaponSchema.parse({
  id: 'greatsword',
  kind: 'weapon',
  name: 'Greatsword',
  category: 'martial',
  damage: '2d6',
  damageType: 'slashing',
  properties: ['heavy', 'two-handed'],
  weight: 6,
  cost: 50,
  rarity: 'common',
  attunement: false,
});

export const WARHAMMER: Weapon = WeaponSchema.parse({
  id: 'warhammer',
  kind: 'weapon',
  name: 'Warhammer',
  category: 'martial',
  damage: '1d8',
  damageType: 'bludgeoning',
  properties: ['versatile'],
  versatileDamage: '1d10',
  weight: 2,
  cost: 15,
  rarity: 'common',
  attunement: false,
});

export const RAPIER: Weapon = WeaponSchema.parse({
  id: 'rapier',
  kind: 'weapon',
  name: 'Rapier',
  category: 'martial',
  damage: '1d8',
  damageType: 'piercing',
  properties: ['finesse'],
  weight: 2,
  cost: 25,
  rarity: 'common',
  attunement: false,
});

export const ADAMANTINE_SHORTSWORD: Weapon = WeaponSchema.parse({
  id: 'adamantine-shortsword',
  kind: 'weapon',
  name: 'Adamantine Shortsword',
  category: 'martial',
  damage: '1d6+1',
  damageType: 'piercing',
  properties: ['finesse', 'light'],
  weight: 2,
  cost: 320,
  rarity: 'uncommon',
  attunement: true,
  description:
    'A short, dark-grey blade with a faint blue undertone where the lamplight catches the edge. Adamantine — does not chip, does not dull, and the +1 is not a smith\'s boast, it is the alloy. Strikes for 1d6+1 piercing; finesse and light. Soul-bound — claims an attunement slot.',
});

export const ALL_WEAPONS: Weapon[] = [
  LONGSWORD,
  DAGGER,
  SHORTBOW,
  GREATSWORD,
  WARHAMMER,
  RAPIER,
  ADAMANTINE_SHORTSWORD,
];
