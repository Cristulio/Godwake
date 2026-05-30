import { AffixSchema, type Affix } from '../../schemas/item';

/**
 * The Wave-1 starter affix pool. An affix is an EFFECT (modeled like a blessing
 * modifier) that rolls onto a base item to make loot. The pool is mostly class-
 * agnostic with three class-flavoured weapon affixes gated to their owner.
 *
 * `appliesTo` keeps rolls sensible (no lifesteal on a breastplate); `classGate`
 * keeps the rage/mark/sneak affixes on their class. `namePart` weaves the
 * Diablo-style item name (prefix adjective + "of the …" suffix).
 */

// --- Weapon affixes (generic) ----------------------------------------------

const KEEN: Affix = AffixSchema.parse({
  id: 'keen',
  namePart: { kind: 'prefix', word: 'Keen' },
  effect: 'Crit range widened by 1 (crit on 19-20).',
  appliesTo: ['weapon'],
  modifiers: { critRangeBonus: 1 },
});

const CRUEL: Affix = AffixSchema.parse({
  id: 'cruel',
  namePart: { kind: 'prefix', word: 'Cruel' },
  effect: '+2 weapon damage on every hit.',
  appliesTo: ['weapon'],
  modifiers: { damageBonus: 2 },
});

const HONED: Affix = AffixSchema.parse({
  id: 'honed',
  namePart: { kind: 'prefix', word: 'Honed' },
  effect: '+1 to weapon attack rolls.',
  appliesTo: ['weapon'],
  modifiers: { attackBonus: 1 },
});

const BLOODLETTING: Affix = AffixSchema.parse({
  id: 'bloodletting',
  namePart: { kind: 'suffix', word: 'of Bloodletting' },
  effect: 'Hits bleed for +2 extra damage.',
  appliesTo: ['weapon'],
  modifiers: { bleedDamage: 2 },
});

const LEECHING: Affix = AffixSchema.parse({
  id: 'leeching',
  namePart: { kind: 'suffix', word: 'of the Leech' },
  effect: 'Heal for 25% of weapon damage dealt.',
  appliesTo: ['weapon'],
  modifiers: { lifestealPct: 25 },
});

// --- Armour affixes (generic) ----------------------------------------------

const WARDED: Affix = AffixSchema.parse({
  id: 'warded',
  namePart: { kind: 'prefix', word: 'Warded' },
  effect: '+1 AC.',
  appliesTo: ['armor'],
  modifiers: { acBonus: 1 },
});

const STONEBLOOD: Affix = AffixSchema.parse({
  id: 'stoneblood',
  namePart: { kind: 'suffix', word: 'of Stoneblood' },
  effect: '+6 temporary HP at the start of each combat.',
  appliesTo: ['armor'],
  modifiers: { tempHpPerCombat: 6 },
});

const SALAMANDER: Affix = AffixSchema.parse({
  id: 'salamander',
  namePart: { kind: 'suffix', word: 'of the Salamander' },
  effect: 'Resist fire — incoming fire damage halved.',
  appliesTo: ['armor'],
  modifiers: { resist: 'fire' },
});

const FROSTWARD: Affix = AffixSchema.parse({
  id: 'frostward',
  namePart: { kind: 'suffix', word: 'of the Frostward' },
  effect: 'Resist cold — incoming cold damage halved.',
  appliesTo: ['armor'],
  modifiers: { resist: 'cold' },
});

// --- Class-flavoured weapon affixes -----------------------------------------

const FURIOUS: Affix = AffixSchema.parse({
  id: 'furious',
  namePart: { kind: 'prefix', word: 'Furious' },
  effect: '+3 melee damage while Rage burns.',
  appliesTo: ['weapon'],
  classGate: ['barbarian'],
  modifiers: { rageDamageBonus: 3 },
});

const QUARRY: Affix = AffixSchema.parse({
  id: 'quarry',
  namePart: { kind: 'suffix', word: 'of the Quarry' },
  effect: "+2 damage against your Hunter's Mark target.",
  appliesTo: ['weapon'],
  classGate: ['ranger'],
  modifiers: { markDamageBonus: 2 },
});

const SHADOWED: Affix = AffixSchema.parse({
  id: 'shadowed',
  namePart: { kind: 'prefix', word: 'Shadowed' },
  effect: '+4 damage on the strike your Sneak Attack lands.',
  appliesTo: ['weapon'],
  classGate: ['rogue'],
  modifiers: { sneakDamageBonus: 4 },
});

// --- Accessory affixes (rings / amulets / belts / boots / helms) ------------
// Accessories are pure affix carriers, so these reuse the already-wired effect
// channels (AC, crit, lifesteal, resist, temp HP, damage, attack) — no new
// combat plumbing. Every class can roll them (no classGate).

const WARDING: Affix = AffixSchema.parse({
  id: 'warding',
  namePart: { kind: 'suffix', word: 'of Warding' },
  effect: '+1 AC.',
  appliesTo: ['accessory'],
  modifiers: { acBonus: 1 },
});

const VAMPIRIC: Affix = AffixSchema.parse({
  id: 'vampiric',
  namePart: { kind: 'prefix', word: 'Vampiric' },
  effect: 'Heal for 15% of weapon damage dealt.',
  appliesTo: ['accessory'],
  modifiers: { lifestealPct: 15 },
});

const PREDATORS: Affix = AffixSchema.parse({
  id: 'predators',
  namePart: { kind: 'suffix', word: "of the Predator" },
  effect: 'Crit range widened by 1 (crit on 19-20).',
  appliesTo: ['accessory'],
  modifiers: { critRangeBonus: 1 },
});

const EMBERWARD: Affix = AffixSchema.parse({
  id: 'emberward',
  namePart: { kind: 'suffix', word: 'of Emberward' },
  effect: 'Resist fire — incoming fire damage halved.',
  appliesTo: ['accessory'],
  modifiers: { resist: 'fire' },
});

const RIMEWARD: Affix = AffixSchema.parse({
  id: 'rimeward',
  namePart: { kind: 'suffix', word: 'of Rimeward' },
  effect: 'Resist cold — incoming cold damage halved.',
  appliesTo: ['accessory'],
  modifiers: { resist: 'cold' },
});

const VIGOROUS: Affix = AffixSchema.parse({
  id: 'vigorous',
  namePart: { kind: 'prefix', word: 'Vigorous' },
  effect: '+6 temporary HP at the start of each combat.',
  appliesTo: ['accessory'],
  modifiers: { tempHpPerCombat: 6 },
});

const SAVAGE: Affix = AffixSchema.parse({
  id: 'savage',
  namePart: { kind: 'prefix', word: 'Savage' },
  effect: '+1 weapon damage on every hit.',
  appliesTo: ['accessory'],
  modifiers: { damageBonus: 1 },
});

const UNERRING: Affix = AffixSchema.parse({
  id: 'unerring',
  namePart: { kind: 'prefix', word: 'Unerring' },
  effect: '+1 to weapon attack rolls.',
  appliesTo: ['accessory'],
  modifiers: { attackBonus: 1 },
});

export const ALL_AFFIXES: Affix[] = [
  KEEN,
  CRUEL,
  HONED,
  BLOODLETTING,
  LEECHING,
  WARDED,
  STONEBLOOD,
  SALAMANDER,
  FROSTWARD,
  FURIOUS,
  QUARRY,
  SHADOWED,
  WARDING,
  VAMPIRIC,
  PREDATORS,
  EMBERWARD,
  RIMEWARD,
  VIGOROUS,
  SAVAGE,
  UNERRING,
];

const AFFIX_BY_ID: Map<string, Affix> = new Map(ALL_AFFIXES.map((a) => [a.id, a]));

export function getAffix(id: string): Affix {
  const affix = AFFIX_BY_ID.get(id);
  if (!affix) {
    throw new Error(`Affix not found: ${id}`);
  }
  return affix;
}

export function listAffixes(): Affix[] {
  return ALL_AFFIXES;
}
