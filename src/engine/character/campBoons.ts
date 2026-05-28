import type { Character } from '../../types/character';

/**
 * Modifier bundle produced by the active set of Camp Boons. Boons whose
 * effects are "applied at pick-time" (HP grants, stabilise charge bumps,
 * Eyes-of-the-Lich preview flag) are NOT represented here — only the ones
 * that need to be read each time a stat is derived.
 */
export interface CampBoonModifiers {
  attackBonus?: number;
  acBonus?: number;
  damageBonus?: number;
  spellDcBonus?: number;
  wisSaveBonus?: number;
  /** Blade of the Vow grants 1 lowest-die reroll per combat. */
  weaponDamageRerollPerCombat?: number;
}

export function aggregateCampBoonMods(boonIds: readonly string[]): CampBoonModifiers {
  const acc: CampBoonModifiers = {};
  for (const id of boonIds) {
    switch (id) {
      case 'eye-of-the-hawk':
        acc.attackBonus = (acc.attackBonus ?? 0) + 1;
        break;
      case 'stillness-of-the-mind':
        acc.wisSaveBonus = (acc.wisSaveBonus ?? 0) + 1;
        break;
      case 'steel-of-the-brave':
        acc.acBonus = (acc.acBonus ?? 0) + 1;
        break;
      case 'surge-of-the-storm':
        acc.spellDcBonus = (acc.spellDcBonus ?? 0) + 1;
        break;
      case 'might-of-the-mountain':
        acc.damageBonus = (acc.damageBonus ?? 0) + 1;
        break;
      case 'blade-of-the-vow':
        acc.weaponDamageRerollPerCombat =
          (acc.weaponDamageRerollPerCombat ?? 0) + 3;
        break;
      // vigor / mantle / patience / eyes-of-the-lich are applied at pick-time
      // (HP bumps, stabilise budget, preview flag). They never read here.
      default:
        break;
    }
  }
  return acc;
}

export function characterCampBoonMods(character: Character): CampBoonModifiers {
  return aggregateCampBoonMods(character.campBoons ?? []);
}
