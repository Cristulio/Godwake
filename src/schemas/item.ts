import { z } from 'zod';
import { ClassIdSchema, DamageTypeSchema, RaritySchema } from './ids';

export const WeaponPropertySchema = z.enum([
  'light',
  'heavy',
  'finesse',
  'two-handed',
  'versatile',
  'reach',
  'ammunition',
  'loading',
  'special',
]);
export type WeaponProperty = z.infer<typeof WeaponPropertySchema>;

const DiceExpressionStringSchema = z
  .string()
  .regex(/^(\d+)?d(\d+)(?:\s*[+-]\s*\d+)?$/i, 'Expected dice expression like "1d8" or "2d6+3"');

export const WeaponSchema = z.object({
  id: z.string(),
  kind: z.literal('weapon'),
  name: z.string(),
  category: z.enum(['simple', 'martial']),
  damage: DiceExpressionStringSchema,
  damageType: DamageTypeSchema,
  properties: z.array(WeaponPropertySchema),
  /** Damage dice when wielded two-handed (only for versatile weapons). */
  versatileDamage: DiceExpressionStringSchema.optional(),
  /** Range in feet for ranged or thrown weapons: [normal, long]. */
  range: z.tuple([z.number(), z.number()]).optional(),
  /**
   * Class this weapon "fits". Wielded by its class it grants a small mechanical
   * affinity edge (+1 damage). Maps the catalogue across the five classes
   * (dagger→rogue, bow→ranger, greataxe→barbarian, longsword→fighter,
   * quarterstaff→wizard). Omitted = no class affinity.
   */
  affinity: ClassIdSchema.optional(),
  /**
   * Inherent to-hit modifier — the accuracy lever. The accurate weapon of a
   * redundant pair carries +N here in exchange for a smaller damage die (the
   * shortbow trades the longbow's larger die for +2 to hit).
   */
  attackMod: z.number().optional(),
  /**
   * Inherent flat damage modifier — the damage lever. The hard-hitting weapon
   * of a pair carries +N here (the longbow over the more accurate shortbow).
   */
  damageMod: z.number().optional(),
  cost: z.number(),
  rarity: RaritySchema,
  description: z.string().optional(),
});
export type Weapon = z.infer<typeof WeaponSchema>;

export const ArmorSchema = z.object({
  id: z.string(),
  kind: z.literal('armor'),
  name: z.string(),
  /**
   * `robe` is the Wizard's body-slot gear: it occupies the armour slot but does
   * NOT count as armour for AC. It grants no `baseAC` and is invisible to
   * Mage Armour's `!bodyArmor` check, so a robed wizard keeps Mage Armour's +3.
   * Its value is the rolled caster affixes it carries.
   */
  category: z.enum(['light', 'medium', 'heavy', 'shield', 'robe']),
  /** Base AC value (for shield, this is +N bonus; 0 for a robe). */
  baseAC: z.number(),
  strRequirement: z.number().optional(),
  cost: z.number(),
  rarity: RaritySchema,
  description: z.string().optional(),
});
export type Armor = z.infer<typeof ArmorSchema>;

export const ConsumableSchema = z.object({
  id: z.string(),
  kind: z.literal('consumable'),
  name: z.string(),
  /** What category of effect — drives UI grouping. */
  effect: z.enum(['heal', 'buff', 'utility']),
  /** Heal expression like "2d4+2". Only present if effect='heal'. */
  healDice: DiceExpressionStringSchema.optional(),
  /** Cost in gp when bought. */
  cost: z.number(),
  rarity: RaritySchema,
  /** Action economy required: 'action' or 'bonus'. */
  actionCost: z.enum(['action', 'bonus']),
  description: z.string().optional(),
});
export type Consumable = z.infer<typeof ConsumableSchema>;

/**
 * Accessory slots — the Wave-2 affix carriers (helm/amulet/ring/belt/boots).
 * They have no base combat stats of their own; their value is entirely in the
 * rolled affixes they carry (a ring IS its affixes). Every class can wear them
 * (no armour/weapon proficiency gate), which finally gives the Wizard gear that
 * matters.
 */
export const AccessorySlotSchema = z.enum(['helm', 'amulet', 'ring', 'belt', 'boots']);
export type AccessorySlot = z.infer<typeof AccessorySlotSchema>;

export const AccessorySchema = z.object({
  id: z.string(),
  kind: z.literal('accessory'),
  name: z.string(),
  /** Which body slot this accessory occupies. Rings fill either ring slot. */
  accessorySlot: AccessorySlotSchema,
  cost: z.number(),
  rarity: RaritySchema,
  description: z.string().optional(),
});
export type Accessory = z.infer<typeof AccessorySchema>;

export const ItemSchema = z.discriminatedUnion('kind', [
  WeaponSchema,
  ArmorSchema,
  ConsumableSchema,
  AccessorySchema,
]);
export type Item = z.infer<typeof ItemSchema>;

// ---------------------------------------------------------------------------
// Diablo-style rolled gear: a base item + rolled affixes + a gear-rarity tier.
// This is the per-instance loot model (drops/shop), distinct from the static
// D&D `RaritySchema` that classifies the base-content magic items.
// ---------------------------------------------------------------------------

/**
 * Loot rarity, by colour. Affix count climbs with rarity: white = the starting
 * kit (0 affixes), green = 1, blue = 2, purple = 3-4, legendary = unique +
 * persists (Wave 2 — the existing #175 relic system, not rolled here).
 */
export const GearRaritySchema = z.enum(['white', 'green', 'blue', 'purple', 'legendary']);
export type GearRarity = z.infer<typeof GearRaritySchema>;

/**
 * A single affix's mechanical payload — an EFFECT, modeled like a blessing's
 * modifiers so it can ride the same derived-stat / on-hit pipeline. Engine code
 * reads these where relevant (derived.ts AC/crit, playerAttack on-hit,
 * createCombat temp HP, monsterAttack incoming resist). Unset = no effect.
 */
export const AffixModifiersSchema = z
  .object({
    /** Flat bonus to AC (armour affix). */
    acBonus: z.number().optional(),
    /** Flat +N to weapon attack rolls. */
    attackBonus: z.number().optional(),
    /** Flat +N weapon damage on every hit. */
    damageBonus: z.number().optional(),
    /** Crit range widens by N (e.g. +1 → crit on 19-20). */
    critRangeBonus: z.number().optional(),
    /** Extra flat damage on every weapon hit, shown as its own "bleed" segment. */
    bleedDamage: z.number().optional(),
    /** Heal the attacker for this percent (0-100) of weapon damage dealt. */
    lifestealPct: z.number().optional(),
    /** Temp HP granted at the start of each combat (folds into the temp-HP pool). */
    tempHpPerCombat: z.number().optional(),
    /** Halve incoming damage of this type (armour affix). */
    resist: DamageTypeSchema.optional(),
    /** Conditional AC: applied only while the wearer is at full HP. */
    acBonusWhileFull: z.number().optional(),
    /** Conditional AC: applied only while the wearer is bloodied (HP at half or less). */
    acBonusWhileBloodied: z.number().optional(),
    /** Caster (Wizard): flat bonus to the spell save DC of every save spell. */
    spellDcBonus: z.number().optional(),
    /** Caster (Wizard): flat bonus to spell damage rolls. */
    spellDamageBonus: z.number().optional(),
    /** Caster (Wizard): flat bonus to spell attack rolls. */
    spellAttackBonus: z.number().optional(),
    /** Caster (Wizard): extra level-1 spell slots, added when the well refills. */
    bonusSpellSlotsL1: z.number().optional(),
    /** Class-flavoured (Barbarian): extra melee damage while Rage burns. */
    rageDamageBonus: z.number().optional(),
    /** Class-flavoured (Ranger): extra damage against the Hunter's Mark target. */
    markDamageBonus: z.number().optional(),
    /** Class-flavoured (Rogue): extra damage on the strike Sneak Attack fires. */
    sneakDamageBonus: z.number().optional(),
    /** Class-flavoured (Fighter): extra damage on each follow-up swing of a multiattack. */
    followupDamageBonus: z.number().optional(),
    /** Heal the player for this many HP at the start of each of their next 3 turns (DOT heal). */
    regenPerTurn: z.number().optional(),
  })
  .default({});
export type AffixModifiers = z.infer<typeof AffixModifiersSchema>;

export const AffixSchema = z.object({
  id: z.string(),
  /** The word/phrase woven into the rolled item's name (Diablo prefix/suffix). */
  namePart: z.object({
    kind: z.enum(['prefix', 'suffix']),
    word: z.string(),
  }),
  /** One-line, player-facing description of what the affix does. */
  effect: z.string(),
  /** Which base kinds this affix can roll onto. */
  appliesTo: z.array(z.enum(['weapon', 'armor', 'accessory'])).nonempty(),
  /**
   * Class ids this affix may roll for. Omit/empty = any class. The class-
   * flavoured affixes (rage/mark/sneak) gate to their owner so a Wizard never
   * rolls a rage blade.
   */
  classGate: z.array(ClassIdSchema).optional(),
  modifiers: AffixModifiersSchema,
});
export type Affix = z.infer<typeof AffixSchema>;

/**
 * The rolled payload that turns a base item into a loot instance. Lives inline
 * on the carrying `ItemRef` (so equipped slots carry it too) — `itemId` always
 * equals `baseId`, so `getItem` still resolves the base stats everywhere.
 */
export interface RolledItem {
  /** Base item id (weapon/armor) this was rolled from. */
  baseId: string;
  rarity: GearRarity;
  /** Affix ids rolled onto the base. */
  affixes: string[];
  /** Pre-rendered display name, e.g. "Keen Longsword of the Leech". */
  name: string;
}

/** A reference to a specific item instance carried by a character. */
export interface ItemRef {
  itemId: string;
  /** For charged items. */
  charges?: number;
  /**
   * Present for rolled loot (drops/shop). Absent = a plain base item (the
   * starting kit / static content), treated as white rarity with no affixes.
   */
  rolled?: RolledItem;
}
