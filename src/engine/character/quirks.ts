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
    if (m.initiativeMod !== undefined)
      acc.initiativeMod = (acc.initiativeMod ?? 0) + m.initiativeMod;
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
    if (m.charismaMod !== undefined)
      acc.charismaMod = (acc.charismaMod ?? 0) + m.charismaMod;
    if (m.startBonusGold !== undefined)
      acc.startBonusGold = (acc.startBonusGold ?? 0) + m.startBonusGold;
  }
  return acc;
}

export function characterQuirkMods(character: Character): QuirkModifiers {
  return aggregateQuirkModifiers(character.quirks);
}
