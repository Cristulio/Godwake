import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { Blessing, BlessingModifiers } from '../../schemas/blessing';
import type { ClassId } from '../../schemas/ids';
import { getBlessing, listBlessings } from '../../content/blessings';

/**
 * Filter the blessing pool by class relevance. A blessing with no
 * `classRelevance` is universal and always passes; one with a list passes only
 * when the class is in it. Lets shrines/camps avoid offering a Wizard a
 * weapon-keyed card (dead per PR #105 sim).
 */
export function blessingsForClass(classId: ClassId | undefined): Blessing[] {
  const all = listBlessings();
  if (!classId) return all;
  return all.filter(
    (b) => !b.classRelevance || b.classRelevance.length === 0 || b.classRelevance.includes(classId),
  );
}

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
 * the same thing. When `classId` is provided, the pool is filtered to
 * class-relevant blessings first (weapon blessings hidden from Wizards).
 */
export function rollBlessingOptions(
  roller: DiceRoller,
  count: number = 3,
  classId?: ClassId,
): string[] {
  const pool = blessingsForClass(classId);
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
 * Most numeric fields sum; boolean fields OR.
 *
 * **Non-stacking fields take max-of-individual, not sum.** This carve-out
 * exists because several pool blessings target the same mechanical lever,
 * and summing them compounds into the dominant build (the "always pick
 * this" trap) instead of a meaningful choice. The immortal-hypothesis sim
 * (`src/sim/immortalHypothesisSim.ts`) caught `extraTempHpPerRoom` first;
 * the audit follow-up flagged four more reachable-in-the-pool cases:
 *
 *   - `extraTempHpPerRoom` — 5e RAW: temp HP doesn't stack (PR #80).
 *     Lathander's Dawn +3 + Ilmater's Crown +2 should be +3, not +5.
 *   - `acBonus` — Helm's Aegis + Mystra's Ward + Silvanus's Root reach +3
 *     AC, ≈ what plate gives, ≈ −15% damage taken cumulative.
 *   - `critRangeBonus` — Tempus's Edge + Tymora's Gambit reach +2 (crit
 *     on 18–20), a 3× crit rate that multiplies with damage per hit.
 *   - `damageBonus` — Mystra's Whisper + Silvanus's Thorn reach +2 per
 *     hit, multiplied by attack count (Fighter Extra Attack = +4/round).
 *   - `holyDamageBonus` — Helm's Bulwark + Lathander's Ember reach +2 per
 *     hit; radiant resistance is rare so this is near-full damage.
 *
 * Fields with only one stacking source in the current pool
 * (`firstAttackBonus`, `firstAttackDamage`, `rerollMissesPerEncounter`)
 * keep `sum` — there's nothing to stack with today, but the additive
 * shape is correct if a second source is ever added intentionally.
 * `extraStabiliseCharges` keeps `sum` for the same reason (situational
 * "free deaths"; stacking is the intent if multiple charges are offered).
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
    if (m.acBonus !== undefined)
      acc.acBonus = Math.max(acc.acBonus ?? 0, m.acBonus);
    if (m.firstAttackBonus !== undefined)
      acc.firstAttackBonus = (acc.firstAttackBonus ?? 0) + m.firstAttackBonus;
    if (m.firstAttackDamage !== undefined)
      acc.firstAttackDamage = (acc.firstAttackDamage ?? 0) + m.firstAttackDamage;
    if (m.firstAttackAdvantage) acc.firstAttackAdvantage = true;
    if (m.damageBonus !== undefined)
      acc.damageBonus = Math.max(acc.damageBonus ?? 0, m.damageBonus);
    if (m.holyDamageBonus !== undefined)
      acc.holyDamageBonus = Math.max(acc.holyDamageBonus ?? 0, m.holyDamageBonus);
    if (m.extraTempHpPerRoom !== undefined)
      acc.extraTempHpPerRoom = Math.max(acc.extraTempHpPerRoom ?? 0, m.extraTempHpPerRoom);
    if (m.rerollMissesPerEncounter !== undefined)
      acc.rerollMissesPerEncounter =
        (acc.rerollMissesPerEncounter ?? 0) + m.rerollMissesPerEncounter;
    if (m.extraStabiliseCharges !== undefined)
      acc.extraStabiliseCharges =
        (acc.extraStabiliseCharges ?? 0) + m.extraStabiliseCharges;
    if (m.critRangeBonus !== undefined)
      acc.critRangeBonus = Math.max(acc.critRangeBonus ?? 0, m.critRangeBonus);
  }
  return acc;
}

export function characterBlessingMods(character: Character): BlessingModifiers {
  return aggregateBlessingModifiers(character.blessings);
}
