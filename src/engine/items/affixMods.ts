import type { Character } from '../../types/character';
import type { ItemRef } from '../../schemas/item';
import type { DamageType } from '../../types/damage';
import { getAffix } from '../../content/items';

/**
 * Aggregated affix effect across a set of equipped items. Numeric channels sum
 * (gear is a deliberate, slot-limited choice — unlike blessings, which max-of
 * to avoid an "always pick this" stack); `resists` collects the damage types a
 * worn affix halves. Read by the combat/derived pipeline exactly where the
 * matching blessing/quirk mods are read.
 */
export interface AffixMods {
  acBonus: number;
  attackBonus: number;
  damageBonus: number;
  critRangeBonus: number;
  bleedDamage: number;
  lifestealPct: number;
  tempHpPerCombat: number;
  rageDamageBonus: number;
  markDamageBonus: number;
  sneakDamageBonus: number;
  resists: DamageType[];
}

function emptyAffixMods(): AffixMods {
  return {
    acBonus: 0,
    attackBonus: 0,
    damageBonus: 0,
    critRangeBonus: 0,
    bleedDamage: 0,
    lifestealPct: 0,
    tempHpPerCombat: 0,
    rageDamageBonus: 0,
    markDamageBonus: 0,
    sneakDamageBonus: 0,
    resists: [],
  };
}

/** The affix ids rolled onto a single carried item (empty for plain bases). */
export function affixIdsForRef(ref: ItemRef | null | undefined): string[] {
  return ref?.rolled?.affixes ?? [];
}

/** Every affix id across the character's equipped slots. */
export function equippedAffixIds(character: Character): string[] {
  const ids: string[] = [];
  for (const slot of ['mainHand', 'offHand', 'armor'] as const) {
    ids.push(...affixIdsForRef(character.equipped[slot]));
  }
  return ids;
}

/** Aggregate the mechanical effect of a list of affix ids. */
export function aggregateAffixMods(affixIds: string[]): AffixMods {
  const acc = emptyAffixMods();
  for (const id of affixIds) {
    let affix;
    try {
      affix = getAffix(id);
    } catch {
      continue;
    }
    const m = affix.modifiers;
    acc.acBonus += m.acBonus ?? 0;
    acc.attackBonus += m.attackBonus ?? 0;
    acc.damageBonus += m.damageBonus ?? 0;
    acc.critRangeBonus += m.critRangeBonus ?? 0;
    acc.bleedDamage += m.bleedDamage ?? 0;
    acc.lifestealPct += m.lifestealPct ?? 0;
    acc.tempHpPerCombat += m.tempHpPerCombat ?? 0;
    acc.rageDamageBonus += m.rageDamageBonus ?? 0;
    acc.markDamageBonus += m.markDamageBonus ?? 0;
    acc.sneakDamageBonus += m.sneakDamageBonus ?? 0;
    if (m.resist && !acc.resists.includes(m.resist)) acc.resists.push(m.resist);
  }
  return acc;
}

/** Aggregate affix mods across everything the character has equipped. */
export function characterAffixMods(character: Character): AffixMods {
  return aggregateAffixMods(equippedAffixIds(character));
}
