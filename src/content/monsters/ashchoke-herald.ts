import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ashchoke Herald — Chapter 8 early-mid controller. The standard-bearer of the
 * dead host, who no longer carries a banner but the column of smoke itself. It
 * opens by rolling a `debuff` of blinding ashfall over the player (blinded, DC
 * 17 con; the picker re-raises it whenever it lapses, so you fight half the
 * chapter eyes-streaming) then reaches in through the murk with an iron crook.
 * Drop the herald or fight the smoke as well as the dead.
 */
export const ASHCHOKE_HERALD: Monster = MonsterSchema.parse({
  id: 'ashchoke-herald',
  name: 'Ashchoke Herald',
  cr: '8',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 100,
  speed: 30,
  abilityScores: { str: 11, dex: 14, con: 15, int: 14, wis: 17, cha: 16 },
  passivePerception: 15,
  resistances: ['fire', 'necrotic'],
  actions: [
    {
      kind: 'debuff',
      name: 'Ashfall Veil',
      condition: 'blinded',
      saveDC: 17,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It lifts the crook and the column of smoke that follows it folds down over you — fine grey ash and grit and the powdered dead, packing your eyes and throat until the field is one choking blur.',
    },
    {
      kind: 'attack',
      name: 'Iron Crook',
      attackBonus: 8,
      damage: '2d8+4',
      damageType: 'fire',
      reach: 10,
      description:
        'Out of the murk the long crook hooks and drags, its iron still ember-hot from the burning it carries with it. You feel the heat of it before the blow, and never see the arm behind.',
    },
  ],
  flavorText:
    "Once it called the muster and dressed the line; now it heralds nothing but its own arrival, a hooded thing wading at the head of the smoke with a crook of cold iron held high. The ashfall is not weather. It is the host — every soldier ground to powder over the long burning, carried along above the march like a banner that has forgotten it was ever cloth. Where the herald goes, the column comes, and you cannot see to fight it.",
});
