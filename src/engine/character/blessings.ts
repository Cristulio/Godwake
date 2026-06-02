import type { DiceRoller } from '../dice';
import type { Character } from '../../types/character';
import type { Blessing, BlessingModifiers } from '../../schemas/blessing';
import type { ClassId } from '../../schemas/ids';
import { getBlessing, listBlessings, getBlessingCategory } from '../../content/blessings';

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
 * Modifier keys that DON'T stack — `aggregateBlessingModifiers` collapses
 * them with `Math.max` (or boolean OR for `firstAttackAdvantage`). A second
 * blessing keyed only on these levers is mechanically inert, so once the soul
 * owns one it should drop out of future offer rolls. Keep in sync with the
 * `Math.max`/OR branches in `aggregateBlessingModifiers`.
 *
 * `acBonus` is intentionally absent: it sums so that Tymora's Gambit's
 * −1 AC penalty applies correctly (Math.max would silence the negative).
 */
const NON_STACKING_MODIFIER_KEYS: ReadonlySet<keyof BlessingModifiers> = new Set([
  'damageBonus',
  'holyDamageBonus',
  'extraTempHpPerRoom',
  'critRangeBonus',
  'firstAttackAdvantage',
  // Relic-style conditional/scaling levers added alongside the v2 pool. All
  // take max-of-individual in `aggregateBlessingModifiers`, so a second copy is
  // a dead pick — block the duplicate once owned. The two regen fields are
  // deliberately ABSENT (they sum, so a second copy genuinely stacks).
  'tempHpPerDelveLevel',
  'tempHpPerBaneQuirk',
  'bossTempHp',
  'acBonusWhileFull',
  'acBonusWhileBloodied',
  'acBonusPerBaneQuirk',
  'critRangeBonusWhileFull',
  'critRangeBonusWhileBloodied',
  // Caster levers. Max-of (like damageBonus) so a second copy is a dead pick and
  // drops from future offers — the whole point of this lane is fresher caster
  // offers, not a +1/+1/+1 stacking build. The blessing total still ADDS to the
  // affix/boon/permanent spell sources in the spell helpers.
  'spellDcBonus',
  'spellDamageBonus',
  'spellAttackBonus',
]);

/**
 * True when EVERY lever a blessing carries is non-stacking — a duplicate adds
 * nothing, so it's a dead pick once owned. A blessing carrying any summing
 * field (stabilise charges, first-attack to-hit/damage, reroll) still stacks
 * and stays offerable even when the soul already holds a copy.
 */
export function isNonStackingBlessing(b: Blessing): boolean {
  const m = b.modifiers ?? {};
  const keys = (Object.keys(m) as (keyof BlessingModifiers)[]).filter(
    (k) => m[k] !== undefined,
  );
  return keys.length > 0 && keys.every((k) => NON_STACKING_MODIFIER_KEYS.has(k));
}

/**
 * Roll N unique blessing options from the pool. Used by ShrineRoom to
 * present the player with a choice. Uses the seeded roller so the offered
 * blessings are deterministic per save. Dedupes both by id and by
 * mechanical effect signature, so the player never sees two cards that do
 * the same thing. When `classId` is provided, the pool is filtered to
 * class-relevant blessings first (weapon blessings hidden from Wizards).
 *
 * **Effect-type spread:** the pool is AC-heavy, so beyond signature dedup the
 * roll also favours one card per effect category (defense / vitality / offense
 * / …) — a first pass takes only fresh categories, then a relaxed second pass
 * fills any remainder by id+signature uniqueness alone. So an offer never
 * shows three same-category blessings unless the (class-filtered) pool genuinely
 * can't span that many categories, and the count is never reduced below what
 * signature dedup alone would yield.
 *
 * `ownedBlessingIds` are the blessings the soul already holds this run. Any
 * owned blessing that is purely non-stacking is excluded from the roll — a
 * second copy would be a dead pick. Owned blessings that still stack stay
 * eligible.
 */
export function rollBlessingOptions(
  roller: DiceRoller,
  count: number = 3,
  classId?: ClassId,
  ownedBlessingIds: string[] = [],
): string[] {
  const pool = blessingsForClass(classId);
  const result: string[] = [];
  const seen = new Set<string>();
  const seenSignatures = new Set<string>();
  const seenCategories = new Set<string>();
  // Pre-block the signatures of owned non-stacking blessings so the roller
  // never re-offers an inert duplicate.
  for (const id of ownedBlessingIds) {
    let owned;
    try {
      owned = getBlessing(id);
    } catch {
      continue;
    }
    if (isNonStackingBlessing(owned)) seenSignatures.add(blessingSignature(owned));
  }
  for (const enforceCategory of [true, false]) {
    let safety = 0;
    while (result.length < count && safety < 64) {
      safety += 1;
      const r = roller.roll('1d100');
      const idx = r.total % pool.length;
      const candidate = pool[idx];
      if (seen.has(candidate.id)) continue;
      const sig = blessingSignature(candidate);
      if (seenSignatures.has(sig)) continue;
      const category = getBlessingCategory(candidate);
      if (enforceCategory && seenCategories.has(category)) continue;
      seen.add(candidate.id);
      seenSignatures.add(sig);
      seenCategories.add(category);
      result.push(candidate.id);
    }
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
 * this" trap) instead of a meaningful choice. The immortal-hypothesis sim caught `extraTempHpPerRoom` first;
 * the audit follow-up flagged four more reachable-in-the-pool cases:
 *
 *   - `extraTempHpPerRoom` — 5e RAW: temp HP doesn't stack (PR #80).
 *     Lathander's Dawn +3 + Ilmater's Crown +2 should be +3, not +5.
 *   - `critRangeBonus` — Tempus's Edge alone should be the max crit lever,
 *     not compounded with Tymora's Gambit for 18–20 (3× crit rate).
 *   - `damageBonus` — only one damageBonus blessing exists post-dedup.
 *   - `holyDamageBonus` — only one holyDamageBonus blessing exists post-dedup.
 *
 * `acBonus` sums (additive) so that Tymora's Gambit's −1 AC tradeoff
 * applies correctly; it is excluded from NON_STACKING_MODIFIER_KEYS.
 *
 * Fields with only one stacking source in the current pool
 * (`firstAttackBonus`, `firstAttackDamage`, `rerollMissesPerEncounter`,
 * `acBonus`) keep `sum`. `extraStabiliseCharges` sums too (situational
 * "free deaths"; stacking is the intent if multiple charges are offered).
 *
 * The v2 conditional/scaling levers follow the same split: every temp-HP
 * source (`tempHpPerDelveLevel`, `tempHpPerBaneQuirk`, `bossTempHp`) and every
 * AC/crit conditional (`acBonusWhile*`, `acBonusPerBaneQuirk`,
 * `critRangeBonusWhile*`) is `max-of` — a duplicate adds nothing. The two
 * regen fields (`regenPerCombat`, `regenPctPerCombat`) `sum`, so two healing
 * picks genuinely compound.
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
      acc.acBonus = (acc.acBonus ?? 0) + m.acBonus;
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
    // v2 conditional/scaling levers. Temp-HP and AC/crit conditionals are
    // max-of (a second copy doesn't compound); the two regen fields sum.
    if (m.tempHpPerDelveLevel !== undefined)
      acc.tempHpPerDelveLevel = Math.max(acc.tempHpPerDelveLevel ?? 0, m.tempHpPerDelveLevel);
    if (m.tempHpPerBaneQuirk !== undefined)
      acc.tempHpPerBaneQuirk = Math.max(acc.tempHpPerBaneQuirk ?? 0, m.tempHpPerBaneQuirk);
    if (m.bossTempHp !== undefined)
      acc.bossTempHp = Math.max(acc.bossTempHp ?? 0, m.bossTempHp);
    if (m.regenPerCombat !== undefined)
      acc.regenPerCombat = (acc.regenPerCombat ?? 0) + m.regenPerCombat;
    if (m.regenPctPerCombat !== undefined)
      acc.regenPctPerCombat = (acc.regenPctPerCombat ?? 0) + m.regenPctPerCombat;
    if (m.acBonusWhileFull !== undefined)
      acc.acBonusWhileFull = Math.max(acc.acBonusWhileFull ?? 0, m.acBonusWhileFull);
    if (m.acBonusWhileBloodied !== undefined)
      acc.acBonusWhileBloodied = Math.max(acc.acBonusWhileBloodied ?? 0, m.acBonusWhileBloodied);
    if (m.acBonusPerBaneQuirk !== undefined)
      acc.acBonusPerBaneQuirk = Math.max(acc.acBonusPerBaneQuirk ?? 0, m.acBonusPerBaneQuirk);
    if (m.critRangeBonusWhileFull !== undefined)
      acc.critRangeBonusWhileFull = Math.max(
        acc.critRangeBonusWhileFull ?? 0,
        m.critRangeBonusWhileFull,
      );
    if (m.critRangeBonusWhileBloodied !== undefined)
      acc.critRangeBonusWhileBloodied = Math.max(
        acc.critRangeBonusWhileBloodied ?? 0,
        m.critRangeBonusWhileBloodied,
      );
    // Caster levers — max-of (a duplicate adds nothing), folded into the spell
    // helpers as one more additive source alongside affixes/boons/permanents.
    if (m.spellDcBonus !== undefined)
      acc.spellDcBonus = Math.max(acc.spellDcBonus ?? 0, m.spellDcBonus);
    if (m.spellDamageBonus !== undefined)
      acc.spellDamageBonus = Math.max(acc.spellDamageBonus ?? 0, m.spellDamageBonus);
    if (m.spellAttackBonus !== undefined)
      acc.spellAttackBonus = Math.max(acc.spellAttackBonus ?? 0, m.spellAttackBonus);
  }
  return acc;
}

export function characterBlessingMods(character: Character): BlessingModifiers {
  return aggregateBlessingModifiers(character.blessings);
}
