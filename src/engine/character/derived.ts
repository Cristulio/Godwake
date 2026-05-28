import type { AbilityName, AbilityScores } from '../../types/abilities';
import { abilityModifier } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { Armor } from '../../schemas/item';
import { getRace } from '../../content/races';
import { getItem } from '../../content/items';
import { getClass } from '../../content/classes';
import { characterQuirkMods } from './quirks';
import { characterBlessingMods } from './blessings';
import { characterCampBoonMods } from './campBoons';

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
  return result;
}

export function modifierFor(character: Character, ability: AbilityName): number {
  const scores = effectiveAbilityScores(character);
  return abilityModifier(scores[ability]);
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
  base += quirkMods.acMod ?? 0;
  base += blessingMods.acBonus ?? 0;
  base += boonMods.acBonus ?? 0;
  base += character.permanentBonuses?.ac ?? 0;

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
 * Initiative = DEX modifier + race initiative bonus + quirk/blessing tweaks
 * + permanent/delve bonuses.
 *
 * Race speed used to fold into initiative (+/- 1 per 5ft delta from 30). The
 * coupling was invisible to players and doubled-up on Hill Dwarf's already
 * heavy "slow but tough" fantasy. Speed is now purely a movement-flavor field;
 * race init bumps live in an explicit `initiativeBonus` field (e.g. Wood Elf
 * Fey Reflexes +1).
 */
export function initiativeModifier(character: Character): number {
  const dex = modifierFor(character, 'dex');
  const race = getRace(character.raceId);
  const quirkMods = characterQuirkMods(character);
  const blessingMods = characterBlessingMods(character);
  const remarkableAthlete = characterHasMechanic(character, 'remarkable-athlete') ? 2 : 0;
  return (
    dex +
    (race.initiativeBonus ?? 0) +
    remarkableAthlete +
    (quirkMods.initiativeMod ?? 0) +
    (blessingMods.initiativeBonus ?? 0) +
    (character.permanentBonuses?.init ?? 0) +
    (character.delveInitBonus ?? 0)
  );
}

/**
 * Crit range. Default 20 only. Improved Critical (Champion lv3) → 19-20.
 * Tempus's Edge (blessing) widens the band by N on the low end.
 */
export function critRange(character: Character): number[] {
  const base = characterHasMechanic(character, 'improved-critical') ? 19 : 20;
  const blessingBonus = characterBlessingMods(character).critRangeBonus ?? 0;
  const upgradeBonus = character.permanentBonuses?.critRange ?? 0;
  const low = Math.max(2, base - blessingBonus - upgradeBonus);
  const result: number[] = [];
  for (let n = low; n <= 20; n++) result.push(n);
  return result;
}
