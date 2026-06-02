import type { AffixModifiers } from '../schemas/item';
import type { ClassId } from '../schemas/ids';

/**
 * Legendary SETS (Diablo II style). Each piece is its own legendary relic equipped
 * at the hub; equipping more pieces of a set grants PARTIAL, SCALING EFFECTS on
 * top of each piece's solo effect (2-piece, 3-piece…).
 *
 * Set bonuses are pure EFFECTS (the affix payload), like the relics themselves —
 * no armour class, no weapon damage. A class-bound set only DROPS for (and themes
 * to) its class, but any owned piece is stashed regardless; the equip gate lives
 * in metaStore.setActiveLegendaries.
 */

export interface SetBonusTier {
  /** Active set pieces required for this tier to apply. */
  piecesRequired: number;
  /** Player-facing line shown on the relic screen. */
  label: string;
  /** Effect payload granted while the tier is met. */
  bonuses: AffixModifiers;
}

export interface LegendarySet {
  id: string;
  name: string;
  flavor: string;
  /**
   * A class-bound set only DROPS for (and themes to) this class. Omit for a
   * class-agnostic set. Owned pieces are always stashed; the equip gate is in
   * metaStore.setActiveLegendaries.
   */
  classGate?: ClassId;
  /** Relic ids that make up the set, in display order. */
  pieceIds: string[];
  /** Ascending thresholds; EVERY met threshold applies (they stack). */
  bonuses: SetBonusTier[];
}

export const SETS: LegendarySet[] = [
  {
    id: 'vigil',
    name: 'Aegis of the Vigil',
    flavor: 'Wargear of the wardens who never broke at the wall.',
    pieceIds: ['vigil-helm', 'vigil-mantle', 'vigil-heart'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +4 temporary HP each fight',
        bonuses: { tempHpPerCombat: 4 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: heal 8% of the damage you deal',
        bonuses: { lifestealPct: 8 },
      },
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

  // ========================================================================
  // ASCENSION-EXCLUSIVE SETS — New Game+ only. The pieces (content/legendaries.ts)
  // are flagged `ascensionExclusive`, so they only drop on a run at Ascension >= 1;
  // the bonuses below need no gate of their own (you cannot equip pieces you can
  // never earn on a first chain). Each signature set is also class-BOUND; the two
  // global sets at the end are class-agnostic.
  // ========================================================================

  // --- Signature class sets ------------------------------------------------
  {
    id: 'ironclad',
    name: 'Ironclad Vow',
    flavor: 'The regalia of a line-captain who never gave ground, sworn anew across the wheel.',
    classGate: 'fighter',
    pieceIds: ['ironclad-helm', 'ironclad-greaves', 'ironclad-banner'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +4 damage on each follow-up swing',
        bonuses: { followupDamageBonus: 4 },
      },
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
    pieceIds: ['bloodrage-pelt', 'bloodrage-fang', 'bloodrage-totem'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +4 melee damage while Rage burns',
        bonuses: { rageDamageBonus: 4 },
      },
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
    pieceIds: ['wildstalker-cowl', 'wildstalker-quiver', 'wildstalker-pelt'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +5 damage against your Hunter’s Mark target',
        bonuses: { markDamageBonus: 5 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: heal 12% of the damage you deal',
        bonuses: { lifestealPct: 12 },
      },
    ],
  },
  {
    id: 'archmagi',
    name: 'Vestments of the Archmagi',
    flavor: 'The full panoply of a mage who outlived the spells that should have ended them.',
    classGate: 'wizard',
    pieceIds: ['archmagi-vestments', 'archmagi-amulet', 'archmagi-orb'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +4 spell damage and +1 spell attack',
        bonuses: { spellDamageBonus: 4, spellAttackBonus: 1 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: +1 spell save DC and +1 level-1 spell slot',
        bonuses: { spellDcBonus: 1, bonusSpellSlotsL1: 1 },
      },
    ],
  },
  {
    id: 'greenwarden',
    name: "Greenwarden's Mantle",
    flavor: 'Living gear grown for a warden of the wild who tends their own wounds as the forest’s.',
    classGate: 'druid',
    pieceIds: ['greenwarden-mantle', 'greenwarden-circlet', 'greenwarden-seed'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: regenerate 3 HP each turn',
        bonuses: { regenPerTurn: 3 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: +4 spell damage and heal 10% of the damage you deal',
        bonuses: { spellDamageBonus: 4, lifestealPct: 10 },
      },
    ],
  },
  {
    id: 'shadowdancer',
    name: "Shadowdancer's Suite",
    flavor: 'The dark-woven kit of a killer who steps between lives the way they step between shadows.',
    classGate: 'rogue',
    pieceIds: ['shadowdancer-cowl', 'shadowdancer-cloak', 'shadowdancer-blade'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +5 damage on the strike Sneak Attack fires',
        bonuses: { sneakDamageBonus: 5 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: crits land on 19–20, and heal 10% of the damage you deal',
        bonuses: { critRangeBonus: 1, lifestealPct: 10 },
      },
    ],
  },

  // --- Global ascension-exclusive sets (class-agnostic) --------------------
  {
    id: 'revenant',
    name: "Revenant's Resolve",
    flavor: 'Grave-gear that only answers to a soul the wheel has already carried back from death.',
    pieceIds: ['revenant-heart', 'revenant-shroud', 'revenant-chain'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +8 temporary HP each fight',
        bonuses: { tempHpPerCombat: 8 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: regenerate 3 HP each turn, and heal 10% of the damage you deal',
        bonuses: { regenPerTurn: 3, lifestealPct: 10 },
      },
    ],
  },
  {
    id: 'conqueror',
    name: "Conqueror's Wake",
    flavor: 'Forged from the spoils of cleared chains, for the soul that takes ground and keeps it.',
    pieceIds: ['conqueror-crown', 'conqueror-gauntlet', 'conqueror-sigil'],
    bonuses: [
      {
        piecesRequired: 2,
        label: '2-piece: +5 bleed damage',
        bonuses: { bleedDamage: 5 },
      },
      {
        piecesRequired: 3,
        label: '3-piece: crits land on 19–20, and heal 12% of the damage you deal',
        bonuses: { critRangeBonus: 1, lifestealPct: 12 },
      },
    ],
  },
];

const SET_BY_ID = new Map(SETS.map((s) => [s.id, s]));

export function getSet(id: string): LegendarySet | undefined {
  return SET_BY_ID.get(id);
}

/** The set a relic belongs to, if any. */
export function setForPiece(relicId: string): LegendarySet | undefined {
  return SETS.find((s) => s.pieceIds.includes(relicId));
}

/**
 * Every met set-tier bonus from the currently-equipped relic ids, as a flat list
 * of effect payloads (each met threshold contributes its own entry; they stack).
 */
export function computeSetBonuses(activeIds: readonly string[]): AffixModifiers[] {
  const active = new Set(activeIds);
  const out: AffixModifiers[] = [];
  for (const set of SETS) {
    const have = set.pieceIds.filter((id) => active.has(id)).length;
    if (have < 2) continue;
    for (const tier of set.bonuses) {
      if (have >= tier.piecesRequired) out.push(tier.bonuses);
    }
  }
  return out;
}

/**
 * How many pieces of a set the player currently has equipped — used by the relic
 * screen's set-progress display.
 */
export function setProgress(set: LegendarySet, activeIds: readonly string[]): number {
  const active = new Set(activeIds);
  return set.pieceIds.filter((id) => active.has(id)).length;
}
