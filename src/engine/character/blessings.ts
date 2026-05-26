import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { BlessingModifiers } from '../../schemas/blessing';
import { getBlessing, listBlessings } from '../../content/blessings';

/**
 * Roll N unique blessing options from the pool. Used by ShrineRoom to
 * present the player with a choice. Uses the seeded roller so the offered
 * blessings are deterministic per save.
 */
export function rollBlessingOptions(roller: DiceRoller, count: number = 3): string[] {
  const pool = listBlessings();
  const result: string[] = [];
  const seen = new Set<string>();
  let safety = 0;
  while (result.length < count && safety < 64) {
    safety += 1;
    const r = roller.roll('1d100');
    const idx = r.total % pool.length;
    const pick = pool[idx].id;
    if (seen.has(pick)) continue;
    seen.add(pick);
    result.push(pick);
  }
  return result;
}

/**
 * Combine modifiers from a list of blessing ids into a single bundle.
 * Numeric fields sum; boolean fields OR.
 */
export function aggregateBlessingModifiers(blessingIds: string[]): BlessingModifiers {
  const acc: BlessingModifiers = {};
  for (const id of blessingIds) {
    let b;
    try {
      b = getBlessing(id);
    } catch {
      continue;
    }
    const m = b.modifiers;
    if (m.acBonus !== undefined) acc.acBonus = (acc.acBonus ?? 0) + m.acBonus;
    if (m.initiativeBonus !== undefined)
      acc.initiativeBonus = (acc.initiativeBonus ?? 0) + m.initiativeBonus;
    if (m.firstAttackBonus !== undefined)
      acc.firstAttackBonus = (acc.firstAttackBonus ?? 0) + m.firstAttackBonus;
    if (m.firstAttackDamage !== undefined)
      acc.firstAttackDamage = (acc.firstAttackDamage ?? 0) + m.firstAttackDamage;
    if (m.firstAttackAdvantage) acc.firstAttackAdvantage = true;
    if (m.damageBonus !== undefined) acc.damageBonus = (acc.damageBonus ?? 0) + m.damageBonus;
    if (m.holyDamageBonus !== undefined)
      acc.holyDamageBonus = (acc.holyDamageBonus ?? 0) + m.holyDamageBonus;
    if (m.extraTempHpPerRoom !== undefined)
      acc.extraTempHpPerRoom = (acc.extraTempHpPerRoom ?? 0) + m.extraTempHpPerRoom;
    if (m.rerollMissesPerEncounter !== undefined)
      acc.rerollMissesPerEncounter =
        (acc.rerollMissesPerEncounter ?? 0) + m.rerollMissesPerEncounter;
    if (m.rerollDeathSavesPerDelve !== undefined)
      acc.rerollDeathSavesPerDelve =
        (acc.rerollDeathSavesPerDelve ?? 0) + m.rerollDeathSavesPerDelve;
    if (m.critRangeBonus !== undefined)
      acc.critRangeBonus = (acc.critRangeBonus ?? 0) + m.critRangeBonus;
  }
  return acc;
}

export function characterBlessingMods(character: Character): BlessingModifiers {
  return aggregateBlessingModifiers(character.blessings);
}
