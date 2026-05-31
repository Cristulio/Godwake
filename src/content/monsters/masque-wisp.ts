import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Masque-Wisp — Chapter 9 fodder. The chaff of the Court of Masks: not a
 * courtier so much as the idea of one that outlived its wearer — a porcelain
 * face and a suggestion of a body in trailing rag-silk, kept circling the hall
 * out of the habit of being seen. A plain `attack` striker (the slender blade it
 * keeps where a hand should be), but it wears a face you half-trust, and the
 * half-beat you spend deciding is the half-beat the blade uses.
 */
export const MASQUE_WISP: Monster = MonsterSchema.parse({
  id: 'masque-wisp',
  name: 'Masque-Wisp',
  cr: '8',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 98,
  speed: 30,
  abilityScores: { str: 13, dex: 18, con: 15, int: 11, wis: 12, cha: 17 },
  passivePerception: 12,
  resistances: ['psychic', 'necrotic'],
  actions: [
    {
      kind: 'attack',
      name: 'Borrowed-Hand Blade',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'piercing',
      reach: 5,
      description:
        'The mask tilts as if to greet you, gracious, and the rag-silk where its arm should be stiffens around a thin court-blade and slides it in under your guard while you are still reading the face for whose it is.',
    },
  ],
  flavorText:
    "The court was a place of masks long before it fell, and when it fell the masks did not. This is the least of them: a single painted face and the memory of a body, drifting the ruined hall in slow procession, bowing to no one, holding a blade it does not remember being given. It wears the face of someone you ought to recognise. They all do, here. That is the first lie the Court tells you, and the cheapest, and it still costs you blood.",
});
