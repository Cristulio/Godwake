import { WeaponSchema, type Weapon } from '../../schemas/item';

export const LONGSWORD: Weapon = WeaponSchema.parse({
  id: 'longsword',
  kind: 'weapon',
  name: 'Longsword',
  affinity: 'fighter',
  category: 'martial',
  damage: '1d8',
  damageType: 'slashing',
  properties: ['versatile'],
  versatileDamage: '1d10',
  cost: 30,
  rarity: 'common',
});

export const DAGGER: Weapon = WeaponSchema.parse({
  id: 'dagger',
  kind: 'weapon',
  name: 'Dagger',
  affinity: 'rogue',
  attackMod: 1,
  category: 'simple',
  damage: '1d4',
  damageType: 'piercing',
  properties: ['finesse', 'light'],
  cost: 4,
  rarity: 'common',
});

export const SHORTBOW: Weapon = WeaponSchema.parse({
  id: 'shortbow',
  kind: 'weapon',
  name: 'Shortbow',
  affinity: 'ranger',
  attackMod: 2,
  category: 'simple',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['ammunition', 'two-handed'],
  range: [80, 320],
  cost: 25,
  rarity: 'common',
});

export const GREATSWORD: Weapon = WeaponSchema.parse({
  id: 'greatsword',
  kind: 'weapon',
  name: 'Greatsword',
  affinity: 'barbarian',
  category: 'martial',
  damage: '2d6',
  damageType: 'slashing',
  properties: ['heavy', 'two-handed'],
  cost: 60,
  rarity: 'common',
});

export const WARHAMMER: Weapon = WeaponSchema.parse({
  id: 'warhammer',
  kind: 'weapon',
  name: 'Warhammer',
  affinity: 'fighter',
  category: 'martial',
  damage: '1d8',
  damageType: 'bludgeoning',
  properties: ['versatile'],
  versatileDamage: '1d10',
  cost: 30,
  rarity: 'common',
});

export const RAPIER: Weapon = WeaponSchema.parse({
  id: 'rapier',
  kind: 'weapon',
  name: 'Rapier',
  affinity: 'rogue',
  category: 'martial',
  damage: '1d8',
  damageType: 'piercing',
  properties: ['finesse'],
  cost: 40,
  rarity: 'common',
});

export const MACE: Weapon = WeaponSchema.parse({
  id: 'mace',
  kind: 'weapon',
  name: 'Mace',
  affinity: 'fighter',
  category: 'simple',
  damage: '1d6',
  damageType: 'bludgeoning',
  properties: [],
  cost: 5,
  rarity: 'common',
  description:
    'A flanged head of cast iron on a short haft — no edge to dull, only weight to bring down. Strikes for 1d6 bludgeoning, and tells through a shield where a blade would skid.',
});

export const QUARTERSTAFF: Weapon = WeaponSchema.parse({
  id: 'quarterstaff',
  kind: 'weapon',
  name: 'Quarterstaff',
  affinity: 'wizard',
  category: 'simple',
  damage: '1d6',
  damageType: 'bludgeoning',
  properties: ['versatile'],
  versatileDamage: '1d8',
  cost: 3,
  rarity: 'common',
  description:
    'A length of seasoned ash, banded at both ends. Plain, balanced, quick — 1d6 bludgeoning one-handed, 1d8 gripped in both. The weapon of those who cannot be seen carrying one.',
});

export const BATTLEAXE: Weapon = WeaponSchema.parse({
  id: 'battleaxe',
  kind: 'weapon',
  name: 'Battleaxe',
  affinity: 'fighter',
  category: 'martial',
  damage: '1d8',
  damageType: 'slashing',
  properties: ['versatile'],
  versatileDamage: '1d10',
  cost: 30,
  rarity: 'common',
  description:
    'A broad single-bitted axe with a bearded edge for hooking a shield aside. 1d8 slashing one-handed, 1d10 with both hands on the haft.',
});

export const FLAIL: Weapon = WeaponSchema.parse({
  id: 'flail',
  kind: 'weapon',
  name: 'Flail',
  affinity: 'fighter',
  category: 'martial',
  damage: '1d8',
  damageType: 'bludgeoning',
  properties: [],
  cost: 25,
  rarity: 'common',
  description:
    'A spiked head chained to the haft — it whips around a raised guard and comes down where the parry is not. 1d8 bludgeoning, and difficult to turn aside.',
});

export const GREATAXE: Weapon = WeaponSchema.parse({
  id: 'greataxe',
  kind: 'weapon',
  name: 'Greataxe',
  affinity: 'barbarian',
  category: 'martial',
  damage: '1d12',
  damageType: 'slashing',
  properties: ['heavy', 'two-handed'],
  cost: 30,
  rarity: 'common',
  description:
    'A single broad blade on a long haft, swung with the whole body behind it. 1d12 slashing — the heaviest single die a hand can carry, and it asks for both of them.',
});

export const JAVELIN: Weapon = WeaponSchema.parse({
  id: 'javelin',
  kind: 'weapon',
  name: 'Javelin',
  affinity: 'barbarian',
  category: 'simple',
  damage: '1d6',
  damageType: 'piercing',
  properties: [],
  cost: 5,
  rarity: 'common',
  description:
    'A light throwing spear, balanced for the cast. 1d6 piercing in the hand or on the wind — the brute keeps a bundle of them for the ones who run.',
});

export const LONGBOW: Weapon = WeaponSchema.parse({
  id: 'longbow',
  kind: 'weapon',
  name: 'Longbow',
  affinity: 'ranger',
  damageMod: 1,
  category: 'martial',
  damage: '1d8',
  damageType: 'piercing',
  properties: ['ammunition', 'two-handed', 'heavy'],
  range: [150, 600],
  cost: 50,
  rarity: 'common',
  description:
    'A tall stave of yew, drawn to the ear. 1d8 piercing and a reach that opens a room before the enemy can close it — the patient killer\'s weapon.',
});

export const SHORTSWORD: Weapon = WeaponSchema.parse({
  id: 'shortsword',
  kind: 'weapon',
  name: 'Shortsword',
  affinity: 'rogue',
  damageMod: 1,
  category: 'martial',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['finesse', 'light'],
  cost: 10,
  rarity: 'common',
  description:
    'A short, broad blade for close work when the bow has no room. 1d6 piercing; finesse and light — quick to the hand of anyone caught at arm\'s length.',
});

export const HAND_CROSSBOW: Weapon = WeaponSchema.parse({
  id: 'hand-crossbow',
  kind: 'weapon',
  name: 'Hand Crossbow',
  affinity: 'ranger',
  attackMod: 1,
  damageMod: 1,
  category: 'martial',
  damage: '1d6',
  damageType: 'piercing',
  properties: ['light', 'ammunition', 'loading'],
  range: [30, 120],
  cost: 40,
  rarity: 'common',
  description:
    'A compact crossbow built for one hand and close work — a bolt slipped in, a quick draw, a precise shot. 1d6+1 piercing; loading means one shot per action, but each shot counts.',
});

export const SICKLE: Weapon = WeaponSchema.parse({
  id: 'sickle',
  kind: 'weapon',
  name: 'Sickle',
  affinity: 'druid',
  category: 'simple',
  damage: '1d4',
  damageType: 'slashing',
  properties: ['light'],
  cost: 4,
  rarity: 'common',
  description:
    'A short curved blade, as much a harvest tool as a weapon. 1d4 slashing — the druid keeps one to hand, though the real work is done with word and claw.',
});

// Wild Shape natural weapons — never sold or rolled (absent from the loot/shop
// pools, which draw from explicit id lists). Resolved only when the engine swaps
// the druid's attack to its beast profile. Finesse so the claw rides the druid's
// DEX rather than its dumped STR; affinity grants the matched-weapon edge.
export const BEAST_CLAWS: Weapon = WeaponSchema.parse({
  id: 'beast-claws',
  kind: 'weapon',
  name: 'Beast Claws',
  affinity: 'druid',
  attackMod: 1,
  category: 'simple',
  damage: '1d6',
  damageType: 'slashing',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'Tooth and talon — the natural arms of the borrowed form.',
});

export const DIRE_CLAWS: Weapon = WeaponSchema.parse({
  id: 'dire-claws',
  kind: 'weapon',
  name: 'Dire Claws',
  affinity: 'druid',
  attackMod: 1,
  damageMod: 2,
  category: 'martial',
  damage: '1d8',
  damageType: 'slashing',
  properties: ['finesse'],
  cost: 0,
  rarity: 'common',
  description: 'The heavier predators a Circle of the Moon druid can wear — a deeper, surer rend.',
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
  SICKLE,
  BEAST_CLAWS,
  DIRE_CLAWS,
];
