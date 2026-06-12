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
// the druid's attack to its beast profile (beastWeaponId picks the level tier,
// mirroring the monk's martialArtsWeaponId ladder). `casterWeapon` is the
// load-bearing flag: the claw attacks AND damages off the druid's WISDOM
// (spellcasting mod, read in playerAttack) — the borrowed body fights with the
// druid's communion with the wild, not the caster's dumped STR/DEX. Affinity
// grants the matched-weapon edge. The claw is the beast form's whole offense,
// so each tier must out-bite the simple arms the druid drops to wear it.
// Dice/mods are PROVISIONAL martial-beast numbers — the end-of-campaign sim
// batch calibrates them against the druid band.
export const BEAST_CLAWS: Weapon = WeaponSchema.parse({
  id: 'beast-claws',
  kind: 'weapon',
  name: 'Beast Claws',
  affinity: 'druid',
  casterWeapon: true,
  attackMod: 1,
  damageMod: 1,
  category: 'simple',
  damage: '1d8',
  damageType: 'slashing',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'Tooth and talon — the natural arms of the borrowed form.',
});

export const BEAST_CLAWS_ELDER: Weapon = WeaponSchema.parse({
  id: 'beast-claws-elder',
  kind: 'weapon',
  name: 'Elder Claws',
  affinity: 'druid',
  casterWeapon: true,
  attackMod: 1,
  damageMod: 2,
  category: 'simple',
  damage: '1d10',
  damageType: 'slashing',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'The old forest answers a deeper call — heavier shapes, longer reach, a surer rend.',
});

export const BEAST_CLAWS_PRIMAL: Weapon = WeaponSchema.parse({
  id: 'beast-claws-primal',
  kind: 'weapon',
  name: 'Primal Claws',
  affinity: 'druid',
  casterWeapon: true,
  attackMod: 1,
  damageMod: 3,
  category: 'simple',
  damage: '2d6',
  damageType: 'slashing',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'The first beasts, remembered in tooth and sinew — the wild as it was before names.',
});

export const DIRE_CLAWS: Weapon = WeaponSchema.parse({
  id: 'dire-claws',
  kind: 'weapon',
  name: 'Dire Claws',
  affinity: 'druid',
  casterWeapon: true,
  attackMod: 1,
  damageMod: 3,
  category: 'martial',
  damage: '1d10',
  damageType: 'slashing',
  properties: ['finesse'],
  cost: 0,
  rarity: 'common',
  description: 'The heavier predators a Circle of the Moon druid can wear — a deeper, surer rend.',
});

export const DIRE_CLAWS_SAVAGE: Weapon = WeaponSchema.parse({
  id: 'dire-claws-savage',
  kind: 'weapon',
  name: 'Savage Claws',
  affinity: 'druid',
  casterWeapon: true,
  attackMod: 1,
  damageMod: 4,
  category: 'martial',
  damage: '2d6',
  damageType: 'slashing',
  properties: ['finesse'],
  cost: 0,
  rarity: 'common',
  description: 'The moon-circle’s deeper shapes — apex hunters that take the throat, not the flank.',
});

export const DIRE_CLAWS_APEX: Weapon = WeaponSchema.parse({
  id: 'dire-claws-apex',
  kind: 'weapon',
  name: 'Apex Claws',
  affinity: 'druid',
  casterWeapon: true,
  attackMod: 1,
  damageMod: 5,
  category: 'martial',
  damage: '2d8',
  damageType: 'slashing',
  properties: ['finesse'],
  cost: 0,
  rarity: 'common',
  description: 'Nothing in the old forest hunted these — the last shape the moon shows a druid.',
});

// Shape Change dragon claws — never sold or rolled (absent from the loot/shop
// pools, which draw from explicit id lists). Resolved only when the engine swaps
// the wizard's attack to its dragon profile. `casterWeapon` makes the claw
// attack AND damage off the wizard's INTELLIGENCE (spellcasting mod, read in
// playerAttack) — the dragon strikes with the will that shaped it, not the
// wizard's dumped STR. The +3 to-hit / +3 damage that make the claws "hit like
// a +3 enchanted weapon" are applied in playerAttack (gated on isDragonForm),
// NOT baked here. The 3d8 rend is a PROVISIONAL martial-beast number (a L17+
// capstone claw threatening elite-weapon damage per swing, three swings per
// Attack) — the end-of-campaign sim batch calibrates it.
export const DRAGON_CLAWS: Weapon = WeaponSchema.parse({
  id: 'dragon-claws',
  kind: 'weapon',
  name: 'Dragon Claws',
  affinity: 'wizard',
  casterWeapon: true,
  category: 'martial',
  damage: '3d8',
  damageType: 'slashing',
  properties: [],
  cost: 0,
  rarity: 'common',
  description: 'Talons the length of swords — the natural arms of the dragon you have become.',
});

// Monk Martial Arts fists — never sold or rolled (absent from loot/shop pools,
// which draw from explicit id lists). The engine swaps the monk's attack to the
// level-appropriate die via martialArtsWeaponId. Finesse so the strike rides the
// monk's DEX; affinity grants the matched edge. The die grows with the school:
// d6 → d8 (L5) → d10 (L11) → d12 (L17).
export const MONK_FISTS: Weapon = WeaponSchema.parse({
  id: 'monk-fists',
  kind: 'weapon',
  name: 'Fists',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d6',
  damageType: 'bludgeoning',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'The empty hand — the monk’s only weapon, and the one that never leaves.',
});

export const MONK_FISTS_ADEPT: Weapon = WeaponSchema.parse({
  id: 'monk-fists-adept',
  kind: 'weapon',
  name: 'Fists',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d8',
  damageType: 'bludgeoning',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'Strikes honed past a novice’s — the form deepening into the body.',
});

export const MONK_FISTS_MASTER: Weapon = WeaponSchema.parse({
  id: 'monk-fists-master',
  kind: 'weapon',
  name: 'Fists',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d10',
  damageType: 'bludgeoning',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'A master’s hands — bone and discipline that crack a guard like kindling.',
});

export const MONK_FISTS_GRANDMASTER: Weapon = WeaponSchema.parse({
  id: 'monk-fists-grandmaster',
  kind: 'weapon',
  name: 'Fists',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d12',
  damageType: 'bludgeoning',
  properties: ['finesse', 'light'],
  cost: 0,
  rarity: 'common',
  description: 'The body perfected into a weapon — every strike a falling beam.',
});

// Bespoke monk arms — themed weapons that COUNT AS UNARMED (monkWeapon). Wielding
// one keeps the full kit and the unarmed damage edge while letting the monk carry
// rolled affixes + a +N enhancement on the main-hand (the per-hit gear a bare-
// handed striker otherwise has no slot for). The strike still rides the level-
// scaled Martial Arts die, not the listed damage — these dice are the off-the-
// rack fallback for any non-monk who somehow swings one. Rollable monk loot.
export const MONK_WAR_STAFF: Weapon = WeaponSchema.parse({
  id: 'monk-war-staff',
  kind: 'weapon',
  name: 'War Staff',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d6',
  versatileDamage: '1d8',
  damageType: 'bludgeoning',
  properties: ['finesse', 'versatile'],
  cost: 30,
  rarity: 'common',
  description: 'A hardwood staff spun in the forms — an extension of the empty hand, not a crutch for it.',
});

export const MONK_PAIRED_KAMA: Weapon = WeaponSchema.parse({
  id: 'monk-paired-kama',
  kind: 'weapon',
  name: 'Paired Kama',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d4',
  damageType: 'slashing',
  properties: ['finesse', 'light'],
  cost: 30,
  rarity: 'common',
  description: 'Twin short blades that flow with the flurry — they cut where a fist would only bruise.',
});

export const MONK_TEMPLE_GLAIVE: Weapon = WeaponSchema.parse({
  id: 'monk-temple-glaive',
  kind: 'weapon',
  name: 'Temple Glaive',
  affinity: 'monk',
  monkWeapon: true,
  category: 'simple',
  damage: '1d6',
  damageType: 'slashing',
  properties: ['finesse', 'reach'],
  cost: 35,
  rarity: 'common',
  description: 'A reaching haft the gate-guardians drilled with — distance folded into the form.',
});

// The Bard's War Lute — a CHA caster-weapon. Its attack AND damage scale off the
// bard's spellcasting (Charisma) modifier rather than STR/DEX (the `casterWeapon`
// flag, read in playerAttack), striking with resonant thunder. The "wand" the
// caster-leaning Lore bard fights with — one-handed, leaving the off-hand free
// for a caster orb. Affinity grants the matched-weapon edge in a bard's hands.
export const WAR_LUTE: Weapon = WeaponSchema.parse({
  id: 'war-lute',
  kind: 'weapon',
  name: 'War Lute',
  affinity: 'bard',
  casterWeapon: true,
  category: 'simple',
  damage: '1d8',
  damageType: 'thunder',
  properties: [],
  cost: 40,
  rarity: 'common',
  description:
    'A heavy-strung lute braced like a weapon — every chord a struck blow. It rings with thunder shaped by the player’s own presence, scaling on Charisma the way a wand scales on a wizard’s wit. The caster-bard’s arm.',
});

export const ALL_WEAPONS: Weapon[] = [
  LONGSWORD,
  WAR_LUTE,
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
  BEAST_CLAWS_ELDER,
  BEAST_CLAWS_PRIMAL,
  DIRE_CLAWS,
  DIRE_CLAWS_SAVAGE,
  DIRE_CLAWS_APEX,
  DRAGON_CLAWS,
  MONK_FISTS,
  MONK_FISTS_ADEPT,
  MONK_FISTS_MASTER,
  MONK_FISTS_GRANDMASTER,
  MONK_WAR_STAFF,
  MONK_PAIRED_KAMA,
  MONK_TEMPLE_GLAIVE,
];
