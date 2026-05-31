import type { DiceRoller } from '../dice';
import type { ClassId } from '../../schemas/ids';
import type { Affix, GearRarity, ItemRef, Weapon, Armor, Accessory } from '../../schemas/item';
import { getItem, getAffix, listAffixes } from '../../content/items';
import { classWeaponProficient, classArmorProficient } from '../character/equip';

export type BaseKind = 'weapon' | 'armor' | 'accessory';

/**
 * Curated base pools for rolled loot — the plain white bases the affix roll
 * builds on. (The old static "magic items" are gone; affixes replace them.)
 */
const WEAPON_BASE_IDS = [
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

const ARMOR_BASE_IDS = [
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
const ACCESSORY_BASE_IDS = [
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

/** Affix count by rarity. Purple rolls 3 or 4; legendary is Wave 2 (treat as 4). */
const AFFIX_COUNT: Record<GearRarity, number | [number, number]> = {
  white: 0,
  green: 1,
  blue: 2,
  purple: [3, 4],
  legendary: 4,
};

/** Gold premium multiplier by rarity — drives the shop price (the gold sink). */
const RARITY_PRICE_MULT: Record<GearRarity, number> = {
  white: 1,
  green: 1.4,
  blue: 2.1,
  purple: 3.2,
  legendary: 6,
};

export interface RollItemOptions {
  rarity: GearRarity;
  classId: ClassId;
  /** Force a base kind. Omitted = the roller picks weapon or armour. */
  kind?: BaseKind;
}

/** Deterministic non-negative pick in [0, n) from the seeded roller. */
function pickIndex(roller: DiceRoller, n: number): number {
  return roller.roll('1d100').total % n;
}

function affixCountFor(roller: DiceRoller, rarity: GearRarity): number {
  const spec = AFFIX_COUNT[rarity];
  if (Array.isArray(spec)) {
    const [lo, hi] = spec;
    return lo + pickIndex(roller, hi - lo + 1);
  }
  return spec;
}

/** Bases of a kind the class is trained to use. Accessories have no gate. */
function legalBases(kind: BaseKind, classId: ClassId): Array<Weapon | Armor | Accessory> {
  if (kind === 'weapon') {
    return WEAPON_BASE_IDS.map((id) => getItem(id) as Weapon).filter((w) =>
      classWeaponProficient(classId, w),
    );
  }
  if (kind === 'accessory') {
    return ACCESSORY_BASE_IDS.map((id) => getItem(id) as Accessory);
  }
  return ARMOR_BASE_IDS.map((id) => getItem(id) as Armor).filter((a) =>
    classArmorProficient(classId, a),
  );
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
function affixDominance(affix: Affix): number {
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
export function rolledItemName(baseName: string, affixIds: string[]): string {
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
  return name;
}

/** Shop/value price for a rolled item: base cost + per-affix premium × rarity. */
export function rolledItemCost(ref: ItemRef): number {
  const base = getItem(ref.itemId);
  const affixCount = ref.rolled?.affixes.length ?? 0;
  const rarity = ref.rolled?.rarity ?? 'white';
  return Math.round((base.cost + 18 * affixCount) * RARITY_PRICE_MULT[rarity]);
}

/**
 * Roll a loot item: pick a class-legal base of the requested (or randomly
 * chosen) kind, then roll N distinct affixes by rarity. Deterministic via the
 * seeded roller. Returns an `ItemRef` carrying the rolled payload, ready to
 * push into inventory.
 */
export function rollItem(roller: DiceRoller, opts: RollItemOptions): ItemRef {
  const { rarity, classId } = opts;
  let kind: BaseKind;
  if (opts.kind) {
    kind = opts.kind;
  } else {
    const r = roller.roll('1d100').total;
    kind = r <= 45 ? 'weapon' : r <= 75 ? 'armor' : 'accessory';
  }

  let bases = legalBases(kind, classId);
  // A class might be barred from the chosen kind entirely (Wizard + armour) —
  // fall back to weapons, which every class can use.
  if (bases.length === 0) {
    kind = 'weapon';
    bases = legalBases(kind, classId);
  }
  const base = bases[pickIndex(roller, bases.length)];

  const count = affixCountFor(roller, rarity);
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

  return {
    itemId: base.id,
    rolled: {
      baseId: base.id,
      rarity,
      affixes,
      name: rolledItemName(base.name, affixes),
    },
  };
}
