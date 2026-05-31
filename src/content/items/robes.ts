import { ArmorSchema, type Armor } from '../../schemas/item';

/**
 * Robes — the Wizard's body-slot gear. They live in the armour slot but carry
 * NO base AC (so Mage Armour's +3 still applies; see `computeAC`); their worth
 * is entirely the rolled caster affixes (spell DC / damage / attack / the Runic
 * slot). Only the Wizard is robe-proficient, so these are caster-exclusive loot.
 *
 * The bases don't differ mechanically (no base AC, like accessories) — they
 * ladder early → late purely by cost, which drives shop price tier and the
 * "this is a richer find" feel as the chapters climb.
 */

function robe(data: { id: string; name: string; cost: number; weight: number }): Armor {
  return ArmorSchema.parse({
    kind: 'armor',
    category: 'robe',
    baseAC: 0,
    stealthDisadvantage: false,
    rarity: 'common',
    attunement: false,
    ...data,
  });
}

export const ALL_ROBES: Armor[] = [
  robe({ id: 'apprentice-robe', name: 'Apprentice Robe', cost: 15, weight: 4 }),
  robe({ id: 'silk-robe', name: 'Silk Robe', cost: 45, weight: 3 }),
  robe({ id: 'spellweave-robe', name: 'Spellweave Robe', cost: 110, weight: 4 }),
  robe({ id: 'archmagus-vestments', name: 'Archmagus Vestments', cost: 240, weight: 5 }),
];
