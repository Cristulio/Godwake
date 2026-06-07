import type { AffixModifiers } from '../schemas/item';
import type { ClassId } from '../schemas/ids';
import { computeSetBonuses } from './sets';

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
 * A legendary relic: cross-delve persistent gear managed only at the Phandalin
 * hub (Hades keepsake/aspect style — separate from the run's affix gear). A relic
 * carries NO armour class and NO weapon damage; it is a pure EFFECT, layered on
 * top of your equipped affix gear through the same affix pipeline (see
 * engine/items/affixMods.ts).
 *
 * A relic with a `classGate` is class-BOUND: it can DROP for any class (and is
 * stashed until then) but is only equippable while playing that class — the gate
 * is enforced in metaStore.applyRelicLoadout. `setId` ties a relic to a legendary
 * SET whose completion grants extra effects on top (content/sets.ts). `slot` is
 * the one typed loadout slot the relic occupies (see {@link RelicSlot}).
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
  /** The ONE typed loadout slot this relic occupies (chosen by primary effect). */
  slot: RelicSlot;
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
  /**
   * Ascension-EXCLUSIVE: only enters the drop/reliquary pool on a New Game+ run
   * (Ascension >= 1, engine/delve/ascension.ascensionExclusiveLoot). A first /
   * normal playthrough never rolls or is offered these — they are the standing
   * reward for leaving the first chain behind. All signature class sets and the
   * new global sets carry this flag. Distinct from (and weaker-gated than) the
   * apex `ascendant` tier, which needs Ascension >= 3.
   */
  ascensionExclusive?: true;
}

/**
 * The legendary collection. Effect-only, deliberately modest — sims tune the
 * magnitudes later; the grind to earn them (elite-node drops) stays. Each relic's
 * `slot` is its PRIMARY effect: it still grants every effect it carries.
 */
export const LEGENDARIES: readonly Legendary[] = [
  {
    id: 'heartwood-talisman',
    name: 'Heartwood Talisman',
    flavor: 'A knot of livewood cut from Mielikki’s grove, still warm with sap.',
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
    flavor: 'Oversized vambraces that lend a giant’s pull to a mortal arm.',
    effect: 'Your blows rend for +4 bleed damage',
    effects: { bleedDamage: 4 },
    slot: 'rend',
  },
  {
    id: 'cloak-of-the-nightwind',
    name: 'Cloak of the Nightwind',
    flavor: 'Spun from shadow and a hunting cat’s quiet.',
    effect: 'Critical hits land on 19–20',
    effects: { critRangeBonus: 1 },
    slot: 'precision',
  },
  {
    id: 'sages-diadem',
    name: 'Sage’s Diadem',
    flavor: 'A thin circlet that hums faintly against the temples.',
    effect: '+1 spell save DC and +2 spell damage',
    effects: { spellDcBonus: 1, spellDamageBonus: 2 },
    slot: 'spellfocus',
  },
  {
    id: 'hunters-eye',
    name: 'Hunter’s Eye',
    flavor: 'A petrified raptor’s eye that never blinks at a weak point.',
    effect: 'Heal 4% of damage dealt; crits land on 19–20',
    effects: { lifestealPct: 4, critRangeBonus: 1 },
    slot: 'vampire',
  },

  // --- Set: Aegis of the Vigil (class-agnostic, 3 pieces) -------------------
  {
    id: 'vigil-helm',
    name: 'Vigil Helm',
    flavor: 'A warden’s greathelm, dented by blows that never reached the soul.',
    effect: 'Gain 4 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 4 },
    slot: 'aegis',
    setId: 'vigil',
  },
  {
    id: 'vigil-mantle',
    name: 'Vigil Mantle',
    flavor: 'A heavy cloak stitched with the sigils of the wall-watch.',
    effect: 'Gain 4 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 4 },
    slot: 'aegis',
    setId: 'vigil',
  },
  {
    id: 'vigil-heart',
    name: 'Vigil Heart',
    flavor: 'A locket of clouded amber that steadies a failing pulse.',
    effect: 'Heal 5% of the damage you deal',
    effects: { lifestealPct: 5 },
    slot: 'vampire',
    setId: 'vigil',
  },

  // --- Set: Warsong Panoply (Fighter-bound, 2 pieces) ----------------------
  {
    id: 'warsong-gauntlet',
    name: 'Warsong Gauntlet',
    flavor: 'A war-leader’s gauntlet, its knuckles scarred from a hundred charges.',
    effect: '+3 damage on each follow-up swing',
    effects: { followupDamageBonus: 3 },
    slot: 'cascade',
    setId: 'warsong',
    classGate: 'fighter',
  },
  {
    id: 'warsong-crest',
    name: 'Warsong Crest',
    flavor: 'A crested helm that turns a battle-cry into something men follow.',
    effect: 'Your blows rend for +3 bleed damage',
    effects: { bleedDamage: 3 },
    slot: 'rend',
    setId: 'warsong',
    classGate: 'fighter',
  },

  // ========================================================================
  // ASCENSION-EXCLUSIVE SETS — New Game+ only (Ascension >= 1). None of the
  // relics below ever drop or get offered on a first/normal run; the gate lives
  // in legendaryDropPool / legendaryBankPool (allowExclusive). Each signature
  // class set is also class-BOUND (classGate), so it only drops for, themes to,
  // and equips on its own class.
  // ========================================================================

  // --- Set: Ironclad Vow (Fighter-bound, 3 pieces) -------------------------
  {
    id: 'ironclad-helm',
    name: 'Ironclad Helm',
    flavor: 'A line-captain’s greathelm, the visor worn smooth by oaths sworn through it.',
    effect: '+2 damage on each follow-up swing',
    effects: { followupDamageBonus: 2 },
    slot: 'cascade',
    setId: 'ironclad',
    classGate: 'fighter',
    ascensionExclusive: true,
  },
  {
    id: 'ironclad-greaves',
    name: 'Ironclad Greaves',
    flavor: 'Sabatons that have held a line no enemy crossed, dented but never turned.',
    effect: 'Gain 6 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 6 },
    slot: 'aegis',
    setId: 'ironclad',
    classGate: 'fighter',
    ascensionExclusive: true,
  },
  {
    id: 'ironclad-banner',
    name: 'Ironclad Banner',
    flavor: 'A war-standard half-burned and never lowered; the cloth still snaps in dead air.',
    effect: 'Critical hits land on 19–20',
    effects: { critRangeBonus: 1 },
    slot: 'precision',
    setId: 'ironclad',
    classGate: 'fighter',
    ascensionExclusive: true,
  },

  // --- Set: Bloodrage Pelts (Barbarian-bound, 3 pieces) --------------------
  {
    id: 'bloodrage-pelt',
    name: 'Bloodrage Pelt',
    flavor: 'The hide of a thing that died screaming, and screams a little still when the rage takes you.',
    effect: '+3 melee damage while Rage burns',
    effects: { rageDamageBonus: 3 },
    slot: 'signature',
    setId: 'bloodrage',
    classGate: 'barbarian',
    ascensionExclusive: true,
  },
  {
    id: 'bloodrage-fang',
    name: 'Bloodrage Fang',
    flavor: 'A tusk torn from a dire beast and lashed to the haft; the wounds it opens do not close.',
    effect: 'Your blows rend for +3 bleed damage',
    effects: { bleedDamage: 3 },
    slot: 'rend',
    setId: 'bloodrage',
    classGate: 'barbarian',
    ascensionExclusive: true,
  },
  {
    id: 'bloodrage-totem',
    name: 'Bloodrage Totem',
    flavor: 'Bone and red ochre bound with sinew — the ancestors lean close when it is carried into the dark.',
    effect: 'Gain 6 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 6 },
    slot: 'aegis',
    setId: 'bloodrage',
    classGate: 'barbarian',
    ascensionExclusive: true,
  },

  // --- Set: Wildstalker's Garb (Ranger-bound, 3 pieces) --------------------
  {
    id: 'wildstalker-cowl',
    name: 'Wildstalker Cowl',
    flavor: 'A hood of oiled leaf and shadow; under it, the marked quarry never quite leaves your sight.',
    effect: '+3 damage against your Hunter’s Mark target',
    effects: { markDamageBonus: 3 },
    slot: 'signature',
    setId: 'wildstalker',
    classGate: 'ranger',
    ascensionExclusive: true,
  },
  {
    id: 'wildstalker-quiver',
    name: 'Wildstalker Quiver',
    flavor: 'Fletched with feathers from birds that hunt in silence; the draw finds the gap of its own accord.',
    effect: 'Critical hits land on 19–20',
    effects: { critRangeBonus: 1 },
    slot: 'precision',
    setId: 'wildstalker',
    classGate: 'ranger',
    ascensionExclusive: true,
  },
  {
    id: 'wildstalker-pelt',
    name: 'Wildstalker Pelt',
    flavor: 'A predator’s hide that drinks a little of every kill and gives some warmth back.',
    effect: 'Heal 5% of the damage you deal',
    effects: { lifestealPct: 5 },
    slot: 'vampire',
    setId: 'wildstalker',
    classGate: 'ranger',
    ascensionExclusive: true,
  },

  // --- Set: Vestments of the Archmagi (Wizard-bound, 3 pieces) -------------
  {
    id: 'archmagi-vestments',
    name: 'Vestments of the Archmagi',
    flavor: 'Indigo silk sewn with cold-burning sigils; the weave thins the wall between word and ruin.',
    effect: '+3 spell damage',
    effects: { spellDamageBonus: 3 },
    slot: 'spellpower',
    setId: 'archmagi',
    classGate: 'wizard',
    ascensionExclusive: true,
  },
  {
    id: 'archmagi-amulet',
    name: 'Amulet of the Archmagi',
    flavor: 'A pendant of glass that holds a fixed star; the eye behind the spell never wavers.',
    effect: '+1 spell attack rolls',
    effects: { spellAttackBonus: 1 },
    slot: 'spellpower',
    setId: 'archmagi',
    classGate: 'wizard',
    ascensionExclusive: true,
  },
  {
    id: 'archmagi-orb',
    name: 'Orb of the Archmagi',
    flavor: 'A sphere of frozen quintessence; spoken law settles into the world a fraction harder around it.',
    effect: '+1 spell save DC',
    effects: { spellDcBonus: 1 },
    slot: 'spellfocus',
    setId: 'archmagi',
    classGate: 'wizard',
    ascensionExclusive: true,
  },

  // --- Set: Greenwarden's Mantle (Druid-bound, 3 pieces) -------------------
  {
    id: 'greenwarden-mantle',
    name: 'Greenwarden Mantle',
    flavor: 'Living moss and bark grown into a cloak; it knits the wearer’s hurts as it does the forest’s.',
    effect: 'Regenerate 2 HP at the start of each turn',
    effects: { regenPerTurn: 2 },
    slot: 'renewal',
    setId: 'greenwarden',
    classGate: 'druid',
    ascensionExclusive: true,
  },
  {
    id: 'greenwarden-circlet',
    name: 'Greenwarden Circlet',
    flavor: 'A ring of braided green wood that never dries; the old growl of the wild speaks louder through it.',
    effect: '+3 spell damage',
    effects: { spellDamageBonus: 3 },
    slot: 'spellpower',
    setId: 'greenwarden',
    classGate: 'druid',
    ascensionExclusive: true,
  },
  {
    id: 'greenwarden-seed',
    name: 'Greenwarden Seed',
    flavor: 'A seed that quickens against the skin; what it takes from the foe, it returns to the bearer as sap.',
    effect: 'Heal 5% of the damage you deal',
    effects: { lifestealPct: 5 },
    slot: 'vampire',
    setId: 'greenwarden',
    classGate: 'druid',
    ascensionExclusive: true,
  },

  // --- Set: Shadowdancer's Suite (Rogue-bound, 3 pieces) -------------------
  {
    id: 'shadowdancer-cowl',
    name: 'Shadowdancer Cowl',
    flavor: 'A cowl woven from the dark between torches; the killing strike finds the seam every time.',
    effect: '+3 damage on the strike Sneak Attack fires',
    effects: { sneakDamageBonus: 3 },
    slot: 'signature',
    setId: 'shadowdancer',
    classGate: 'rogue',
    ascensionExclusive: true,
  },
  {
    id: 'shadowdancer-cloak',
    name: 'Shadowdancer Cloak',
    flavor: 'It pools like spilled ink and pays the wearer back a little life for every wound dealt.',
    effect: 'Heal 5% of the damage you deal',
    effects: { lifestealPct: 5 },
    slot: 'vampire',
    setId: 'shadowdancer',
    classGate: 'rogue',
    ascensionExclusive: true,
  },
  {
    id: 'shadowdancer-blade',
    name: 'Shadowdancer Blade',
    flavor: 'A fang of black glass that drinks the light off its own edge; it bites true more often than it should.',
    effect: 'Critical hits land on 19–20',
    effects: { critRangeBonus: 1 },
    slot: 'precision',
    setId: 'shadowdancer',
    classGate: 'rogue',
    ascensionExclusive: true,
  },

  // --- Global Set: Revenant's Resolve (class-agnostic, 3 pieces) -----------
  {
    id: 'revenant-heart',
    name: 'Revenant Heart',
    flavor: 'A heart of cold iron that beats only when its bearer has died at least once. It has.',
    effect: 'Gain 6 temporary HP at the start of each fight',
    effects: { tempHpPerCombat: 6 },
    slot: 'aegis',
    setId: 'revenant',
    ascensionExclusive: true,
  },
  {
    id: 'revenant-shroud',
    name: 'Revenant Shroud',
    flavor: 'Grave-linen that refused to stay in the grave; the wounds beneath it close on their own.',
    effect: 'Regenerate 2 HP at the start of each turn',
    effects: { regenPerTurn: 2 },
    slot: 'renewal',
    setId: 'revenant',
    ascensionExclusive: true,
  },
  {
    id: 'revenant-chain',
    name: 'Revenant Chain',
    flavor: 'A length of funeral chain that binds a fragment of the wheel to the one who carries it.',
    effect: 'Heal 5% of the damage you deal',
    effects: { lifestealPct: 5 },
    slot: 'vampire',
    setId: 'revenant',
    ascensionExclusive: true,
  },

  // --- Global Set: Conqueror's Wake (class-agnostic, 3 pieces) -------------
  {
    id: 'conqueror-crown',
    name: 'Conqueror Crown',
    flavor: 'Beaten from the melted crowns of kings who fell to the chain. It weighs more than gold should.',
    effect: 'Your blows rend for +4 bleed damage',
    effects: { bleedDamage: 4 },
    slot: 'rend',
    setId: 'conqueror',
    ascensionExclusive: true,
  },
  {
    id: 'conqueror-gauntlet',
    name: 'Conqueror Gauntlet',
    flavor: 'A gauntlet that has closed on a hundred surrenders; the killing eye comes easy to its hand.',
    effect: 'Critical hits land on 19–20',
    effects: { critRangeBonus: 1 },
    slot: 'precision',
    setId: 'conqueror',
    ascensionExclusive: true,
  },
  {
    id: 'conqueror-sigil',
    name: 'Conqueror Sigil',
    flavor: 'A war-seal that drinks the field’s spilled strength back into the one who holds the ground.',
    effect: 'Heal 5% of the damage you deal',
    effects: { lifestealPct: 5 },
    slot: 'vampire',
    setId: 'conqueror',
    ascensionExclusive: true,
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
    effect: 'Heal 8% of the damage you deal; critical hits land on 19–20',
    effects: { lifestealPct: 8, critRangeBonus: 1 },
    slot: 'vampire',
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
export function legendaryDropPool(
  classId: ClassId,
  allowAscendant = false,
  allowExclusive = false,
): string[] {
  return LEGENDARIES.filter(
    (l) =>
      (!l.classGate || l.classGate === classId) &&
      (allowAscendant || !l.ascendant) &&
      (allowExclusive || !l.ascensionExclusive),
  ).map((l) => l.id);
}

/**
 * The any-class pool an elite-node DROP banks from (off-class relics are stashed
 * until the player runs that class). The apex ascendant tier is included ONLY
 * when `allowAscendant` (Ascension >= 3); otherwise those relics never drop.
 */
export function legendaryBankPool(allowAscendant: boolean, allowExclusive = false): string[] {
  return LEGENDARIES.filter(
    (l) => (allowAscendant || !l.ascendant) && (allowExclusive || !l.ascensionExclusive),
  ).map((l) => l.id);
}

/** Whether a relic may be EQUIPPED by a character of the given class (class-bound gate). */
export function canEquipLegendary(id: string, classId: ClassId): boolean {
  const leg = BY_ID.get(id);
  if (!leg) return false;
  return !leg.classGate || leg.classGate === classId;
}

/**
 * The effect payloads of the equipped relics PLUS any completed-set bonuses, as a
 * flat list. `metaStore.applyRelicLoadout` bakes this onto the character;
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
