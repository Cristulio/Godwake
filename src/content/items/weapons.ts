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
  cost: 30,
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
  cost: 4,
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
  cost: 60,
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
  cost: 30,
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
  cost: 40,
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

export const MACE: Weapon = WeaponSchema.parse({
  id: 'mace',
  kind: 'weapon',
  name: 'Mace',
  category: 'simple',
  damage: '1d6',
  damageType: 'bludgeoning',
  properties: [],
  weight: 4,
  cost: 5,
  rarity: 'common',
  attunement: false,
  description:
    'A flanged head of cast iron on a short haft — no edge to dull, only weight to bring down. Strikes for 1d6 bludgeoning, and tells through a shield where a blade would skid.',
});

export const QUARTERSTAFF: Weapon = WeaponSchema.parse({
  id: 'quarterstaff',
  kind: 'weapon',
  name: 'Quarterstaff',
  category: 'simple',
  damage: '1d6',
  damageType: 'bludgeoning',
  properties: ['versatile'],
  versatileDamage: '1d8',
  weight: 4,
  cost: 3,
  rarity: 'common',
  attunement: false,
  description:
    'A length of seasoned ash, banded at both ends. Plain, balanced, quick — 1d6 bludgeoning one-handed, 1d8 gripped in both. The weapon of those who cannot be seen carrying one.',
});

export const BATTLEAXE: Weapon = WeaponSchema.parse({
  id: 'battleaxe',
  kind: 'weapon',
  name: 'Battleaxe',
  category: 'martial',
  damage: '1d8',
  damageType: 'slashing',
  properties: ['versatile'],
  versatileDamage: '1d10',
  weight: 4,
  cost: 30,
  rarity: 'common',
  attunement: false,
  description:
    'A broad single-bitted axe with a bearded edge for hooking a shield aside. 1d8 slashing one-handed, 1d10 with both hands on the haft.',
});

export const FLAIL: Weapon = WeaponSchema.parse({
  id: 'flail',
  kind: 'weapon',
  name: 'Flail',
  category: 'martial',
  damage: '1d8',
  damageType: 'bludgeoning',
  properties: [],
  weight: 2,
  cost: 25,
  rarity: 'common',
  attunement: false,
  description:
    'A spiked head chained to the haft — it whips around a raised guard and comes down where the parry is not. 1d8 bludgeoning, and difficult to turn aside.',
});

export const GREATAXE: Weapon = WeaponSchema.parse({
  id: 'greataxe',
  kind: 'weapon',
  name: 'Greataxe',
  category: 'martial',
  damage: '1d12',
  damageType: 'slashing',
  properties: ['heavy', 'two-handed'],
  weight: 7,
  cost: 30,
  rarity: 'common',
  attunement: false,
  description:
    'A single broad blade on a long haft, swung with the whole body behind it. 1d12 slashing — the heaviest single die a hand can carry, and it asks for both of them.',
});

export const JAVELIN: Weapon = WeaponSchema.parse({
  id: 'javelin',
  kind: 'weapon',
  name: 'Javelin',
  category: 'simple',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['thrown'],
  range: [30, 120],
  weight: 2,
  cost: 5,
  rarity: 'common',
  attunement: false,
  description:
    'A light throwing spear, balanced for the cast. 1d6 piercing in the hand or on the wind — the brute keeps a bundle of them for the ones who run.',
});

export const LONGBOW: Weapon = WeaponSchema.parse({
  id: 'longbow',
  kind: 'weapon',
  name: 'Longbow',
  category: 'martial',
  damage: '1d8',
  damageType: 'piercing',
  properties: ['ammunition', 'two-handed', 'heavy'],
  range: [150, 600],
  weight: 2,
  cost: 50,
  rarity: 'common',
  attunement: false,
  description:
    'A tall stave of yew, drawn to the ear. 1d8 piercing and a reach that opens a room before the enemy can close it — the patient killer\'s weapon.',
});

export const SHORTSWORD: Weapon = WeaponSchema.parse({
  id: 'shortsword',
  kind: 'weapon',
  name: 'Shortsword',
  category: 'martial',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['finesse', 'light'],
  weight: 2,
  cost: 10,
  rarity: 'common',
  attunement: false,
  description:
    'A short, broad blade for close work when the bow has no room. 1d6 piercing; finesse and light — quick to the hand of anyone caught at arm\'s length.',
});

export const HAND_CROSSBOW: Weapon = WeaponSchema.parse({
  id: 'hand-crossbow',
  kind: 'weapon',
  name: 'Hand Crossbow',
  category: 'martial',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['light', 'ammunition', 'loading'],
  range: [30, 120],
  weight: 3,
  cost: 75,
  rarity: 'common',
  attunement: false,
  description:
    'A compact crossbow built for one hand and close work — a bolt slipped in, a quick draw, a quiet shot. 1d6 piercing at range; light in the hand, but slow to crank between shots.',
});

export const ALL_WEAPONS: Weapon[] = [
  LONGSWORD,
  DAGGER,
  SHORTBOW,
  GREATSWORD,
  WARHAMMER,
  RAPIER,
  MACE,
  QUARTERSTAFF,
  BATTLEAXE,
  FLAIL,
  GREATAXE,
  JAVELIN,
  LONGBOW,
  SHORTSWORD,
  HAND_CROSSBOW,
  ADAMANTINE_SHORTSWORD,
];
