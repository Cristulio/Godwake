import type { Character } from '../../types/character';
import type { ItemRef, AffixModifiers } from '../../schemas/item';
import type { DamageType } from '../../types/damage';
import { getAffix, getItem } from '../../content/items';
import { EQUIP_SLOTS } from '../character/equip';
import { equippedSetMods } from './setGear';
import { affixScaleForRef, scaleAffixMagnitude } from './twoHandedPremium';

/**
 * Aggregated affix effect across a set of equipped items. Numeric channels sum
 * (gear is a deliberate, slot-limited choice — unlike blessings, which max-of
 * to avoid an "always pick this" stack); `resists` collects the damage types a
 * worn affix halves. Read by the combat/derived pipeline exactly where the
 * matching blessing/quirk mods are read.
 */
export interface AffixMods {
  acBonus: number;
  acBonusWhileFull: number;
  acBonusWhileBloodied: number;
  attackBonus: number;
  damageBonus: number;
  critRangeBonus: number;
  bleedDamage: number;
  lifestealPct: number;
  spellLifestealPct: number;
  regenPerTurn: number;
  tempHpPerCombat: number;
  spellDcBonus: number;
  spellDamageBonus: number;
  spellAttackBonus: number;
  bonusSpellSlotsL1: number;
  rageDamageBonus: number;
  markDamageBonus: number;
  sneakDamageBonus: number;
  followupDamageBonus: number;
  offHandDamageBonus: number;
  resists: DamageType[];
}

function emptyAffixMods(): AffixMods {
  return {
    acBonus: 0,
    acBonusWhileFull: 0,
    acBonusWhileBloodied: 0,
    attackBonus: 0,
    damageBonus: 0,
    critRangeBonus: 0,
    bleedDamage: 0,
    lifestealPct: 0,
    spellLifestealPct: 0,
    regenPerTurn: 0,
    tempHpPerCombat: 0,
    spellDcBonus: 0,
    spellDamageBonus: 0,
    spellAttackBonus: 0,
    bonusSpellSlotsL1: 0,
    rageDamageBonus: 0,
    markDamageBonus: 0,
    sneakDamageBonus: 0,
    followupDamageBonus: 0,
    offHandDamageBonus: 0,
    resists: [],
  };
}

/** The affix ids rolled onto a single carried item (empty for plain bases). */
export function affixIdsForRef(ref: ItemRef | null | undefined): string[] {
  return ref?.rolled?.affixes ?? [];
}

/**
 * The flat +N enhancement on a carried item (0 for plain bases). A weapon's +N
 * is read by playerAttack (attack + damage); an armour/shield's by computeAC.
 */
export function enhancementOf(ref: ItemRef | null | undefined): number {
  return ref?.rolled?.enhancement ?? 0;
}

/** Every affix id across the character's equipped slots (incl. accessories). */
export function equippedAffixIds(character: Character): string[] {
  const ids: string[] = [];
  for (const slot of EQUIP_SLOTS) {
    ids.push(...affixIdsForRef(character.equipped[slot]));
  }
  return ids;
}

/**
 * Fold one effect payload (an affix's or a legendary's) into the accumulator.
 * `scale` > 1 is the two-handed premium: every numeric magnitude scales (ceil,
 * min +1); resists are binary and pass through unscaled.
 */
function applyAffixModifiers(acc: AffixMods, m: AffixModifiers, scale = 1): void {
  acc.acBonus += scaleAffixMagnitude(m.acBonus ?? 0, scale);
  acc.acBonusWhileFull += scaleAffixMagnitude(m.acBonusWhileFull ?? 0, scale);
  acc.acBonusWhileBloodied += scaleAffixMagnitude(m.acBonusWhileBloodied ?? 0, scale);
  acc.attackBonus += scaleAffixMagnitude(m.attackBonus ?? 0, scale);
  acc.damageBonus += scaleAffixMagnitude(m.damageBonus ?? 0, scale);
  acc.critRangeBonus += scaleAffixMagnitude(m.critRangeBonus ?? 0, scale);
  acc.bleedDamage += scaleAffixMagnitude(m.bleedDamage ?? 0, scale);
  acc.lifestealPct += scaleAffixMagnitude(m.lifestealPct ?? 0, scale);
  acc.spellLifestealPct += scaleAffixMagnitude(m.spellLifestealPct ?? 0, scale);
  acc.regenPerTurn += scaleAffixMagnitude(m.regenPerTurn ?? 0, scale);
  acc.tempHpPerCombat += scaleAffixMagnitude(m.tempHpPerCombat ?? 0, scale);
  acc.spellDcBonus += scaleAffixMagnitude(m.spellDcBonus ?? 0, scale);
  acc.spellDamageBonus += scaleAffixMagnitude(m.spellDamageBonus ?? 0, scale);
  acc.spellAttackBonus += scaleAffixMagnitude(m.spellAttackBonus ?? 0, scale);
  acc.bonusSpellSlotsL1 += scaleAffixMagnitude(m.bonusSpellSlotsL1 ?? 0, scale);
  acc.rageDamageBonus += scaleAffixMagnitude(m.rageDamageBonus ?? 0, scale);
  acc.markDamageBonus += scaleAffixMagnitude(m.markDamageBonus ?? 0, scale);
  acc.sneakDamageBonus += scaleAffixMagnitude(m.sneakDamageBonus ?? 0, scale);
  acc.followupDamageBonus += scaleAffixMagnitude(m.followupDamageBonus ?? 0, scale);
  acc.offHandDamageBonus += scaleAffixMagnitude(m.offHandDamageBonus ?? 0, scale);
  if (m.resist && !acc.resists.includes(m.resist)) acc.resists.push(m.resist);
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
    applyAffixModifiers(acc, affix.modifiers);
  }
  return acc;
}

/**
 * Aggregate affix mods across everything the character has equipped, PLUS the
 * effect payloads of the hub-equipped legendary relics (`legendaryEffects`, baked
 * on by metaStore.applyRelicLoadout). Legendaries are effect-only, so they
 * ride the very same channels as gear affixes with no extra plumbing.
 *
 * Aggregation is per-slot so each item's affixes read at ITS scale: a true
 * two-hander's roll runs hotter (twoHandedPremium) while the rest of the kit —
 * and the legendary/set payloads below — stay at face value.
 */
export function characterAffixMods(character: Character): AffixMods {
  const acc = emptyAffixMods();
  for (const slot of EQUIP_SLOTS) {
    const ref = character.equipped[slot];
    const ids = affixIdsForRef(ref);
    if (ids.length === 0) continue;
    const scale = affixScaleForRef(ref);
    for (const id of ids) {
      let affix;
      try {
        affix = getAffix(id);
      } catch {
        continue;
      }
      applyAffixModifiers(acc, affix.modifiers, scale);
    }
  }
  for (const m of character.legendaryEffects ?? []) {
    applyAffixModifiers(acc, m);
  }
  // Set-gear effect payloads (each worn piece's signature + every met set-bonus
  // tier), computed LIVE from the equipped slots. The pieces' base stats / +N
  // ride the normal equipment path; only these effects fold here.
  for (const m of equippedSetMods(character)) {
    applyAffixModifiers(acc, m);
  }
  return acc;
}

/**
 * The affix view a single weapon SWING reads: every worn slot except the
 * weapon resting in the other hand. While dual wielding, each weapon's
 * affixes ride its own swings only — a Cruel off-hand dagger must not deepen
 * main-hand hits (per-hit gear edge never multiplies across swing count).
 * For every other loadout (other hand empty / shield / orb) this is exactly
 * {@link characterAffixMods}, so non-dual-wield behaviour is untouched.
 */
export function swingAffixMods(
  character: Character,
  swungHand: 'mainHand' | 'offHand',
): AffixMods {
  const otherHand = swungHand === 'mainHand' ? 'offHand' : 'mainHand';
  const otherRef = character.equipped[otherHand];
  if (!otherRef || getItem(otherRef.itemId).kind !== 'weapon') {
    return characterAffixMods(character);
  }
  const ids: string[] = [];
  for (const slot of EQUIP_SLOTS) {
    if (slot === otherHand) continue;
    ids.push(...affixIdsForRef(character.equipped[slot]));
  }
  const acc = aggregateAffixMods(ids);
  for (const m of character.legendaryEffects ?? []) {
    applyAffixModifiers(acc, m);
  }
  for (const m of equippedSetMods(character)) {
    applyAffixModifiers(acc, m);
  }
  return acc;
}
