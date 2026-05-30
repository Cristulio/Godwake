import type { AbilityName } from '../types/abilities';
import type { LegendaryBonuses } from '../types/character';
import type { ClassId } from '../schemas/ids';

/**
 * Legendary SETS (Diablo II style). Each piece is its own legendary relic that
 * occupies one of the soul's active-legendary slots; attuning more pieces of a
 * set grants PARTIAL, SCALING bonuses on top of each piece's solo effect
 * (2-piece, 3-piece…). Because a full set needs several active slots, the slot
 * cap growing with progression (`legendarySlotCap`) is what makes sets a
 * long-game chase.
 *
 * Bonuses speak only in the channels the engine already reads (AC, crit range,
 * ability scores) so nothing here is flavor-only. Kept modest — sims tune the
 * magnitudes later.
 */

export interface SetBonusTier {
  /** Active set pieces required for this tier to apply. */
  piecesRequired: number;
  /** Player-facing line shown on the relic screen. */
  label: string;
  bonuses: LegendaryBonuses;
}

export interface LegendarySet {
  id: string;
  name: string;
  flavor: string;
  /**
   * A class-specific set only drops for (and themes to) this class. Omit for a
   * class-agnostic set. Any owned piece can still be attuned by any class — the
   * gate is on the DROP, not on use.
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
      { piecesRequired: 2, label: '2-piece: +1 Armor Class', bonuses: { ac: 1 } },
      {
        piecesRequired: 3,
        label: '3-piece: +1 Armor Class, +1 Constitution',
        bonuses: { ac: 1, abilityScores: { con: 1 } },
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
        label: '2-piece: +1 Strength, crit on 19-20',
        bonuses: { abilityScores: { str: 1 }, critRange: 1 },
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

/** Merge `add` into `target` in place: sum AC, crit range, and ability scores. */
export function mergeLegendaryBonuses(
  target: LegendaryBonuses,
  add: LegendaryBonuses,
): LegendaryBonuses {
  if (add.ac) target.ac = (target.ac ?? 0) + add.ac;
  if (add.critRange) target.critRange = (target.critRange ?? 0) + add.critRange;
  if (add.abilityScores) {
    const ability = { ...(target.abilityScores ?? {}) };
    for (const k of Object.keys(add.abilityScores) as AbilityName[]) {
      ability[k] = (ability[k] ?? 0) + (add.abilityScores[k] ?? 0);
    }
    target.abilityScores = ability;
  }
  return target;
}

/**
 * Aggregate the active set bonuses from the currently-attuned relic ids: for
 * each set, count how many of its pieces are active and apply every threshold
 * met. Returns a single merged `LegendaryBonuses`.
 */
export function computeSetBonuses(activeIds: readonly string[]): LegendaryBonuses {
  const active = new Set(activeIds);
  const result: LegendaryBonuses = {};
  for (const set of SETS) {
    const have = set.pieceIds.filter((id) => active.has(id)).length;
    if (have < 2) continue;
    for (const tier of set.bonuses) {
      if (have >= tier.piecesRequired) mergeLegendaryBonuses(result, tier.bonuses);
    }
  }
  return result;
}

/**
 * How many active pieces of a set the player currently has and the matching
 * tier labels — used by the relic screen's set-progress display.
 */
export function setProgress(set: LegendarySet, activeIds: readonly string[]): number {
  const active = new Set(activeIds);
  return set.pieceIds.filter((id) => active.has(id)).length;
}
