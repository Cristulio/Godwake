import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { QuirkModifiers } from '../../schemas/quirk';
import { getQuirk, listQuirks } from '../../content/quirks';

/**
 * Roll a fresh set of Quirks for an incarnation. Uses the seeded dice roller
 * so reincarnations are deterministic per save.
 */
export function rollQuirks(roller: DiceRoller, count: number = 2): string[] {
  const pool = listQuirks();
  const result: string[] = [];
  const seen = new Set<string>();
  // We use d-large dice → modulo to pick. Mulberry32 is fine for this scale.
  let safety = 0;
  while (result.length < count && safety < 32) {
    safety += 1;
    const rolled = roller.roll('1d100');
    const idx = rolled.total % pool.length;
    const pick = pool[idx].id;
    if (seen.has(pick)) continue;
    seen.add(pick);
    result.push(pick);
  }
  return result;
}

/**
 * Combine modifiers from a list of quirk ids into a single modifier bundle.
 * Numeric fields sum; boolean fields OR.
 */
export function aggregateQuirkModifiers(quirkIds: string[]): QuirkModifiers {
  const acc: QuirkModifiers = {};
  for (const id of quirkIds) {
    let q;
    try {
      q = getQuirk(id);
    } catch {
      continue;
    }
    const m = q.modifiers;
    if (m.goldMultiplier !== undefined)
      acc.goldMultiplier = (acc.goldMultiplier ?? 1) * m.goldMultiplier;
    if (m.poisonImmune) acc.poisonImmune = true;
    if (m.acMod !== undefined) acc.acMod = (acc.acMod ?? 0) + m.acMod;
    if (m.hangryDamageBonus !== undefined)
      acc.hangryDamageBonus = (acc.hangryDamageBonus ?? 0) + m.hangryDamageBonus;
    if (m.woundedAttackBonus !== undefined)
      acc.woundedAttackBonus = (acc.woundedAttackBonus ?? 0) + m.woundedAttackBonus;
    if (m.firstTurnAttackBonus !== undefined)
      acc.firstTurnAttackBonus = (acc.firstTurnAttackBonus ?? 0) + m.firstTurnAttackBonus;
    if (m.firstAttackPenalty !== undefined)
      acc.firstAttackPenalty = (acc.firstAttackPenalty ?? 0) + m.firstAttackPenalty;
    if (m.rerollMissesPerDelve !== undefined)
      acc.rerollMissesPerDelve = (acc.rerollMissesPerDelve ?? 0) + m.rerollMissesPerDelve;
    if (m.startBonusGold !== undefined)
      acc.startBonusGold = (acc.startBonusGold ?? 0) + m.startBonusGold;
  }
  return acc;
}

export function characterQuirkMods(character: Character): QuirkModifiers {
  return aggregateQuirkModifiers(character.quirks);
}

/**
 * The first boon-sentiment quirk in `quirkIds`, or undefined if none is a boon.
 * Wheelturner carries this one forward across the wheel — a bane (or an odd
 * mark) is never worth a 300-renown soul-upgrade slot, so they are skipped.
 */
export function firstBoonQuirk(quirkIds: readonly string[]): string | undefined {
  for (const id of quirkIds) {
    try {
      if (getQuirk(id).sentiment === 'boon') return id;
    } catch {
      continue;
    }
  }
  return undefined;
}

/**
 * Count of bane-sentiment quirks the character carries. Kept as the raw count
 * for UI / Grove-upgrade descriptions. The actual reward math uses
 * `baneSoulMarkWeight`, which weighs harsher banes more heavily.
 */
export function baneQuirkCount(character: Character): number {
  let n = 0;
  for (const id of character.quirks) {
    try {
      if (getQuirk(id).sentiment === 'bane') n += 1;
    } catch {
      continue;
    }
  }
  return n;
}

/**
 * Sum of `soulMarkWeight` (default 1.0) across the character's bane quirks.
 * Harsh banes — ones that block an entire mechanic from firing — weigh more
 * so their renown compensation reflects the actual pain. A "normal" 1-bane
 * roll still scores 1.0; a `limping` (−1 AC plus a first-attack penalty)
 * scores 1.5.
 */
export function baneSoulMarkWeight(character: Character): number {
  let total = 0;
  for (const id of character.quirks) {
    try {
      const q = getQuirk(id);
      if (q.sentiment === 'bane') total += q.soulMarkWeight ?? 1.0;
    } catch {
      continue;
    }
  }
  return total;
}

export const SOUL_MARK_PER_BANE = 0.2;

export function soulMarkMultiplier(character: Character): number {
  return 1 + SOUL_MARK_PER_BANE * baneSoulMarkWeight(character);
}

/**
 * Renown-specific multiplier: stacks the soul-mark with the Soul Marrow Grove
 * upgrade (extra +5/10/15% per bane). Gold and XP do NOT get the upgrade
 * bonus — only the renown carried back to the Wellspring.
 */
export function renownSoulMarkMultiplier(character: Character): number {
  const extra = character.permanentRenownBonusPerBane ?? 0;
  return 1 + (SOUL_MARK_PER_BANE + extra) * baneSoulMarkWeight(character);
}
