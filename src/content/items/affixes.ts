import { AffixSchema, type Affix } from '../../schemas/item';
import { FULL_CASTER_CLASS_IDS } from '../../schemas/ids';

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
  effect: 'Hits apply bleeding: deal 2 damage at the start of your next 3 turns.',
  appliesTo: ['weapon'],
  modifiers: { bleedDamage: 2 },
});

const MENDING: Affix = AffixSchema.parse({
  id: 'mending',
  namePart: { kind: 'suffix', word: 'of Mending' },
  effect: 'Hits trigger mending: heal 4 HP at the start of your next 3 turns.',
  appliesTo: ['weapon'],
  modifiers: { regenPerTurn: 4 },
});

// Lifesteal lives on the WEAPON — the blade that drinks. Accessory lifesteal
// (LEECHING, below) is the lesser trickle. Both heal a % of the weapon damage
// dealt (playerAttack.ts), so the only thing the slot changes is the magnitude.
const VAMPIRIC: Affix = AffixSchema.parse({
  id: 'vampiric',
  namePart: { kind: 'prefix', word: 'Vampiric' },
  effect: 'Heal for 5% of weapon damage dealt.',
  appliesTo: ['weapon'],
  modifiers: { lifestealPct: 5 },
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

// --- Armour affixes (Wave-3 breadth: more resists + conditional guard) -------
// Resists name damage types enemies actually deal (necrotic/poison/psychic),
// so none are flavour-only. Conditional AC rides the same full-HP / bloodied
// triggers the blessing system already reads in computeAC.

const GRAVEWARD: Affix = AffixSchema.parse({
  id: 'graveward',
  namePart: { kind: 'suffix', word: 'of the Graveward' },
  effect: 'Resist necrotic — incoming necrotic damage halved.',
  appliesTo: ['armor', 'accessory'],
  modifiers: { resist: 'necrotic' },
});

const ANTIVENOM: Affix = AffixSchema.parse({
  id: 'antivenom',
  namePart: { kind: 'suffix', word: 'of the Antivenom' },
  effect: 'Resist poison — incoming poison damage halved.',
  appliesTo: ['armor', 'accessory'],
  modifiers: { resist: 'poison' },
});

const WARDED_MIND: Affix = AffixSchema.parse({
  id: 'warded-mind',
  namePart: { kind: 'suffix', word: 'of the Warded Mind' },
  effect: 'Resist psychic — incoming psychic damage halved.',
  appliesTo: ['armor', 'accessory'],
  modifiers: { resist: 'psychic' },
});

const STALWART: Affix = AffixSchema.parse({
  id: 'stalwart',
  namePart: { kind: 'prefix', word: 'Stalwart' },
  effect: '+2 AC while bloodied (HP at half or less).',
  appliesTo: ['armor', 'accessory'],
  modifiers: { acBonusWhileBloodied: 2 },
});

const PRISTINE: Affix = AffixSchema.parse({
  id: 'pristine',
  namePart: { kind: 'prefix', word: 'Pristine' },
  effect: '+1 AC while at full HP.',
  appliesTo: ['armor', 'accessory'],
  modifiers: { acBonusWhileFull: 1 },
});

// --- Caster-flavoured affixes -----------------------------------------------
// The utility pair (ARCANE spell-DC / RUNIC slots) rides any of the wizard's
// gear: simple weapons (staff/dagger), accessories, and robes (the body-slot
// caster gear — `armor` kind, wizard-gated). Class-gated so a fighter never
// rolls a spell-DC staff or sees a robe (off-class drops, Diablo-style).
//
// The spell-OFFENSE trio (ARCHMAGE spell damage / LUCID spell attack /
// SOULTHIRST spell vamp) gates harder, all three the same way: full casters
// only (wizard/druid/bard) AND caster bases only (`casterGearOnly` — the War
// Lute, orbs, robes). Never on ordinary arms, and never wizard-locked away
// from the druid's or bard's orb.

const ARCANE: Affix = AffixSchema.parse({
  id: 'arcane',
  namePart: { kind: 'prefix', word: 'Arcane' },
  effect: '+1 to your spell save DC.',
  appliesTo: ['weapon', 'armor', 'accessory'],
  classGate: ['wizard'],
  modifiers: { spellDcBonus: 1 },
});

const ARCHMAGE: Affix = AffixSchema.parse({
  id: 'archmage',
  namePart: { kind: 'suffix', word: 'of the Archmage' },
  effect: '+2 spell damage.',
  appliesTo: ['weapon', 'armor'],
  classGate: [...FULL_CASTER_CLASS_IDS],
  casterGearOnly: true,
  modifiers: { spellDamageBonus: 2 },
});

const LUCID: Affix = AffixSchema.parse({
  id: 'lucid',
  namePart: { kind: 'suffix', word: 'of Lucidity' },
  effect: '+1 to spell attack rolls.',
  appliesTo: ['weapon', 'armor'],
  classGate: [...FULL_CASTER_CLASS_IDS],
  casterGearOnly: true,
  modifiers: { spellAttackBonus: 1 },
});

// The spell-side Vampiric: every cast drinks a sliver of the damage it dealt.
// The % is PROVISIONAL (spells hit harder and wider than weapon swings, so it
// sits under Vampiric's 5%); the heal itself applies once per cast in the
// castSpell dispatch seam.
const SOULTHIRST: Affix = AffixSchema.parse({
  id: 'soulthirst',
  namePart: { kind: 'prefix', word: 'Soulthirst' },
  effect: 'Spells heal you for 4% of the damage they deal.',
  appliesTo: ['weapon', 'armor'],
  classGate: [...FULL_CASTER_CLASS_IDS],
  casterGearOnly: true,
  modifiers: { spellLifestealPct: 4 },
});

const RUNIC: Affix = AffixSchema.parse({
  id: 'runic',
  namePart: { kind: 'prefix', word: 'Runic' },
  effect: '+1 level-1 spell slot (refills on rest).',
  appliesTo: ['weapon', 'armor', 'accessory'],
  classGate: ['wizard'],
  modifiers: { bonusSpellSlotsL1: 1 },
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

const RELENTLESS: Affix = AffixSchema.parse({
  id: 'relentless',
  namePart: { kind: 'prefix', word: 'Relentless' },
  effect: '+3 damage on each follow-up swing of your Extra Attack.',
  appliesTo: ['weapon'],
  classGate: ['fighter'],
  modifiers: { followupDamageBonus: 3 },
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

const LEECHING: Affix = AffixSchema.parse({
  id: 'leeching',
  namePart: { kind: 'prefix', word: 'Leeching' },
  effect: 'Heal for 3% of weapon damage dealt.',
  appliesTo: ['accessory'],
  modifiers: { lifestealPct: 3 },
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

// Dual-wield reward: dead weight unless you fight with two weapons (the off-hand
// follow-swing is the only thing it touches). The build-defining accessory for a
// dual-wielder — and the affix-relevance tagging dims it for everyone else.
const PAIRED: Affix = AffixSchema.parse({
  id: 'paired',
  namePart: { kind: 'suffix', word: 'of the Twin Blade' },
  effect: '+3 damage on each off-hand swing (dual wield only).',
  appliesTo: ['accessory'],
  modifiers: { offHandDamageBonus: 3 },
});

export const ALL_AFFIXES: Affix[] = [
  KEEN,
  CRUEL,
  HONED,
  BLOODLETTING,
  MENDING,
  VAMPIRIC,
  WARDED,
  STONEBLOOD,
  SALAMANDER,
  FROSTWARD,
  GRAVEWARD,
  ANTIVENOM,
  WARDED_MIND,
  STALWART,
  PRISTINE,
  ARCANE,
  ARCHMAGE,
  LUCID,
  SOULTHIRST,
  RUNIC,
  FURIOUS,
  QUARRY,
  SHADOWED,
  RELENTLESS,
  WARDING,
  LEECHING,
  PREDATORS,
  EMBERWARD,
  RIMEWARD,
  VIGOROUS,
  SAVAGE,
  UNERRING,
  PAIRED,
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
