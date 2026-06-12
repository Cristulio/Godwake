import type { Character } from '../../types/character';
import type { ItemRef, AffixModifiers } from '../../schemas/item';
import type { DamageType } from '../../types/damage';
import { getAffix, getItem } from '../../content/items';
import { EQUIP_SLOTS } from '../character/equip';
import { equippedSetMods } from './setGear';

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

/** Fold one effect payload (an affix's or a legendary's) into the accumulator. */
function applyAffixModifiers(acc: AffixMods, m: AffixModifiers): void {
  acc.acBonus += m.acBonus ?? 0;
  acc.acBonusWhileFull += m.acBonusWhileFull ?? 0;
  acc.acBonusWhileBloodied += m.acBonusWhileBloodied ?? 0;
  acc.attackBonus += m.attackBonus ?? 0;
  acc.damageBonus += m.damageBonus ?? 0;
  acc.critRangeBonus += m.critRangeBonus ?? 0;
  acc.bleedDamage += m.bleedDamage ?? 0;
  acc.lifestealPct += m.lifestealPct ?? 0;
  acc.spellLifestealPct += m.spellLifestealPct ?? 0;
  acc.regenPerTurn += m.regenPerTurn ?? 0;
  acc.tempHpPerCombat += m.tempHpPerCombat ?? 0;
  acc.spellDcBonus += m.spellDcBonus ?? 0;
  acc.spellDamageBonus += m.spellDamageBonus ?? 0;
  acc.spellAttackBonus += m.spellAttackBonus ?? 0;
  acc.bonusSpellSlotsL1 += m.bonusSpellSlotsL1 ?? 0;
  acc.rageDamageBonus += m.rageDamageBonus ?? 0;
  acc.markDamageBonus += m.markDamageBonus ?? 0;
  acc.sneakDamageBonus += m.sneakDamageBonus ?? 0;
  acc.followupDamageBonus += m.followupDamageBonus ?? 0;
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
 */
export function characterAffixMods(character: Character): AffixMods {
  const acc = aggregateAffixMods(equippedAffixIds(character));
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
