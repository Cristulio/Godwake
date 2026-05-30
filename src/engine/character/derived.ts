import type { AbilityName, AbilityScores } from '../../types/abilities';
import { abilityModifier } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { Armor } from '../../schemas/item';
import { getRace } from '../../content/races';
import { getItem } from '../../content/items';
import { getClass } from '../../content/classes';
import { characterQuirkMods, baneQuirkCount } from './quirks';
import { characterBlessingMods } from './blessings';
import { characterCampBoonMods } from './campBoons';
import { characterAffixMods } from '../items/affixMods';

/**
 * Proficiency bonus by character level (PHB Table: Proficiency Bonus).
 * Lv1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6.
 */
export function proficiencyBonus(level: number): number {
  if (level < 1) return 0;
  return Math.ceil(1 + level / 4);
}

/**
 * Effective ability scores: base soul scores + racial bonuses (+ future buffs).
 * The base "soul" array is stable across reincarnations; race rolls layer on top.
 */
export function effectiveAbilityScores(character: Character): AbilityScores {
  const race = getRace(character.raceId);
  const base = character.baseAbilityScores;
  const result: AbilityScores = { ...base };
  for (const ability of Object.keys(race.abilityScoreBonuses) as AbilityName[]) {
    result[ability] = (result[ability] ?? 0) + (race.abilityScoreBonuses[ability] ?? 0);
  }
  // Active legendary relics (cross-delve gear) layer on top of race. Folding
  // here means every downstream read — attack, damage, saves, spell DC, AC via
  // DEX, HP via CON — picks them up with no extra plumbing.
  const legendary = character.legendaryBonuses?.abilityScores;
  if (legendary) {
    for (const ability of Object.keys(legendary) as AbilityName[]) {
      result[ability] = (result[ability] ?? 0) + (legendary[ability] ?? 0);
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
    if (item.kind === 'armor' && item.category !== 'shield') {
      bodyArmor = item;
      if (item.category === 'light') {
        base = item.baseAC + dexMod;
      } else if (item.category === 'medium') {
        base = item.baseAC + Math.min(dexMod, 2);
      } else if (item.category === 'heavy') {
        base = item.baseAC;
      }
    }
  }

  // Barbarian Unarmored Defense: with no body armor, the guard is bone and
  // instinct — AC becomes 10 + DEX + CON. A shield (added below) still stacks.
  if (!bodyArmor && characterHasMechanic(character, 'unarmored-defense')) {
    base = 10 + dexMod + modifierFor(character, 'con');
  }

  if (equipped.offHand) {
    const item = getItem(equipped.offHand.itemId);
    if (item.kind === 'armor' && item.category === 'shield') {
      base += item.baseAC;
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
  base += character.legendaryBonuses?.ac ?? 0;
  // Equipped-gear affixes (Warded plate, etc.).
  base += affixMods.acBonus;

  // Conditional / soul-mark AC blessings. Full-HP and bloodied are mutually
  // exclusive in practice; the per-bane lever is unconditional. Conditional
  // armour affixes (Pristine / Stalwart) ride the same HP triggers.
  if (isFullHp(character)) base += (blessingMods.acBonusWhileFull ?? 0) + affixMods.acBonusWhileFull;
  if (isBloodied(character))
    base += (blessingMods.acBonusWhileBloodied ?? 0) + affixMods.acBonusWhileBloodied;
  base += (blessingMods.acBonusPerBaneQuirk ?? 0) * baneQuirkCount(character);

  // Wizard buffs.
  if (character.resources.mageArmorActive && !bodyArmor) {
    base += 3;
  }
  if (character.resources.shieldActive) {
    base += 5;
  }
  if (character.resources.mistyStepActive) {
    base += 2;
  }

  return base;
}

/** True while the Barbarian's Rage is burning (physical resistance + bonus melee damage). */
export function isRaging(character: Character): boolean {
  return (character.resources.rageRoundsRemaining ?? 0) > 0;
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
 * Tempus's Edge (blessing) widens the band by N on the low end. Conditional
 * blessings widen it further while at full HP (Selûne's Clarity) or while
 * bloodied (Tempus's Bloodfury) — read live, so the band tracks current HP.
 */
export function critRange(character: Character): number[] {
  const base = characterHasMechanic(character, 'improved-critical') ? 19 : 20;
  const mods = characterBlessingMods(character);
  let blessingBonus = mods.critRangeBonus ?? 0;
  if (isFullHp(character)) blessingBonus += mods.critRangeBonusWhileFull ?? 0;
  if (isBloodied(character)) blessingBonus += mods.critRangeBonusWhileBloodied ?? 0;
  const upgradeBonus = character.permanentBonuses?.critRange ?? 0;
  const legendaryBonus = character.legendaryBonuses?.critRange ?? 0;
  const affixBonus = characterAffixMods(character).critRangeBonus;
  const low = Math.max(2, base - blessingBonus - upgradeBonus - legendaryBonus - affixBonus);
  const result: number[] = [];
  for (let n = low; n <= 20; n++) result.push(n);
  return result;
}
