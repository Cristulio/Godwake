import type { AbilityName, AbilityScores } from '../../types/abilities';
import { abilityModifier } from '../../types/abilities';
import type { Character } from '../../types/character';
import type { Armor } from '../../schemas/item';
import { getRace } from '../../content/races';
import { getItem } from '../../content/items';
import { getClass } from '../../content/classes';
import { characterQuirkMods } from './quirks';
import { characterBlessingMods } from './blessings';

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
  base += quirkMods.acMod ?? 0;
  base += blessingMods.acBonus ?? 0;
  base += character.permanentAcBonus ?? 0;

  // Wizard buffs.
  if (character.resources.mageArmorActive && !bodyArmor) {
    base += 3;
  }
  if (character.resources.shieldActive) {
    base += 5;
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
 * Initiative = DEX modifier + quirk/blessing tweaks + race-speed delta.
 *
 * Race speed (the 5e feet/round number) was previously cosmetic. Each
 * 5-foot delta from the default 30 maps to +/- 1 initiative — Wood Elves
 * (35) act sooner, Dwarves (25) act later, Humans (30) wash. Per
 * [[feedback-gameplay-over-5e]], this turns a flavor stat into a
 * gameplay knob without inventing new mechanics.
 */
export function initiativeModifier(character: Character): number {
  const dex = modifierFor(character, 'dex');
  const quirkMods = characterQuirkMods(character);
  const blessingMods = characterBlessingMods(character);
  const remarkableAthlete = characterHasMechanic(character, 'remarkable-athlete') ? 2 : 0;
  const race = getRace(character.raceId);
  const speedInit = Math.round((race.speed - 30) / 5);
  return (
    dex +
    speedInit +
    remarkableAthlete +
    (quirkMods.initiativeMod ?? 0) +
    (blessingMods.initiativeBonus ?? 0) +
    (character.permanentInitBonus ?? 0) +
    (character.delveInitBonus ?? 0)
  );
}

/**
 * Crit range. Default 20 only. Improved Critical (Champion lv3) → 19-20.
 * Tempus's Edge (blessing) widens the band by N on the low end.
 */
export function critRange(character: Character): number[] {
  const base = characterHasMechanic(character, 'improved-critical') ? 19 : 20;
  const bonus = characterBlessingMods(character).critRangeBonus ?? 0;
  const low = Math.max(2, base - bonus);
  const result: number[] = [];
  for (let n = low; n <= 20; n++) result.push(n);
  return result;
}
