import type { AffixModifiers } from '../schemas/item';
import type { ClassId } from '../schemas/ids';
import { computeSetBonuses } from './sets';

/**
 * A legendary relic: cross-delve persistent gear managed only at the Phandalin
 * hub (Hades keepsake/aspect style — separate from the run's affix gear). A relic
 * carries NO armour class and NO weapon damage; it is a pure EFFECT, layered on
 * top of your equipped affix gear through the same affix pipeline (see
 * engine/items/affixMods.ts).
 *
 * A relic with a `classGate` is class-BOUND: it can DROP for any class (and is
 * stashed until then) but is only equippable while playing that class — the gate
 * is enforced in metaStore.setActiveLegendaries. `setId` ties a relic to a
 * legendary SET whose completion grants extra effects on top (content/sets.ts).
 */
export interface Legendary {
  id: string;
  name: string;
  /** One-line flavor in the Forgotten Realms / BG2 voice. */
  flavor: string;
  /** Player-facing mechanical line, e.g. "Heal 12% of the damage you deal". */
  effect: string;
  /** The relic's mechanical payload — an EFFECT set, applied via the affix path. */
  effects: AffixModifiers;
  /** Set this relic belongs to, if any (content/sets.ts). */
  setId?: string;
  /** Class-bound: drops for any class, equippable only while playing this one. */
  classGate?: ClassId;
  /**
   * Apex "ascendant" tier: only enters the drop/reliquary candidate pool once the
   * run qualifies (Ascension >= 3, engine/delve/ascension.ts ascensionAscendantLoot).
   * Climbing ascension is the SOLE way to earn these — at Asc 0-2 they never drop
   * or get offered. They persist (banked) once earned: the cross-run carrot.
   */
  ascendant?: true;
}

/**
 * The legendary collection. Effect-only, deliberately modest — sims tune the
 * magnitudes later; the grind to earn them (elite-node drops) stays.
 */
export const LEGENDARIES: readonly Legendary[] = [
  {
    id: 'heartwood-talisman',
    name: 'Heartwood Talisman',
    flavor: 'A knot of livewood cut from Mielikki’s grove, still warm with sap.',
    effect: 'Heal 12% of the damage you deal',
    effects: { lifestealPct: 12 },
  },
  {
    id: 'bulwark-sigil',
    name: 'Bulwark Sigil',
    flavor: 'A warding glyph hammered into old shield-bronze, cold to the touch.',
    effect: 'Gain 8 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 8 },
  },
  {
    id: 'gauntlets-of-the-titan',
    name: 'Gauntlets of the Titan',
    flavor: 'Oversized vambraces that lend a giant’s pull to a mortal arm.',
    effect: 'Your blows rend for +4 bleed damage',
    effects: { bleedDamage: 4 },
  },
  {
    id: 'cloak-of-the-nightwind',
    name: 'Cloak of the Nightwind',
    flavor: 'Spun from shadow and a hunting cat’s quiet.',
    effect: 'Critical hits land on 19–20',
    effects: { critRangeBonus: 1 },
  },
  {
    id: 'sages-diadem',
    name: 'Sage’s Diadem',
    flavor: 'A thin circlet that hums faintly against the temples.',
    effect: '+1 spell save DC and +2 spell damage',
    effects: { spellDcBonus: 1, spellDamageBonus: 2 },
  },
  {
    id: 'hunters-eye',
    name: 'Hunter’s Eye',
    flavor: 'A petrified raptor’s eye that never blinks at a weak point.',
    effect: 'Heal 8% of damage dealt; crits land on 19–20',
    effects: { lifestealPct: 8, critRangeBonus: 1 },
  },

  // --- Set: Aegis of the Vigil (class-agnostic, 3 pieces) -------------------
  {
    id: 'vigil-helm',
    name: 'Vigil Helm',
    flavor: 'A warden’s greathelm, dented by blows that never reached the soul.',
    effect: 'Gain 4 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 4 },
    setId: 'vigil',
  },
  {
    id: 'vigil-mantle',
    name: 'Vigil Mantle',
    flavor: 'A heavy cloak stitched with the sigils of the wall-watch.',
    effect: 'Gain 4 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 4 },
    setId: 'vigil',
  },
  {
    id: 'vigil-heart',
    name: 'Vigil Heart',
    flavor: 'A locket of clouded amber that steadies a failing pulse.',
    effect: 'Heal 8% of the damage you deal',
    effects: { lifestealPct: 8 },
    setId: 'vigil',
  },

  // --- Set: Warsong Panoply (Fighter-bound, 2 pieces) ----------------------
  {
    id: 'warsong-gauntlet',
    name: 'Warsong Gauntlet',
    flavor: 'A war-leader’s gauntlet, its knuckles scarred from a hundred charges.',
    effect: '+3 damage on each follow-up swing',
    effects: { followupDamageBonus: 3 },
    setId: 'warsong',
    classGate: 'fighter',
  },
  {
    id: 'warsong-crest',
    name: 'Warsong Crest',
    flavor: 'A crested helm that turns a battle-cry into something men follow.',
    effect: 'Your blows rend for +3 bleed damage',
    effects: { bleedDamage: 3 },
    setId: 'warsong',
    classGate: 'fighter',
  },

  // --- Ascendant tier: apex relics, Ascension >= 3 only --------------------
  // The reward for climbing the ladder. Magnitudes sit a clear step above the
  // base legendaries; sims tune the exact numbers later.
  {
    id: 'crom-faeyr',
    name: 'Crom Faeyr',
    flavor: 'A dwarven warhammer quenched in giant-blood and bound with the smith-runes of Clangeddin.',
    effect: 'Your blows rend for +6 bleed damage; +4 on each follow-up swing',
    effects: { bleedDamage: 6, followupDamageBonus: 4 },
    ascendant: true,
  },
  {
    id: 'robe-of-vecna',
    name: 'Robe of Vecna',
    flavor: 'Stitched from the burial shroud of a god of secrets; the weave drinks the cold between spells.',
    effect: '+2 spell save DC and +4 spell damage',
    effects: { spellDcBonus: 2, spellDamageBonus: 4 },
    ascendant: true,
  },
  {
    id: 'ring-of-gaxx',
    name: 'Ring of Gaxx',
    flavor: 'Torn from the finger of the demilich Kangaxx; the wound it leaves never stops closing.',
    effect: 'Gain 12 temporary HP each fight and regenerate 3 HP per turn',
    effects: { tempHpPerCombat: 12, regenPerTurn: 3 },
    ascendant: true,
  },
  {
    id: 'carsomyr',
    name: 'Carsomyr',
    flavor: 'The Holy Avenger, shorn to a shard of radiant steel that thirsts for the unclean.',
    effect: 'Heal 15% of the damage you deal; critical hits land on 19–20',
    effects: { lifestealPct: 15, critRangeBonus: 1 },
    ascendant: true,
  },
];

/** Canonical relic id list — stable iteration + drop/validity checks. */
export const LEGENDARY_ORDER: readonly string[] = LEGENDARIES.map((l) => l.id);

const BY_ID = new Map(LEGENDARIES.map((l) => [l.id, l]));

export function getLegendary(id: string): Legendary | undefined {
  return BY_ID.get(id);
}

/**
 * Relic ids appropriate to OFFER a given class (the shop reliquary): every
 * class-agnostic relic plus that class's own bound relics. The apex ascendant
 * tier is folded in ONLY when `allowAscendant` (the run is at Ascension >= 3);
 * at lower ascension those relics are never offered. Elite-node DROPS use a
 * wider any-class pool (off-class relics are stashed) — see legendaryBankPool.
 */
export function legendaryDropPool(classId: ClassId, allowAscendant = false): string[] {
  return LEGENDARIES.filter(
    (l) => (!l.classGate || l.classGate === classId) && (allowAscendant || !l.ascendant),
  ).map((l) => l.id);
}

/**
 * The any-class pool an elite-node DROP banks from (off-class relics are stashed
 * until the player runs that class). The apex ascendant tier is included ONLY
 * when `allowAscendant` (Ascension >= 3); otherwise those relics never drop.
 */
export function legendaryBankPool(allowAscendant: boolean): string[] {
  return LEGENDARIES.filter((l) => allowAscendant || !l.ascendant).map((l) => l.id);
}

/** Whether a relic may be EQUIPPED by a character of the given class (class-bound gate). */
export function canEquipLegendary(id: string, classId: ClassId): boolean {
  const leg = BY_ID.get(id);
  if (!leg) return false;
  return !leg.classGate || leg.classGate === classId;
}

/**
 * The effect payloads of the equipped relics PLUS any completed-set bonuses, as a
 * flat list. `metaStore.setActiveLegendaries` bakes this onto the character;
 * `characterAffixMods` folds each entry into the shared affix pipeline so the
 * effects ride every channel the engine already reads.
 */
export function aggregateLegendaryEffects(
  ids: readonly string[],
  includeSets = true,
): AffixModifiers[] {
  const out: AffixModifiers[] = [];
  for (const id of ids) {
    const leg = BY_ID.get(id);
    if (leg) out.push(leg.effects);
  }
  if (includeSets) out.push(...computeSetBonuses(ids));
  return out;
}
