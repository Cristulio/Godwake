import type { AbilityName, AbilityScores } from '../../types/abilities';
import { abilityModifier } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { Armor } from '../../schemas/item';
import { FULL_CASTER_CLASS_IDS } from '../../schemas/ids';
import { getRace } from '../../content/races';
import { getItem } from '../../content/items';
import { getClass } from '../../content/classes';
import { characterQuirkMods, baneQuirkCount } from './quirks';
import { characterBlessingMods } from './blessings';
import { characterCampBoonMods } from './campBoons';
import { characterAffixMods, enhancementOf } from '../items/affixMods';
import { APOTHEOSIS_AC_BONUS, isAscendant } from '../combat/apotheosis';
import { BEAR_FORM_AC_BONUS, isBearForm } from '../combat/bearForm';

/**
 * Proficiency bonus by character level (PHB Table: Proficiency Bonus).
 * Lv1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6.
 */
export function proficiencyBonus(level: number): number {
  if (level < 1) return 0;
  return Math.ceil(1 + level / 4);
}

/**
 * Effective ability scores: base soul scores + racial bonuses + in-run ASI gains.
 * The base "soul" array is stable across reincarnations; the ASI gains layer on
 * top and are cleared at run boundaries.
 */
export function effectiveAbilityScores(character: Character): AbilityScores {
  const race = getRace(character.raceId);
  const base = character.baseAbilityScores;
  const result: AbilityScores = { ...base };
  for (const ability of Object.keys(race.abilityScoreBonuses) as AbilityName[]) {
    result[ability] = (result[ability] ?? 0) + (race.abilityScoreBonuses[ability] ?? 0);
  }
  // In-run ASI gains (from level-up picks). Run-scoped: cleared at reincarnation
  // and descent so they never compound across lives.
  const runAsi = character.runAsiGains;
  if (runAsi) {
    for (const ability of Object.keys(runAsi) as AbilityName[]) {
      result[ability] = (result[ability] ?? 0) + (runAsi[ability] ?? 0);
    }
  }
  return result;
}

export function modifierFor(character: Character, ability: AbilityName): number {
  const scores = effectiveAbilityScores(character);
  return abilityModifier(scores[ability]);
}

/** At (or above) max HP — the trigger for "while at full HP" blessings. */
function isFullHp(character: Character): boolean {
  return character.hp.max > 0 && character.hp.current >= character.hp.max;
}

/** HP at half or less — the "bloodied" trigger shared with playerAttack's wounded check. */
function isBloodied(character: Character): boolean {
  return character.hp.current <= character.hp.max / 2;
}

/**
 * Compute current AC.
 * Armor (light/medium/heavy) + DEX with caps + shield + Defense fighting style (+1 if any armor).
 * Magic AC bonuses and temp effects added later.
 */
export function computeAC(character: Character): number {
  const dexMod = modifierFor(character, 'dex');
  const equipped = character.equipped;

  let base = 10 + dexMod;
  let bodyArmor: Armor | null = null;

  if (equipped.armor) {
    const item = getItem(equipped.armor.itemId);
    // A robe sits in the body slot but is not armour: it sets no AC base and
    // stays invisible here, so Mage Armour's `!bodyArmor` +3 still lands.
    if (item.kind === 'armor' && item.category !== 'shield' && item.category !== 'robe') {
      bodyArmor = item;
      if (item.category === 'light') {
        base = item.baseAC + dexMod;
      } else if (item.category === 'medium') {
        base = item.baseAC + Math.min(dexMod, 2);
      } else if (item.category === 'heavy') {
        base = item.baseAC;
      }
      // Armour enhancement (+N): a flat bonus to the body-armour AC.
      base += enhancementOf(equipped.armor);
    }
  }

  // Barbarian Unarmored Defense: with no body armor, the guard is bone and
  // instinct — AC becomes 10 + DEX + CON. A shield (added below) still stacks.
  if (!bodyArmor && characterHasMechanic(character, 'unarmored-defense')) {
    base = 10 + dexMod + modifierFor(character, 'con');
  }

  // Monk Unarmored Defense: with no body armor, the guard is breath and read —
  // AC becomes 10 + DEX + WIS, plus a disciplined +2 deflection the bare stance
  // wins by slipping blows steel never would (owner 2026-06-28: unarmoured should
  // out-guard, not merely match, light armour). Distinct from the Barbarian's
  // CON-keyed version, which takes no deflection.
  if (!bodyArmor && characterHasMechanic(character, 'unarmored-defense-wis')) {
    base = 10 + dexMod + modifierFor(character, 'wis') + 2;
  }

  if (equipped.offHand) {
    const item = getItem(equipped.offHand.itemId);
    if (item.kind === 'armor' && item.category === 'shield') {
      // A +N shield carries its enhancement onto the AC bonus it grants.
      base += item.baseAC + enhancementOf(equipped.offHand);
    }
  }

  // Fighter Defense fighting style: +1 AC while wearing armor.
  if (bodyArmor && characterHasMechanic(character, 'fighting-style-defense')) {
    base += 1;
  }

  const quirkMods = characterQuirkMods(character);
  const blessingMods = characterBlessingMods(character);
  const boonMods = characterCampBoonMods(character);
  const affixMods = characterAffixMods(character);
  base += quirkMods.acMod ?? 0;
  base += blessingMods.acBonus ?? 0;
  base += boonMods.acBonus ?? 0;
  base += character.permanentBonuses?.ac ?? 0;
  // Equipped-gear affixes (Warded plate, etc.) — and hub legendary effects,
  // which characterAffixMods folds into the same accumulator.
  base += affixMods.acBonus;

  // Conditional / soul-mark AC blessings. Full-HP and bloodied are mutually
  // exclusive in practice; the per-bane lever is unconditional. Conditional
  // armour affixes (Pristine / Stalwart) ride the same HP triggers.
  if (isFullHp(character)) base += (blessingMods.acBonusWhileFull ?? 0) + affixMods.acBonusWhileFull;
  if (isBloodied(character))
    base += (blessingMods.acBonusWhileBloodied ?? 0) + affixMods.acBonusWhileBloodied;
  base += (blessingMods.acBonusPerBaneQuirk ?? 0) * baneQuirkCount(character);

  // Wizard buffs.
  if (character.classId === 'wizard' && !bodyArmor) {
    base += 3;
  }
  if (character.resources.shieldActive) {
    base += 5;
  }
  if (character.resources.mistyStepActive) {
    base += 2;
  }
  // Apotheosis: the ascendant form turns blows aside.
  if (isAscendant(character)) {
    base += APOTHEOSIS_AC_BONUS;
  }
  // Avatar of the Wilds (Great Bear): thick hide turns blows aside.
  if (isBearForm(character)) {
    base += BEAR_FORM_AC_BONUS;
  }

  return base;
}

/** True while the Barbarian's Rage is burning (physical resistance + bonus melee damage). */
export function isRaging(character: Character): boolean {
  return (character.resources.rageRoundsRemaining ?? 0) > 0;
}

/**
 * Rage's healing tradeoff: while raging, every heal that lands — potion, lifesteal,
 * regen — is HALVED (rounded up), not negated. Apply to the final heal amount right
 * before it touches HP. A 1-point heal still restores 1. Not raging: unchanged.
 */
export function ragedHealAmount(character: Character, amount: number): number {
  if (amount <= 0) return amount;
  return isRaging(character) ? Math.ceil(amount / 2) : amount;
}

/**
 * Classes that cast off the shared full-caster spell engine — the same slot
 * ladder, prepared/known kit, and DC/attack scaling. The Wizard casts on
 * Intelligence; the Druid on Wisdom (see {@link spellcastingAbility}). The
 * list itself lives in schemas/ids (FULL_CASTER_CLASS_IDS) so the content
 * offer pools read the same source.
 */
export function isFullCaster(classId: Character['classId']): boolean {
  return (FULL_CASTER_CLASS_IDS as readonly string[]).includes(classId);
}

/** A half-caster that spends spell slots off a shallower ladder than the full
 *  casters — the Paladin (CHA), whose slots also fuel Divine Smite. */
export function isHalfCaster(classId: Character['classId']): boolean {
  return classId === 'paladin';
}

/** The ability a caster keys spells off: Wisdom for the Druid, Charisma for the
 *  Bard and the Paladin, Intelligence otherwise. */
export function spellcastingAbility(character: Readonly<Character>): AbilityName {
  if (character.classId === 'druid') return 'wis';
  if (character.classId === 'bard' || character.classId === 'paladin') return 'cha';
  return 'int';
}

/** The caster's spellcasting ability modifier (Wisdom for Druid, Intelligence for Wizard). */
export function spellcastingMod(character: Readonly<Character>): number {
  return abilityModifier(effectiveAbilityScores(character)[spellcastingAbility(character)]);
}

/** True while the Druid wears a beast form (Wild Shape) — claws out, vitality up. */
export function isWildShaped(character: Readonly<Character>): boolean {
  return (character.resources.wildShapeRoundsRemaining ?? 0) > 0;
}

export function characterHasMechanic(character: Character, mechanicKey: string): boolean {
  const cls = getClass(character.classId);
  for (let lv = 1; lv <= character.level; lv++) {
    const features = cls.featuresByLevel[String(lv)] ?? [];
    if (features.some((f) => f.mechanicKey === mechanicKey)) {
      return true;
    }
  }
  if (character.subclassId) {
    const subclass = cls.subclasses.find((s) => s.id === character.subclassId);
    if (subclass) {
      for (let lv = 1; lv <= character.level; lv++) {
        const features = subclass.featuresByLevel[String(lv)] ?? [];
        if (features.some((f) => f.mechanicKey === mechanicKey)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Crit range. Default 20 only. Improved Critical (Champion lv3) → 19-20.
 * Ares's Edge (blessing) widens the band by N on the low end. Conditional
 * blessings widen it further while at full HP (Selene's Clarity) or while
 * bloodied (Ares's Bloodfury) — read live, so the band tracks current HP.
 */
export function critRange(character: Character): number[] {
  // Champion: Improved Critical (L2) opens the window to 19-20; Superior Critical
  // (L10) widens it again to 18-20.
  const base = characterHasMechanic(character, 'superior-critical')
    ? 18
    : characterHasMechanic(character, 'improved-critical')
      ? 19
      : 20;
  const mods = characterBlessingMods(character);
  let blessingBonus = mods.critRangeBonus ?? 0;
  if (isFullHp(character)) blessingBonus += mods.critRangeBonusWhileFull ?? 0;
  if (isBloodied(character)) blessingBonus += mods.critRangeBonusWhileBloodied ?? 0;
  const upgradeBonus = character.permanentBonuses?.critRange ?? 0;
  // affixBonus folds in hub legendary crit effects via characterAffixMods.
  const affixBonus = characterAffixMods(character).critRangeBonus;
  const boonBonus = characterCampBoonMods(character).critRangeBonus ?? 0;
  // Rogue Deadly Finesse (L13): the finisher's eye widens the crit window.
  const classBonus = characterHasMechanic(character, 'deadly-finesse') ? 1 : 0;
  const low = Math.max(
    2,
    base - blessingBonus - upgradeBonus - affixBonus - boonBonus - classBonus,
  );
  const result: number[] = [];
  for (let n = low; n <= 20; n++) result.push(n);
  return result;
}
