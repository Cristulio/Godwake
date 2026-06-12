import type { DiceRoller } from '../dice';
import { parseDiceExpression } from '../dice';
import type { ClassId } from '../../schemas/ids';
import type { Affix, GearRarity, ItemRef, Weapon, Armor, Accessory } from '../../schemas/item';
import { getItem, getAffix, listAffixes } from '../../content/items';
import { ORB_BASE_IDS } from '../../content/items/setBases';
import { classWeaponProficient, classArmorProficient } from '../character/equip';

export type BaseKind = 'weapon' | 'armor' | 'accessory';

/**
 * Curated base pools for rolled loot — the plain white bases the affix roll
 * builds on. (The old static "magic items" are gone; affixes replace them.)
 */
export const WEAPON_BASE_IDS = [
  'dagger',
  'shortsword',
  'rapier',
  'longsword',
  'warhammer',
  'battleaxe',
  'flail',
  'mace',
  'quarterstaff',
  'greatsword',
  'greataxe',
  'shortbow',
  'longbow',
  'hand-crossbow',
  'javelin',
] as const;

/**
 * Themed monk weapons — the arms that KEEP the Ki kit (Flurry / Stunning Strike /
 * stances) while swinging their own die, affixes, and enhancement in place of the
 * Martial Arts die + unarmed edge. They carry the per-hit gear rolls a bare-handed
 * striker has no main-hand slot for. A monk's rolled weapon loot draws from these
 * alone (the generic rack above would still the kit entirely); no other class
 * ever rolls one.
 */
export const MONK_WEAPON_BASE_IDS = [
  'monk-war-staff',
  'monk-paired-kama',
  'monk-temple-glaive',
] as const;

/**
 * The Bard's bespoke arm — the CHA caster-weapon. Appended to the generic rack
 * for a bard alone (the War Lute scales off Charisma, useless to anyone else), so
 * a bard's weapon loot can roll the instrument the caster build wants alongside
 * the finesse blades it shares with the rogue.
 */
export const BARD_WEAPON_BASE_IDS = ['war-lute'] as const;

export const ARMOR_BASE_IDS = [
  'padded-armor',
  'leather-armor',
  'studded-leather',
  'hide-armor',
  'scale-mail',
  'breastplate',
  'half-plate',
  'ring-mail',
  'chain-mail',
  'splint-armor',
  'plate-armor',
  'shield',
  // Robes share the armour kind/slot but gate to the Wizard alone, so a wizard
  // rolling "armour" only ever finds these (real armour is filtered out by
  // proficiency) and the martials never see one.
  'apprentice-robe',
  'silk-robe',
  'spellweave-robe',
  'archmagus-vestments',
] as const;

/** Accessory bases — class-agnostic affix carriers (helm/amulet/ring/belt/boots). */
export const ACCESSORY_BASE_IDS = [
  'iron-ring',
  'silver-ring',
  'gold-ring',
  'jade-amulet',
  'bone-charm',
  'worn-belt',
  'studded-girdle',
  'traveler-boots',
  'soft-boots',
  'iron-helm',
  'leather-cap',
] as const;

/** Affix count by rarity: white 0, green 1, blue 2, purple 3. Legendary is the
 * hub layer (Wave 2); treat as 4 if one is ever rolled through here. */
const AFFIX_COUNT: Record<GearRarity, number> = {
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  legendary: 4,
  // Set pieces carry their effect via the baked set-effect layer, not rolled
  // affixes (engine/items/setGear.ts); never rolled through here.
  set: 0,
};

/** Gold premium multiplier by rarity — drives the shop price (the gold sink). */
const RARITY_PRICE_MULT: Record<GearRarity, number> = {
  white: 1,
  green: 1.4,
  blue: 2.1,
  purple: 3.2,
  legendary: 6,
  set: 6,
};

export interface RollItemOptions {
  rarity: GearRarity;
  classId: ClassId;
  /** Force a base kind. Omitted = the roller picks weapon or armour. */
  kind?: BaseKind;
  /**
   * Story depth (chapter, 1–14) this loot drops at. Drives the depth axis: deeper
   * chapters surface higher base tiers and a higher +N ceiling, and the endgame
   * band (Ch10+) keeps climbing past the Ch8 ceiling so a Throne-of-the Slain God rack is
   * the richest in the game. Default 1.
   */
  depth?: number;
  /**
   * With kind 'armor': restrict the base pool to this armour category (e.g. a
   * guaranteed SHIELD shop slot for shield-proficient classes). Silently ignored
   * when the class has no legal base in the category.
   */
  armorCategory?: 'shield';
}

/** Deterministic non-negative pick in [0, n) from the seeded roller. */
function pickIndex(roller: DiceRoller, n: number): number {
  return roller.roll('1d100').total % n;
}

/**
 * Crude power tier (1–3) of a base, read off weapon damage / armour AC. Drives
 * the depth bias — deeper chapters surface higher-tier bases more often — and is
 * intentionally coarse: it only orders the pool, the +N axis carries the rest.
 */
function baseTier(base: Weapon | Armor | Accessory): number {
  if (base.kind === 'weapon') {
    const d = parseDiceExpression(base.damage);
    const avg = d.count * (d.die + 1) / 2 + d.modifier;
    if (avg >= 6.5) return 3; // greataxe (1d12), greatsword (2d6)
    if (avg >= 4.5) return 2; // d8/d10 martials
    return 1; // d4/d6 simples
  }
  if (base.kind === 'armor') {
    // Robes and orbs carry no AC, so they stay at the floor of the depth bias —
    // their value is the rolled (caster) affixes, not the base.
    if (base.category === 'robe' || base.category === 'orb') return 1;
    // Shields compete in the body-armour roll on their AC bonus, so deep chapters
    // surface them (and the rarity ladder hands them blue/epic affixes) instead of
    // pinning every shield at the floor.
    if (base.category === 'shield') return base.baseAC >= 3 ? 3 : 2;
    if (base.baseAC >= 16) return 3;
    if (base.baseAC >= 13) return 2;
    return 1;
  }
  return 1; // accessories are tierless
}

/**
 * Pick a base, biased toward higher tiers by depth. Deeper chapters take the
 * best of several draws, so big bases surface more often — but a low-tier base
 * is never excluded, so thin pools (the wizard's simple weapons / robes) never
 * starve. Deterministic.
 */
function pickBaseWithDepth<T extends Weapon | Armor | Accessory>(
  roller: DiceRoller,
  bases: T[],
  depth: number,
): T {
  const draws = depth >= 13 ? 5 : depth >= 10 ? 4 : depth >= 6 ? 3 : depth >= 3 ? 2 : 1;
  let best = bases[pickIndex(roller, bases.length)];
  for (let i = 1; i < draws; i++) {
    const cand = bases[pickIndex(roller, bases.length)];
    if (baseTier(cand) > baseTier(best)) best = cand;
  }
  return best;
}

/** +N ceiling by story depth. The base game (Ch1-11) tops out at +3; only the
 * New Game+ Throne-of-the Slain God chapters climb past it — Ch12-13 to +4, Ch14 to +5.
 * The ToB band (Ch12-14) is reachable only in a NG+ run, so +4/+5 surface only
 * there. Takes the raw chapter uncapped, so Ch12-14 flow through. */
export function depthEnhanceCap(depth: number): number {
  if (depth >= 14) return 5;
  if (depth >= 12) return 4;
  if (depth >= 5) return 3;
  if (depth >= 3) return 2;
  return 1;
}

/**
 * Roll the flat +N enhancement, gated by DEPTH ALONE — rarity no longer caps it,
 * so a deep-chapter white can reach the same +N as a purple (enhancement is its
 * own power axis, separate from rarity and affixes). Each successive pip is a
 * separate, progressively-rarer gate, so deep loot climbs toward the depth cap
 * while early loot mostly sits at +0/+1. Deterministic.
 */
function rollEnhancement(roller: DiceRoller, depth: number): number {
  const cap = depthEnhanceCap(depth);
  if (cap <= 0) return 0;
  let plus = 0;
  for (let step = 0; step < cap; step++) {
    const chance = Math.max(10, 45 - step * 15 + depth * 5);
    if (roller.roll('1d100').total <= chance) plus += 1;
    else break;
  }
  return plus;
}

/** Bases of a kind the class is trained to use. Accessories have no gate. */
function legalBases(kind: BaseKind, classId: ClassId): Array<Weapon | Armor | Accessory> {
  if (kind === 'weapon') {
    const ids =
      classId === 'monk'
        ? MONK_WEAPON_BASE_IDS
        : classId === 'bard'
          ? [...WEAPON_BASE_IDS, ...BARD_WEAPON_BASE_IDS]
          : WEAPON_BASE_IDS;
    return ids
      .map((id) => getItem(id) as Weapon)
      .filter((w) => classWeaponProficient(classId, w));
  }
  if (kind === 'accessory') {
    return ACCESSORY_BASE_IDS.map((id) => getItem(id) as Accessory);
  }
  // Armour bases + the caster off-hand orbs, both class-gated by armour
  // proficiency (orbs only pass for casters — wizard/druid), so a martial never
  // rolls one and a caster gets a shot at an orb off-hand.
  return [...ARMOR_BASE_IDS, ...ORB_BASE_IDS]
    .map((id) => getItem(id) as Armor)
    .filter((a) => classArmorProficient(classId, a));
}

/** Affixes that may roll onto the given base kind for the given class. */
export function eligibleAffixes(kind: BaseKind, classId: ClassId): Affix[] {
  return listAffixes().filter(
    (a) =>
      a.appliesTo.includes(kind) &&
      (!a.classGate || a.classGate.length === 0 || a.classGate.includes(classId)),
  );
}

/**
 * "Dominance" of an affix for naming. A class-gated signature affix (Furious,
 * Shadowed, …) defines a weapon's identity and outranks a generic effect, which
 * outranks a plain stat-stick — so the woven name leads with the affix that
 * actually matters ("Furious Greataxe", not "Honed Greataxe").
 */
export function affixDominance(affix: Affix): number {
  const m = affix.modifiers;
  const gated = affix.classGate && affix.classGate.length > 0 ? 1000 : 0;
  const signature =
    (m.rageDamageBonus ?? 0) +
    (m.markDamageBonus ?? 0) +
    (m.sneakDamageBonus ?? 0) +
    (m.followupDamageBonus ?? 0) +
    (m.lifestealPct ?? 0) +
    (m.bleedDamage ?? 0) +
    (m.critRangeBonus ?? 0) +
    (m.tempHpPerCombat ?? 0) +
    (m.spellDcBonus ?? 0) +
    (m.spellDamageBonus ?? 0) +
    (m.spellAttackBonus ?? 0) +
    (m.bonusSpellSlotsL1 ?? 0) +
    (m.acBonusWhileFull ?? 0) +
    (m.acBonusWhileBloodied ?? 0) +
    (m.resist ? 1 : 0);
  const flat = (m.attackBonus ?? 0) + (m.damageBonus ?? 0) + (m.acBonus ?? 0);
  return gated + signature * 100 + flat;
}

/**
 * Weave the Diablo-style display name: [prefix] Base [suffix]. Each slot takes
 * its most DOMINANT affix (not just the first rolled), so the name reflects the
 * item's defining modifier.
 */
export function rolledItemName(baseName: string, affixIds: string[], enhancement = 0): string {
  const affixes = affixIds.map(getAffix);
  const dominant = (kind: 'prefix' | 'suffix'): Affix | undefined =>
    affixes
      .filter((a) => a.namePart.kind === kind)
      .sort((a, b) => affixDominance(b) - affixDominance(a))[0];
  const prefix = dominant('prefix');
  const suffix = dominant('suffix');
  let name = baseName;
  if (prefix) name = `${prefix.namePart.word} ${name}`;
  if (suffix) name = `${name} ${suffix.namePart.word}`;
  // The +N leads the whole name, Diablo-style: "+2 Keen Longsword of Mending".
  if (enhancement > 0) name = `+${enhancement} ${name}`;
  return name;
}

/**
 * Shop/value price for a rolled item, priced by POWER — never by D&D materials.
 * Gameplay over realism: an item costs for what it DOES (its rarity tier, its
 * affix count, and its super-linear `+N` enhancement), so a plain plate no longer
 * out-prices a stronger enchanted chainmail just because real-world plate is
 * expensive. `base.cost` (the realism number) is intentionally ignored. A flat
 * power floor + affix/enhancement premiums, all scaled by the rarity multiplier;
 * the +N premium is the gold sink that soaks mid-game inflation. The weights are
 * seed values pending the economy sim pass.
 */
const ITEM_POWER_FLOOR = 40;
const AFFIX_PREMIUM = 70;
export function rolledItemCost(ref: ItemRef): number {
  const affixCount = ref.rolled?.affixes.length ?? 0;
  const rarity = ref.rolled?.rarity ?? 'white';
  const enh = ref.rolled?.enhancement ?? 0;
  const enhancePremium = enh * 60 + enh * enh * 40;
  const power = ITEM_POWER_FLOOR + AFFIX_PREMIUM * affixCount + enhancePremium;
  return Math.round(power * RARITY_PRICE_MULT[rarity]);
}

/**
 * Roll a loot item: pick a class-legal base of the requested (or randomly
 * chosen) kind, then roll N distinct affixes by rarity. Deterministic via the
 * seeded roller. Returns an `ItemRef` carrying the rolled payload, ready to
 * push into inventory.
 */
export function rollItem(roller: DiceRoller, opts: RollItemOptions): ItemRef {
  const { rarity, classId } = opts;
  const depth = opts.depth ?? 1;
  let kind: BaseKind;
  if (opts.kind) {
    kind = opts.kind;
  } else {
    const r = roller.roll('1d100').total;
    kind = r <= 45 ? 'weapon' : r <= 75 ? 'armor' : 'accessory';
  }

  let bases = legalBases(kind, classId);
  if (kind === 'armor' && opts.armorCategory) {
    const narrowed = bases.filter((b) => b.kind === 'armor' && b.category === opts.armorCategory);
    if (narrowed.length > 0) bases = narrowed;
  }
  // A class might be barred from the chosen kind entirely (Wizard + armour) —
  // fall back to weapons, which every class can use.
  if (bases.length === 0) {
    kind = 'weapon';
    bases = legalBases(kind, classId);
  }
  const base = pickBaseWithDepth(roller, bases, depth);

  const count = AFFIX_COUNT[rarity];
  const pool = eligibleAffixes(kind, classId);
  const affixes: string[] = [];
  const seen = new Set<string>();
  let safety = 0;
  while (affixes.length < count && affixes.length < pool.length && safety < 64) {
    safety += 1;
    const candidate = pool[pickIndex(roller, pool.length)];
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    affixes.push(candidate.id);
  }

  // The +N axis rides weapons and real armour/shields only; robes (no AC) and
  // accessories (pure affix carriers) never carry an enhancement.
  const carriesEnhancement =
    base.kind === 'weapon' ||
    (base.kind === 'armor' && base.category !== 'robe' && base.category !== 'orb');
  const enhancement = carriesEnhancement ? rollEnhancement(roller, depth) : 0;

  return {
    itemId: base.id,
    rolled: {
      baseId: base.id,
      rarity,
      affixes,
      enhancement,
      name: rolledItemName(base.name, affixes, enhancement),
    },
  };
}
