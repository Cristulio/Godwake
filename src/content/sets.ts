import type { AffixModifiers } from '../schemas/item';
import type { ClassId } from '../schemas/ids';
import type { EquipSlot } from '../engine/character/equip';

/**
 * Persistent SET GEAR (Diablo II style). A set piece is a real EQUIPPABLE SLOT
 * item — a weapon, armour, or accessory (base stats live in
 * content/items/setBases.ts) — that the soul banks cross-delve and re-equips at
 * the hub, where it REPLACES whatever rolled item sits in that slot. Each piece
 * is stronger than the best rolled (purple) gear for its slot: it carries a
 * guaranteed effect payload PLUS a flat `+N` enhancement (weapons/armour).
 * Equipping multiple pieces of one set grants PARTIAL, SCALING set bonuses
 * (2-piece, 3-piece…) layered ON TOP of the pieces' own slot stats.
 *
 * This is the slot-gear layer. Legendaries (content/legendaries.ts) are the
 * separate effect-only boon layer. A class-bound set only DROPS for (and themes
 * to) its class, and only equips while playing it; universal sets are
 * accessories any class can wear.
 */

export interface SetPiece {
  /** Piece id — identical to its base item id (content/items/setBases.ts). */
  id: string;
  /** The set this piece belongs to (content GEAR_SETS). */
  setId: string;
  /** Display name (mirrors the base item name). */
  name: string;
  /** One-line flavour in the Forgotten Realms / BG2 voice. */
  flavor: string;
  /**
   * The canonical equip slot the piece fills. Rings use `ring1` as their
   * canonical slot; metaStore.equipSetPiece routes a ring to the first free band.
   */
  slot: EquipSlot;
  /** The effect payload baked onto the character while the piece is equipped. */
  effects: AffixModifiers;
  /** Player-facing one-line effect text. */
  effectLine: string;
  /**
   * Flat `+N` enhancement materialised onto the piece's ItemRef (weapons:
   * attack + damage; armour/shield: AC). Keeps the piece above the best rolled
   * loot for its slot. Absent on accessories / robes (no base stats to lift).
   */
  enhancement?: number;
  /** Class-bound: only drops for, themes to, and equips while playing this class. */
  classGate?: ClassId;
  /** Ascension-EXCLUSIVE: only drops on a New Game+ run (Ascension >= 1). */
  ascensionExclusive?: boolean;
}

export interface SetBonusTier {
  /** Active set pieces required for this tier to apply. */
  piecesRequired: number;
  /** Player-facing line shown on the set-gear screen. */
  label: string;
  /** Effect payload granted while the tier is met. */
  bonuses: AffixModifiers;
}

export interface GearSet {
  id: string;
  name: string;
  flavor: string;
  /** A class-bound set only drops for / equips on this class. */
  classGate?: ClassId;
  /** True for every piece of an Ascension-exclusive (New Game+) set. */
  ascensionExclusive?: boolean;
  /** Piece ids that make up the set, in display order. */
  pieceIds: string[];
  /** Ascending thresholds; EVERY met threshold applies (they stack). */
  bonuses: SetBonusTier[];
}

// ---------------------------------------------------------------------------
// The set pieces. Effects + flavour carry over from the relic-sets they were
// CONVERTED from; each now equips into a real slot instead of a typed relic slot.
// ---------------------------------------------------------------------------

export const SET_PIECES: SetPiece[] = [
  // --- Vigil (universal) ---------------------------------------------------
  {
    id: 'vigil-helm', setId: 'vigil', name: 'Vigil Helm', slot: 'helm',
    flavor: 'A warden’s greathelm, dented by blows that never reached the soul.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
  },
  {
    id: 'vigil-mantle', setId: 'vigil', name: 'Vigil Mantle', slot: 'amulet',
    flavor: 'A heavy cloak stitched with the sigils of the wall-watch.',
    effects: { tempHpPerCombat: 4 }, effectLine: 'Gain 4 temporary HP at the start of each fight',
  },
  {
    id: 'vigil-heart', setId: 'vigil', name: 'Vigil Heart', slot: 'ring1',
    flavor: 'A locket of clouded amber that steadies a failing pulse.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
  },

  // --- Warsong (Fighter-bound) ---------------------------------------------
  {
    id: 'warsong-gauntlet', setId: 'warsong', name: 'Warsong Gauntlet', slot: 'belt',
    flavor: 'A war-leader’s gauntlet, its knuckles scarred from a hundred charges.',
    effects: { followupDamageBonus: 3 }, effectLine: '+3 damage on each follow-up swing',
    classGate: 'fighter',
  },
  {
    id: 'warsong-crest', setId: 'warsong', name: 'Warsong Crest', slot: 'helm',
    flavor: 'A crested helm that turns a battle-cry into something men follow.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
    classGate: 'fighter',
  },

  // --- Ironclad Vow (Fighter, NG+) -----------------------------------------
  {
    id: 'ironclad-banner', setId: 'ironclad', name: 'Ironclad Banner', slot: 'mainHand',
    flavor: 'A war-standard half-burned and never lowered; its haft strikes like the line it rallies.',
    effects: { followupDamageBonus: 2 }, effectLine: '+2 damage on each follow-up swing',
    enhancement: 2, classGate: 'fighter', ascensionExclusive: true,
  },
  {
    id: 'ironclad-greaves', setId: 'ironclad', name: 'Ironclad Greaves', slot: 'armor',
    flavor: 'Plate that has held a line no enemy crossed, dented but never turned.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    enhancement: 2, classGate: 'fighter', ascensionExclusive: true,
  },
  {
    id: 'ironclad-helm', setId: 'ironclad', name: 'Ironclad Helm', slot: 'helm',
    flavor: 'A line-captain’s greathelm, the visor worn smooth by oaths sworn through it.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'fighter', ascensionExclusive: true,
  },

  // --- Bloodrage Pelts (Barbarian, NG+) ------------------------------------
  {
    id: 'bloodrage-fang', setId: 'bloodrage', name: 'Bloodrage Fang', slot: 'mainHand',
    flavor: 'A tusk torn from a dire beast and lashed to a haft; the wounds it opens do not close.',
    effects: { bleedDamage: 3 }, effectLine: 'Your blows rend for +3 bleed damage',
    enhancement: 2, classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-pelt', setId: 'bloodrage', name: 'Bloodrage Pelt', slot: 'armor',
    flavor: 'The hide of a thing that died screaming, and screams a little still when the rage takes you.',
    effects: { rageDamageBonus: 3 }, effectLine: '+3 melee damage while Rage burns',
    enhancement: 2, classGate: 'barbarian', ascensionExclusive: true,
  },
  {
    id: 'bloodrage-totem', setId: 'bloodrage', name: 'Bloodrage Totem', slot: 'amulet',
    flavor: 'Bone and red ochre bound with sinew — the ancestors lean close when it is carried into the dark.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    classGate: 'barbarian', ascensionExclusive: true,
  },

  // --- Wildstalker's Garb (Ranger, NG+) ------------------------------------
  {
    id: 'wildstalker-pelt', setId: 'wildstalker', name: 'Wildstalker Pelt', slot: 'armor',
    flavor: 'A predator’s hide that drinks a little of every kill and gives some warmth back.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    enhancement: 2, classGate: 'ranger', ascensionExclusive: true,
  },
  {
    id: 'wildstalker-cowl', setId: 'wildstalker', name: 'Wildstalker Cowl', slot: 'helm',
    flavor: 'A hood of oiled leaf and shadow; under it, the marked quarry never quite leaves your sight.',
    effects: { markDamageBonus: 3 }, effectLine: '+3 damage against your Hunter’s Mark target',
    classGate: 'ranger', ascensionExclusive: true,
  },
  {
    id: 'wildstalker-quiver', setId: 'wildstalker', name: 'Wildstalker Quiver', slot: 'belt',
    flavor: 'Fletched with feathers from birds that hunt in silence; the draw finds the gap of its own accord.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    classGate: 'ranger', ascensionExclusive: true,
  },

  // --- Vestments of the Archmagi (Wizard, NG+) -----------------------------
  {
    id: 'archmagi-vestments', setId: 'archmagi', name: 'Vestments of the Archmagi', slot: 'armor',
    flavor: 'Indigo silk sewn with cold-burning sigils; the weave thins the wall between word and ruin.',
    effects: { spellDamageBonus: 3 }, effectLine: '+3 spell damage',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-amulet', setId: 'archmagi', name: 'Amulet of the Archmagi', slot: 'amulet',
    flavor: 'A pendant of glass that holds a fixed star; the eye behind the spell never wavers.',
    effects: { spellAttackBonus: 1 }, effectLine: '+1 spell attack rolls',
    classGate: 'wizard', ascensionExclusive: true,
  },
  {
    id: 'archmagi-orb', setId: 'archmagi', name: 'Orb of the Archmagi', slot: 'ring1',
    flavor: 'A sphere of frozen quintessence; spoken law settles into the world a fraction harder around it.',
    effects: { spellDcBonus: 1 }, effectLine: '+1 spell save DC',
    classGate: 'wizard', ascensionExclusive: true,
  },

  // --- Greenwarden's Mantle (Druid, NG+) -----------------------------------
  {
    id: 'greenwarden-mantle', setId: 'greenwarden', name: 'Greenwarden Mantle', slot: 'armor',
    flavor: 'Living moss and bark grown into a cloak; it knits the wearer’s hurts as it does the forest’s.',
    effects: { regenPerTurn: 2 }, effectLine: 'Regenerate 2 HP at the start of each turn',
    enhancement: 2, classGate: 'druid', ascensionExclusive: true,
  },
  {
    id: 'greenwarden-circlet', setId: 'greenwarden', name: 'Greenwarden Circlet', slot: 'helm',
    flavor: 'A ring of braided green wood that never dries; the old growl of the wild speaks louder through it.',
    effects: { spellDamageBonus: 3 }, effectLine: '+3 spell damage',
    classGate: 'druid', ascensionExclusive: true,
  },
  {
    id: 'greenwarden-seed', setId: 'greenwarden', name: 'Greenwarden Seed', slot: 'amulet',
    flavor: 'A seed that quickens against the skin; what it takes from the foe, it returns to the bearer as sap.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    classGate: 'druid', ascensionExclusive: true,
  },

  // --- Shadowdancer's Suite (Rogue, NG+) -----------------------------------
  {
    id: 'shadowdancer-blade', setId: 'shadowdancer', name: 'Shadowdancer Blade', slot: 'mainHand',
    flavor: 'A fang of black glass that drinks the light off its own edge; it bites true more often than it should.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    enhancement: 2, classGate: 'rogue', ascensionExclusive: true,
  },
  {
    id: 'shadowdancer-cloak', setId: 'shadowdancer', name: 'Shadowdancer Cloak', slot: 'armor',
    flavor: 'It pools like spilled ink and pays the wearer back a little life for every wound dealt.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    enhancement: 2, classGate: 'rogue', ascensionExclusive: true,
  },
  {
    id: 'shadowdancer-cowl', setId: 'shadowdancer', name: 'Shadowdancer Cowl', slot: 'helm',
    flavor: 'A cowl woven from the dark between torches; the killing strike finds the seam every time.',
    effects: { sneakDamageBonus: 3 }, effectLine: '+3 damage on the strike Sneak Attack fires',
    classGate: 'rogue', ascensionExclusive: true,
  },

  // --- Revenant's Resolve (universal, NG+) ---------------------------------
  {
    id: 'revenant-heart', setId: 'revenant', name: 'Revenant Heart', slot: 'amulet',
    flavor: 'A heart of cold iron that beats only when its bearer has died at least once. It has.',
    effects: { tempHpPerCombat: 6 }, effectLine: 'Gain 6 temporary HP at the start of each fight',
    ascensionExclusive: true,
  },
  {
    id: 'revenant-shroud', setId: 'revenant', name: 'Revenant Shroud', slot: 'boots',
    flavor: 'Grave-linen that refused to stay in the grave; the wounds beneath it close on their own.',
    effects: { regenPerTurn: 2 }, effectLine: 'Regenerate 2 HP at the start of each turn',
    ascensionExclusive: true,
  },
  {
    id: 'revenant-chain', setId: 'revenant', name: 'Revenant Chain', slot: 'ring1',
    flavor: 'A length of funeral chain that binds a fragment of the wheel to the one who carries it.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    ascensionExclusive: true,
  },

  // --- Conqueror's Wake (universal, NG+) -----------------------------------
  {
    id: 'conqueror-crown', setId: 'conqueror', name: 'Conqueror Crown', slot: 'helm',
    flavor: 'Beaten from the melted crowns of kings who fell to the chain. It weighs more than gold should.',
    effects: { bleedDamage: 4 }, effectLine: 'Your blows rend for +4 bleed damage',
    ascensionExclusive: true,
  },
  {
    id: 'conqueror-gauntlet', setId: 'conqueror', name: 'Conqueror Gauntlet', slot: 'ring1',
    flavor: 'A gauntlet that has closed on a hundred surrenders; the killing eye comes easy to its hand.',
    effects: { critRangeBonus: 1 }, effectLine: 'Critical hits land on 19–20',
    ascensionExclusive: true,
  },
  {
    id: 'conqueror-sigil', setId: 'conqueror', name: 'Conqueror Sigil', slot: 'amulet',
    flavor: 'A war-seal that drinks the field’s spilled strength back into the one who holds the ground.',
    effects: { lifestealPct: 5 }, effectLine: 'Heal 5% of the damage you deal',
    ascensionExclusive: true,
  },
];

export const GEAR_SETS: GearSet[] = [
  {
    id: 'vigil',
    name: 'Aegis of the Vigil',
    flavor: 'Wargear of the wardens who never broke at the wall.',
    pieceIds: ['vigil-helm', 'vigil-mantle', 'vigil-heart'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 temporary HP each fight', bonuses: { tempHpPerCombat: 4 } },
      { piecesRequired: 3, label: '3-piece: heal 5% of the damage you deal', bonuses: { lifestealPct: 5 } },
    ],
  },
  {
    id: 'warsong',
    name: 'Warsong Panoply',
    flavor: 'A war-leader’s regalia, forged for those who lead the charge.',
    classGate: 'fighter',
    pieceIds: ['warsong-gauntlet', 'warsong-crest'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: crits land on 19-20, +2 follow-up damage',
        bonuses: { critRangeBonus: 1, followupDamageBonus: 2 },
      },
    ],
  },
  {
    id: 'ironclad',
    name: 'Ironclad Vow',
    flavor: 'The regalia of a line-captain who never gave ground, sworn anew across the wheel.',
    classGate: 'fighter',
    ascensionExclusive: true,
    pieceIds: ['ironclad-banner', 'ironclad-greaves', 'ironclad-helm'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 damage on each follow-up swing', bonuses: { followupDamageBonus: 4 } },
      {
        piecesRequired: 3,
        label: '3-piece: +8 temporary HP each fight, and crits land on 19–20',
        bonuses: { tempHpPerCombat: 8, critRangeBonus: 1 },
      },
    ],
  },
  {
    id: 'bloodrage',
    name: 'Bloodrage Pelts',
    flavor: 'The trophies of a soul that learned to carry its fury back through every death.',
    classGate: 'barbarian',
    ascensionExclusive: true,
    pieceIds: ['bloodrage-fang', 'bloodrage-pelt', 'bloodrage-totem'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 melee damage while Rage burns', bonuses: { rageDamageBonus: 4 } },
      {
        piecesRequired: 3,
        label: '3-piece: +5 bleed damage, and crits land on 19–20',
        bonuses: { bleedDamage: 5, critRangeBonus: 1 },
      },
    ],
  },
  {
    id: 'wildstalker',
    name: "Wildstalker's Garb",
    flavor: 'A hunter’s gear worn so long across so many lives that the quarry forgets it can be unseen.',
    classGate: 'ranger',
    ascensionExclusive: true,
    pieceIds: ['wildstalker-pelt', 'wildstalker-cowl', 'wildstalker-quiver'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 damage against your Hunter’s Mark target', bonuses: { markDamageBonus: 5 } },
      { piecesRequired: 3, label: '3-piece: heal 6% of the damage you deal', bonuses: { lifestealPct: 6 } },
    ],
  },
  {
    id: 'archmagi',
    name: 'Vestments of the Archmagi',
    flavor: 'The full panoply of a mage who outlived the spells that should have ended them.',
    classGate: 'wizard',
    ascensionExclusive: true,
    pieceIds: ['archmagi-vestments', 'archmagi-amulet', 'archmagi-orb'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +4 spell damage and +1 spell attack', bonuses: { spellDamageBonus: 4, spellAttackBonus: 1 } },
      { piecesRequired: 3, label: '3-piece: +1 spell save DC and +1 level-1 spell slot', bonuses: { spellDcBonus: 1, bonusSpellSlotsL1: 1 } },
    ],
  },
  {
    id: 'greenwarden',
    name: "Greenwarden's Mantle",
    flavor: 'Living gear grown for a warden of the wild who tends their own wounds as the forest’s.',
    classGate: 'druid',
    ascensionExclusive: true,
    pieceIds: ['greenwarden-mantle', 'greenwarden-circlet', 'greenwarden-seed'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: regenerate 3 HP each turn', bonuses: { regenPerTurn: 3 } },
      { piecesRequired: 3, label: '3-piece: +4 spell damage and heal 5% of the damage you deal', bonuses: { spellDamageBonus: 4, lifestealPct: 5 } },
    ],
  },
  {
    id: 'shadowdancer',
    name: "Shadowdancer's Suite",
    flavor: 'The dark-woven kit of a killer who steps between lives the way they step between shadows.',
    classGate: 'rogue',
    ascensionExclusive: true,
    pieceIds: ['shadowdancer-blade', 'shadowdancer-cloak', 'shadowdancer-cowl'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 damage on the strike Sneak Attack fires', bonuses: { sneakDamageBonus: 5 } },
      { piecesRequired: 3, label: '3-piece: crits land on 19–20, and heal 5% of the damage you deal', bonuses: { critRangeBonus: 1, lifestealPct: 5 } },
    ],
  },
  {
    id: 'revenant',
    name: "Revenant's Resolve",
    flavor: 'Grave-gear that only answers to a soul the wheel has already carried back from death.',
    ascensionExclusive: true,
    pieceIds: ['revenant-heart', 'revenant-shroud', 'revenant-chain'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +8 temporary HP each fight', bonuses: { tempHpPerCombat: 8 } },
      { piecesRequired: 3, label: '3-piece: regenerate 3 HP each turn, and heal 5% of the damage you deal', bonuses: { regenPerTurn: 3, lifestealPct: 5 } },
    ],
  },
  {
    id: 'conqueror',
    name: "Conqueror's Wake",
    flavor: 'Forged from the spoils of cleared chains, for the soul that takes ground and keeps it.',
    ascensionExclusive: true,
    pieceIds: ['conqueror-crown', 'conqueror-gauntlet', 'conqueror-sigil'],
    bonuses: [
      { piecesRequired: 2, label: '2-piece: +5 bleed damage', bonuses: { bleedDamage: 5 } },
      { piecesRequired: 3, label: '3-piece: crits land on 19–20, and heal 6% of the damage you deal', bonuses: { critRangeBonus: 1, lifestealPct: 6 } },
    ],
  },
];

const SET_BY_ID = new Map(GEAR_SETS.map((s) => [s.id, s]));
const PIECE_BY_ID = new Map(SET_PIECES.map((p) => [p.id, p]));

/** Stable id list of every set piece — drop pools, validity checks. */
export const SET_PIECE_ORDER: readonly string[] = SET_PIECES.map((p) => p.id);

export function getGearSet(id: string): GearSet | undefined {
  return SET_BY_ID.get(id);
}

export function getSetPiece(id: string): SetPiece | undefined {
  return PIECE_BY_ID.get(id);
}

/** The set a piece belongs to, if any. */
export function setForPiece(pieceId: string): GearSet | undefined {
  const piece = PIECE_BY_ID.get(pieceId);
  return piece ? SET_BY_ID.get(piece.setId) : undefined;
}

/** Whether a set piece may be EQUIPPED by a character of the given class. */
export function canEquipSetPiece(id: string, classId: ClassId): boolean {
  const piece = PIECE_BY_ID.get(id);
  if (!piece) return false;
  return !piece.classGate || piece.classGate === classId;
}

/**
 * Set piece ids appropriate to DROP for a given class: every universal piece
 * plus that class's own bound pieces, with the Ascension-exclusive (New Game+)
 * pieces folded in only when `allowExclusive`.
 */
export function setPieceDropPool(classId: ClassId, allowExclusive: boolean): string[] {
  return SET_PIECES.filter(
    (p) => (!p.classGate || p.classGate === classId) && (allowExclusive || !p.ascensionExclusive),
  ).map((p) => p.id);
}

/**
 * Every met set-tier bonus from the currently-equipped set-piece ids, as a flat
 * list of effect payloads (each met threshold contributes its own entry; they
 * stack).
 */
export function computeSetBonuses(activeIds: readonly string[]): AffixModifiers[] {
  const active = new Set(activeIds);
  const out: AffixModifiers[] = [];
  for (const set of GEAR_SETS) {
    const have = set.pieceIds.filter((id) => active.has(id)).length;
    if (have < 2) continue;
    for (const tier of set.bonuses) {
      if (have >= tier.piecesRequired) out.push(tier.bonuses);
    }
  }
  return out;
}

/** How many pieces of a set are in the given active-id list (set-progress UI). */
export function setProgress(set: GearSet, activeIds: readonly string[]): number {
  const active = new Set(activeIds);
  return set.pieceIds.filter((id) => active.has(id)).length;
}

/**
 * The effect payloads of the equipped set pieces PLUS any completed-set bonuses,
 * as a flat list. metaStore.applySetLoadout bakes this onto the character
 * (`setEffects`); characterAffixMods folds each entry into the shared affix
 * pipeline so the effects ride every channel the engine already reads. The
 * pieces' base stats + `+N` enhancement ride the normal equipment path instead.
 */
export function aggregateSetEffects(ids: readonly string[]): AffixModifiers[] {
  const out: AffixModifiers[] = [];
  for (const id of ids) {
    const piece = PIECE_BY_ID.get(id);
    if (piece) out.push(piece.effects);
  }
  out.push(...computeSetBonuses(ids));
  return out;
}
