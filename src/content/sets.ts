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
