import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { Blessing, BlessingModifiers } from '../../schemas/blessing';
import { getBlessing, listBlessings } from '../../content/blessings';

/**
 * Canonical string fingerprint of a blessing's mechanical effect bundle.
 * Two blessings with different names but identical numeric/boolean modifiers
 * collide on signature, so the roller can avoid offering effectively-duplicate
 * choices to the player. Sorted keys; undefined fields stripped.
 */
export function blessingSignature(b: Blessing): string {
  const m = b.modifiers ?? {};
  const keys = (Object.keys(m) as (keyof BlessingModifiers)[])
    .filter((k) => m[k] !== undefined)
    .sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(`${k}:${JSON.stringify(m[k])}`);
  }
  return parts.join('|');
}

/**
 * Roll N unique blessing options from the pool. Used by ShrineRoom to
 * present the player with a choice. Uses the seeded roller so the offered
 * blessings are deterministic per save. Dedupes both by id and by
 * mechanical effect signature, so the player never sees two cards that do
 * the same thing.
 */
export function rollBlessingOptions(roller: DiceRoller, count: number = 3): string[] {
  const pool = listBlessings();
  const result: string[] = [];
  const seen = new Set<string>();
  const seenSignatures = new Set<string>();
  let safety = 0;
  while (result.length < count && safety < 64) {
    safety += 1;
    const r = roller.roll('1d100');
    const idx = r.total % pool.length;
    const candidate = pool[idx];
    if (seen.has(candidate.id)) continue;
    const sig = blessingSignature(candidate);
    if (seenSignatures.has(sig)) continue;
    seen.add(candidate.id);
    seenSignatures.add(sig);
    result.push(candidate.id);
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
    if (m.extraStabiliseCharges !== undefined)
      acc.extraStabiliseCharges =
        (acc.extraStabiliseCharges ?? 0) + m.extraStabiliseCharges;
    if (m.critRangeBonus !== undefined)
      acc.critRangeBonus = (acc.critRangeBonus ?? 0) + m.critRangeBonus;
  }
  return acc;
}

export function characterBlessingMods(character: Character): BlessingModifiers {
  return aggregateBlessingModifiers(character.blessings);
}
