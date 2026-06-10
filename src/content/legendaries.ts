import type { AffixModifiers } from '../schemas/item';
import type { ClassId } from '../schemas/ids';

/**
 * The nine TYPED relic slots. Every relic lives in exactly ONE slot, chosen by
 * its PRIMARY effect — but a relic still grants ALL of its effects when equipped.
 * The hub loadout holds at most one relic per slot
 * (metaStore.equippedRelics), and the slots open PROGRESSIVELY as the soul lays
 * Renown down at the Grove (engine/progression/unlocks.unlockedRelicSlots).
 *
 * Array order is the reveal / unlock order: the first three are open from the
 * very start, the remaining six unlock on the renown-spent bars. The early slots
 * are the ones a fresh soul can actually fill from the base drop pool; the
 * caster / signature / renewal slots — whose relics are mostly New-Game+ only —
 * sit at the deep end of the ladder.
 */
export const RELIC_SLOTS = [
  'vampire',
  'aegis',
  'precision',
  'rend',
  'spellfocus',
  'cascade',
  'spellpower',
  'signature',
  'renewal',
] as const;

export type RelicSlot = (typeof RELIC_SLOTS)[number];

export interface RelicSlotMeta {
  id: RelicSlot;
  /** Slot label shown on the loadout (in-world, terse). */
  name: string;
  /** One-line description of the gift this slot's relics share. */
  blurb: string;
}

/** Display copy for each typed slot. */
export const RELIC_SLOT_META: Record<RelicSlot, RelicSlotMeta> = {
  vampire: { id: 'vampire', name: 'Vampire', blurb: 'Drink the life from every wound you deal.' },
  aegis: { id: 'aegis', name: 'Aegis', blurb: 'A ward of borrowed life at each fight’s first breath.' },
  precision: { id: 'precision', name: 'Precision', blurb: 'Find the killing seam more often.' },
  rend: { id: 'rend', name: 'Rend', blurb: 'Leave wounds that go on bleeding.' },
  spellfocus: { id: 'spellfocus', name: 'Spellfocus', blurb: 'Make your magic harder to refuse.' },
  cascade: { id: 'cascade', name: 'Cascade', blurb: 'Each follow-up blow lands the harder.' },
  spellpower: { id: 'spellpower', name: 'Spellpower', blurb: 'Lend your spells a crueler edge.' },
  signature: { id: 'signature', name: 'Signature', blurb: 'Sharpen what only your kind can do.' },
  renewal: { id: 'renewal', name: 'Renewal', blurb: 'Knit your hurts closed, turn by turn.' },
};

/**
 * A legendary relic: cross-delve persistent gear managed only at the Wakeford
 * hub (Hades keepsake/aspect style — separate from the run's affix gear). A relic
 * carries NO armour class and NO weapon damage; it is a pure EFFECT, layered on
 * top of your equipped affix gear through the same affix pipeline (see
 * engine/items/affixMods.ts).
 *
 * A relic with a `classGate` is class-BOUND: it can DROP for any class (and is
 * stashed until then) but is only equippable while playing that class — the gate
 * is enforced in metaStore.applyRelicLoadout. `slot` is the one typed loadout
 * slot the relic occupies (see {@link RelicSlot}).
 *
 * Legendaries are the EFFECT-ONLY boon layer. The separate persistent SLOT-gear
 * layer (equippable weapons/armour/accessories that persist and grant set
 * bonuses) lives in content/sets.ts — legendaries no longer carry a set concept.
 */
export interface Legendary {
  id: string;
  name: string;
  /** One-line flavor in the old realms / BG2 voice. */
  flavor: string;
  /** Player-facing mechanical line, e.g. "Heal 12% of the damage you deal". */
  effect: string;
  /** The relic's mechanical payload — an EFFECT set, applied via the affix path. */
  effects: AffixModifiers;
  /** The ONE typed loadout slot this relic occupies (chosen by primary effect). */
  slot: RelicSlot;
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
 * magnitudes later; the grind to earn them (elite-node drops) stays. Each relic's
 * `slot` is its PRIMARY effect: it still grants every effect it carries. Every
 * one of the nine typed slots holds at least one relic.
 */
export const LEGENDARIES: readonly Legendary[] = [
  {
    id: 'heartwood-talisman',
    name: 'Heartwood Talisman',
    flavor: 'A knot of livewood cut from Mielikki\u2019s grove, still warm with sap.',
    effect: 'Heal 6% of the damage you deal',
    effects: { lifestealPct: 6 },
    slot: 'vampire',
  },
  {
    id: 'bulwark-sigil',
    name: 'Bulwark Sigil',
    flavor: 'A warding glyph hammered into old shield-bronze, cold to the touch.',
    effect: 'Gain 8 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 8 },
    slot: 'aegis',
  },
  {
    id: 'gauntlets-of-the-titan',
    name: 'Gauntlets of the Titan',
    flavor: 'Oversized vambraces that lend a giant\u2019s pull to a mortal arm.',
    effect: 'Your blows rend for +4 bleed damage',
    effects: { bleedDamage: 4 },
    slot: 'rend',
  },
  {
    id: 'cloak-of-the-nightwind',
    name: 'Cloak of the Nightwind',
    flavor: 'Spun from shadow and a hunting cat\u2019s quiet.',
    effect: 'Critical hits land on 19\u201320',
    effects: { critRangeBonus: 1 },
    slot: 'precision',
  },
  {
    id: 'sages-diadem',
    name: 'Sage\u2019s Diadem',
    flavor: 'A thin circlet that hums faintly against the temples.',
    effect: '+1 spell save DC and +2 spell damage',
    effects: { spellDcBonus: 1, spellDamageBonus: 2 },
    slot: 'spellfocus',
  },
  {
    id: 'hunters-eye',
    name: 'Hunter\u2019s Eye',
    flavor: 'A petrified raptor\u2019s eye that never blinks at a weak point.',
    effect: 'Heal 4% of damage dealt; crits land on 19\u201320',
    effects: { lifestealPct: 4, critRangeBonus: 1 },
    slot: 'precision',
  },
  {
    id: 'gauntlets-of-the-cascade',
    name: 'Gauntlets of the Cascade',
    flavor: 'Layered steel that throws each follow-up blow harder than the last.',
    effect: '+3 damage on each follow-up swing',
    effects: { followupDamageBonus: 3 },
    slot: 'cascade',
  },
  {
    id: 'orb-of-streaming-fire',
    name: 'Orb of Streaming Fire',
    flavor: 'A glass sphere of caged flame that leans toward whatever the caster names.',
    effect: '+3 spell damage and +1 spell attack',
    effects: { spellDamageBonus: 3, spellAttackBonus: 1 },
    slot: 'spellpower',
  },
  {
    id: 'band-of-renewal',
    name: 'Band of Renewal',
    flavor: 'A plain green ring that closes the wearer\u2019s wounds the way the seasons close a scar.',
    effect: 'Regenerate 2 HP at the start of each turn',
    effects: { regenPerTurn: 2 },
    slot: 'renewal',
  },
  {
    id: 'totem-of-the-self',
    name: 'Totem of the Self',
    flavor: 'A carved fetish that sharpens whatever your kind does best \u2014 the rage, the mark, the unseen strike.',
    effect: 'Sharpen your signature strike: +2 rage / mark / sneak damage',
    effects: { rageDamageBonus: 2, markDamageBonus: 2, sneakDamageBonus: 2 },
    slot: 'signature',
  },
  {
    id: 'reavers-chain',
    name: 'Reaver\u2019s Chain',
    flavor: 'A flail of barbed links forged by the reavers of the Nelanther; each hook leaves the bearer fuller and the foe emptier.',
    effect: 'Heal 5% of the damage you deal; +2 bleed damage',
    effects: { lifestealPct: 5, bleedDamage: 2 },
    slot: 'vampire',
  },
  {
    id: 'ironheart-brooch',
    name: 'Ironheart Brooch',
    flavor: 'A clasp of dwarven iron worn over the heart; it drinks the first blow meant to stop one.',
    effect: 'Gain 10 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 10 },
    slot: 'aegis',
  },
  {
    id: 'duelists-whetstone',
    name: 'Duelist\u2019s Whetstone',
    flavor: 'A duelist\u2019s stone honed so fine it parts not just steel but the seam beneath the skin.',
    effect: 'Critical hits land on 19\u201320; +2 bleed damage',
    effects: { critRangeBonus: 1, bleedDamage: 2 },
    slot: 'precision',
  },
  {
    id: 'serpent-fang-ring',
    name: 'Serpent-Fang Ring',
    flavor: 'A signet set with a viper\u2019s tooth that still weeps its slow venom.',
    effect: 'Your blows rend for +5 bleed damage',
    effects: { bleedDamage: 5 },
    slot: 'rend',
  },
  {
    id: 'witchfire-wand',
    name: 'Witchfire Wand',
    flavor: 'A wand of charred yew that answers a spoken Word with more fire than was asked.',
    effect: '+4 spell damage and +1 spell attack',
    effects: { spellDamageBonus: 4, spellAttackBonus: 1 },
    slot: 'spellpower',
  },
  {
    id: 'codex-of-the-veiled-star',
    name: 'Codex of the Veiled Star',
    flavor: 'A grimoire whose marginalia rearrange themselves overnight, offering a spell the reader had not yet learned to want.',
    effect: '+1 spell save DC and one extra 1st-level spell slot',
    effects: { spellDcBonus: 1, bonusSpellSlotsL1: 1 },
    slot: 'spellfocus',
  },
  {
    id: 'hymnal-of-slow-mending',
    name: 'Hymnal of Slow Mending',
    flavor: 'A psalter of Eos\u2019s dawn-song; hum it and old wounds forget to bleed.',
    effect: 'Regenerate 3 HP at the start of each turn',
    effects: { regenPerTurn: 3 },
    slot: 'renewal',
  },
  {
    id: 'idol-of-the-threefold-hunt',
    name: 'Idol of the Threefold Hunt',
    flavor: 'A three-faced fetish \u2014 wolf, hawk, and serpent \u2014 that whets whatever instinct its bearer hunts by.',
    effect: 'Sharpen your signature strike: +3 rage / mark / sneak damage',
    effects: { rageDamageBonus: 3, markDamageBonus: 3, sneakDamageBonus: 3 },
    slot: 'signature',
  },
  {
    id: 'avalanche-gauntlets',
    name: 'Avalanche Gauntlets',
    flavor: 'Stone-knuckled gauntlets that gather weight with every blow until the last falls like a hillside.',
    effect: '+3 damage on each follow-up swing; +2 bleed damage',
    effects: { followupDamageBonus: 3, bleedDamage: 2 },
    slot: 'cascade',
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
    slot: 'rend',
    ascendant: true,
  },
  {
    id: 'robe-of-vecna',
    name: 'Robe of Vecna',
    flavor: 'Stitched from the burial shroud of a god of secrets; the weave drinks the cold between spells.',
    effect: '+2 spell save DC and +4 spell damage',
    effects: { spellDcBonus: 2, spellDamageBonus: 4 },
    slot: 'spellfocus',
    ascendant: true,
  },
  {
    id: 'ring-of-gaxx',
    name: 'Ring of Gaxx',
    flavor: 'Torn from the finger of the demilich Kangaxx; the wound it leaves never stops closing.',
    effect: 'Gain 12 temporary HP each fight and regenerate 3 HP per turn',
    effects: { tempHpPerCombat: 12, regenPerTurn: 3 },
    slot: 'aegis',
    ascendant: true,
  },
  {
    id: 'carsomyr',
    name: 'Carsomyr',
    flavor: 'The Holy Avenger, shorn to a shard of radiant steel that thirsts for the unclean.',
    effect: 'Heal 8% of the damage you deal; critical hits land on 19\u201320',
    effects: { lifestealPct: 8, critRangeBonus: 1 },
    slot: 'vampire',
    ascendant: true,
  },
  {
    id: 'blackrazor',
    name: 'Blackrazor',
    flavor: 'The hungry blade of legend, a shard of starless void that feeds on the souls it severs.',
    effect: 'Heal 10% of the damage you deal; +4 bleed damage',
    effects: { lifestealPct: 10, bleedDamage: 4 },
    slot: 'vampire',
    ascendant: true,
  },
  {
    id: 'staff-of-the-magi',
    name: 'Staff of the Magi',
    flavor: 'The archmage’s staff, brimming with stored Art; it returns more power than any one spell should spend.',
    effect: '+5 spell damage, +2 spell attack, and one extra 1st-level spell slot',
    effects: { spellDamageBonus: 5, spellAttackBonus: 2, bonusSpellSlotsL1: 1 },
    slot: 'spellpower',
    ascendant: true,
  },
  {
    id: 'wardstone-of-the-unbroken',
    name: 'Wardstone of the Unbroken',
    flavor: 'A keystone pried from a fortress that never fell; it lends the walls’ stubbornness to flesh.',
    effect: 'Gain 14 temporary HP each fight and regenerate 2 HP per turn',
    effects: { tempHpPerCombat: 14, regenPerTurn: 2 },
    slot: 'aegis',
    ascendant: true,
  },
  {
    id: 'mask-of-the-perfect-kill',
    name: 'Mask of the Perfect Kill',
    flavor: 'A featureless porcelain mask worn by the assassin who never missed twice; behind it, every throat is already open.',
    effect: 'Critical hits land on 18–20; +3 bleed damage and heal 6% of damage dealt',
    effects: { critRangeBonus: 2, bleedDamage: 3, lifestealPct: 6 },
    slot: 'precision',
    ascendant: true,
  },

];

/** Canonical relic id list — stable iteration + drop/validity checks. */
export const LEGENDARY_ORDER: readonly string[] = LEGENDARIES.map((l) => l.id);

const BY_ID = new Map(LEGENDARIES.map((l) => [l.id, l]));

export function getLegendary(id: string): Legendary | undefined {
  return BY_ID.get(id);
}

/** The typed slot a relic occupies, or undefined for an unknown id. */
export function relicSlotOf(id: string): RelicSlot | undefined {
  return BY_ID.get(id)?.slot;
}

/** Every relic that lives in a given typed slot, in collection order. */
export function relicsInSlot(slot: RelicSlot): Legendary[] {
  return LEGENDARIES.filter((l) => l.slot === slot);
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
 * The effect payloads of the equipped relics as a flat list.
 * `metaStore.applyRelicLoadout` bakes this onto the character;
 * `characterAffixMods` folds each entry into the shared affix pipeline so the
 * effects ride every channel the engine already reads. (Set bonuses are a
 * separate layer — see content/sets.ts / metaStore.applySetLoadout.)
 */
export function aggregateLegendaryEffects(ids: readonly string[]): AffixModifiers[] {
  const out: AffixModifiers[] = [];
  for (const id of ids) {
    const leg = BY_ID.get(id);
    if (leg) out.push(leg.effects);
  }
  return out;
}
