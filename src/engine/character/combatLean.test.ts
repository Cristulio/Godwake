import { describe, it, expect } from 'vitest';
import { combatLean, type CombatLean } from './combatLean';
import type { ClassId } from '../../schemas/ids';

/**
 * The full lean table — class + subclass, including the pre-fork defaults.
 * This is the single resolver every offer pool reads (blessings, camp boons,
 * boss-intel weak spot, event attack bonuses); a row changing here changes
 * what those systems offer, so the whole table is pinned.
 */
describe('combatLean — resolver table', () => {
  const table: [ClassId, string | null, CombatLean][] = [
    // The fixed-martial five: no subclass ever flips them.
    ['fighter', null, 'martial'],
    ['fighter', 'champion', 'martial'],
    ['rogue', null, 'martial'],
    ['rogue', 'thief', 'martial'],
    ['barbarian', null, 'martial'],
    ['ranger', null, 'martial'],
    ['monk', null, 'martial'],
    ['monk', 'way-of-the-open-hand', 'martial'],
    // The fixed caster.
    ['wizard', null, 'caster'],
    ['wizard', 'evocation', 'caster'],
    // Paladin: the un-sworn swing; Radiant casts, Bulwark swings.
    ['paladin', null, 'martial'],
    ['paladin', 'radiant', 'caster'],
    ['paladin', 'bulwark', 'martial'],
    // Bard: the un-chosen cast; Lore casts, Valor swings.
    ['bard', null, 'caster'],
    ['bard', 'lore', 'caster'],
    ['bard', 'valor', 'martial'],
    // Druid: the circle-less cast; the Moon fights in the beast.
    ['druid', null, 'caster'],
    ['druid', 'circle-of-the-moon', 'martial'],
  ];

  it.each(table)('%s / %s → %s', (classId, subclassId, lean) => {
    expect(combatLean({ classId, subclassId })).toBe(lean);
  });
});
