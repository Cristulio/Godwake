import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Hollow Seraph — Ch5 early-mid multiattacker. A fallen guardian-angel husk
 * that still drills the sword-forms it was made for, twice a turn, on whatever
 * walks into the Godwake. `multiattack` (two strikes of the cold-light blade)
 * over a clean radiant `attack`. No control — pure, relentless tempo. Resists
 * radiant; it is made of the stuff.
 */
export const HOLLOW_SERAPH: Monster = MonsterSchema.parse({
  id: 'hollow-seraph',
  name: 'Hollow Seraph',
  cr: '5',
  size: 'medium',
  creatureType: 'celestial',
  ac: 16,
  maxHp: 60,
  speed: 30,
  abilityScores: { str: 17, dex: 15, con: 16, int: 8, wis: 13, cha: 12 },
  passivePerception: 13,
  resistances: ['radiant'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Sword-Forms',
      attacks: 2,
      description:
        'It runs the old drill without thought — high cut, reverse, the wrists turning the blade through the figure it was forged knowing — and both passes are aimed at you.',
    },
    {
      kind: 'attack',
      name: 'Cold-Light Blade',
      attackBonus: 8,
      damage: '2d6+4',
      damageType: 'radiant',
      reach: 5,
      description:
        "A longsword of fixed light, edged and bright and giving off no heat at all. Where it opens you the wound shines for a moment before it bleeds.",
    },
  ],
  flavorText:
    "It kept the armour and the posture and the sword and lost everything the sword was for. The face inside the helm is a smooth absence with the suggestion of where features used to be. It guards a thing that no longer needs guarding, against a threat it can no longer name, and it will cut you down for coming near out of a loyalty that has outlived its god, its cause, and its mind.",
});
