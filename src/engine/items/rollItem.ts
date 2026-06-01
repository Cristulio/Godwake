import type { DiceRoller } from '../dice';
import { parseDiceExpression } from '../dice';
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

/** Hard +N ceiling by rarity — a green never out-enhances a purple. Purple's
 * ceiling is +5, but only the endgame depth band (Ch10+) actually reaches past
 * +3; depthEnhanceCap keeps every chapter through Ch9 capped at +3. */
const RARITY_ENHANCE_CAP: Record<GearRarity, number> = {
  white: 0,
  green: 1,
  blue: 2,
  purple: 5,
  legendary: 5,
};

export interface RollItemOptions {
  rarity: GearRarity;
  classId: ClassId;
  /** Force a base kind. Omitted = the roller picks weapon or armour. */
  kind?: BaseKind;
  /**
   * Story depth (chapter, 1–14) this loot drops at. Drives the depth axis: deeper
   * chapters surface higher base tiers and a higher +N ceiling, and the endgame
   * band (Ch10+) keeps climbing past the Ch8 ceiling so a Throne-of-Bhaal rack is
   * the richest in the game. Default 1.
   */
  depth?: number;
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
    if (base.category === 'shield' || base.category === 'robe') return 1;
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

/** +N ceiling by story depth: Ch1-2 modest, mid modest-plus, Ch5-9 at +3, and
 * the endgame band climbing past it — Ch10-12 to +4, Ch13-14 to +5. */
function depthEnhanceCap(depth: number): number {
  if (depth >= 13) return 5;
  if (depth >= 10) return 4;
  if (depth >= 5) return 3;
  if (depth >= 3) return 2;
  return 1;
}

/**
 * Roll the flat +N enhancement. Capped by BOTH rarity and depth, and each
 * successive pip is a separate, progressively-rarer gate — so a deep purple
 * climbs toward +3 while an early green mostly sits at +0/+1. Deterministic.
 */
function rollEnhancement(roller: DiceRoller, rarity: GearRarity, depth: number): number {
  const cap = Math.min(RARITY_ENHANCE_CAP[rarity], depthEnhanceCap(depth));
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
 * Shop/value price for a rolled item: base cost + per-affix premium + an
 * enhancement premium that climbs super-linearly (+1 ≈ 50, +2 ≈ 140, +3 ≈ 270
 * before the rarity multiplier), all scaled by rarity. The +N premium is what
 * makes deep loot cost more — the gold sink that soaks mid-game inflation.
 */
export function rolledItemCost(ref: ItemRef): number {
  const base = getItem(ref.itemId);
  const affixCount = ref.rolled?.affixes.length ?? 0;
  const rarity = ref.rolled?.rarity ?? 'white';
  const enh = ref.rolled?.enhancement ?? 0;
  const enhancePremium = enh * 30 + enh * enh * 20;
  return Math.round((base.cost + 18 * affixCount + enhancePremium) * RARITY_PRICE_MULT[rarity]);
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
  // A class might be barred from the chosen kind entirely (Wizard + armour) —
  // fall back to weapons, which every class can use.
  if (bases.length === 0) {
    kind = 'weapon';
    bases = legalBases(kind, classId);
  }
  const base = pickBaseWithDepth(roller, bases, depth);

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

  // The +N axis rides weapons and real armour/shields only; robes (no AC) and
  // accessories (pure affix carriers) never carry an enhancement.
  const carriesEnhancement =
    base.kind === 'weapon' || (base.kind === 'armor' && base.category !== 'robe');
  const enhancement = carriesEnhancement ? rollEnhancement(roller, rarity, depth) : 0;

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
