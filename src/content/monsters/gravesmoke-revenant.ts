import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Gravesmoke Revenant — Chapter 8 mid striker. A soldier who did not burn so
 * much as smoulder, gone to a man-shape of grey smoke that holds its edges only
 * by stealing the warmth of the living. A `lifeDrain` attacker (heals half the
 * necrotic it deals): the longer it has its hands on you, the more solid it
 * becomes and the colder you go. Cut it down fast, before it wears your heat as
 * its own.
 */
export const GRAVESMOKE_REVENANT: Monster = MonsterSchema.parse({
  id: 'gravesmoke-revenant',
  name: 'Gravesmoke Revenant',
  cr: '9',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 114,
  speed: 30,
  abilityScores: { str: 17, dex: 16, con: 16, int: 10, wis: 12, cha: 14 },
  passivePerception: 12,
  resistances: ['necrotic', 'cold', 'fire'],
  actions: [
    {
      kind: 'attack',
      name: 'Smothering Grip',
      attackBonus: 9,
      damage: '2d8+6',
      damageType: 'necrotic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It folds around you like smoke around a snuffed wick and squeezes, and the warmth goes out of you the wrong way — out through the grip and into the grey shape, which thickens and darkens by exactly the measure you fail.',
    },
  ],
  flavorText:
    "Not every soldier on the march took the fire clean. Some only breathed it, and smouldered, and went out slow over years until what was left was a coil of grave-smoke in the rough shape of a man, too thin to hold itself together in the cold ash-wind. It clings to the living because the living are warm, and warmth is the one thing that gives it edges. It is not cruel. It is only cold, in the way a thing is cold that remembers being warm and cannot any longer be.",
});
