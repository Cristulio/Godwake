import type { Character } from '../../types/character';

export type CombatLean = 'martial' | 'caster';

/**
 * Which side of the weapon/spell offer split a soul leans on, resolved at
 * OFFER time from class + subclass — the static class lists couldn't express
 * the forks (a paladin or bard flips lean at the L3 pick, a druid at L2):
 *
 *  - fighter / rogue / barbarian / ranger / monk — martial, always.
 *  - wizard — caster, always.
 *  - paladin — Oath of the Radiant casts; Bulwark and the un-sworn swing.
 *  - bard — College of Valor swings; Lore and the un-chosen cast.
 *  - druid — Circle of the Moon fights in the beast; the circle-less cast.
 *
 * Offer pools read this (blessings, camp boons, boss-intel weak spot, event
 * attack bonuses). The spell ENGINE keeps reading isFullCaster /
 * FULL_CASTER_CLASS_IDS — a Valor bard still casts; it just stops being
 * offered spell levers over weapon ones.
 */
export function combatLean(c: Pick<Character, 'classId' | 'subclassId'>): CombatLean {
  switch (c.classId) {
    case 'wizard':
    case 'cleric': // no playable cleric yet; if one ever lands, it casts
      return 'caster';
    case 'paladin':
      return c.subclassId === 'radiant' ? 'caster' : 'martial';
    case 'bard':
      return c.subclassId === 'valor' ? 'martial' : 'caster';
    case 'druid':
      return c.subclassId === 'circle-of-the-moon' ? 'martial' : 'caster';
    default:
      return 'martial';
  }
}
