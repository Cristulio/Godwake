import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Unindexed — Ch7 mid/elite frenzy striker. A reader who took in more than
 * any catalogue could hold and came apart under it — struck from every index,
 * filed nowhere, belonging to no shelf and so loose in the stacks like a
 * misplaced wound. Demonstrates `multiattack` plus the `battle-rage` mechanic
 * (`bossMechanic: 'battle-rage'`): once it drops to half it stops trying to hold
 * its own edges and simply commits, +2 a hit for the rest of the fight. The
 * cautionary version of the soul's own descent — it, too, went looking for the
 * forbidden thing below, and found it.
 */
export const THE_UNINDEXED: Monster = MonsterSchema.parse({
  id: 'the-unindexed',
  name: 'The Unindexed',
  cr: '9',
  size: 'medium',
  creatureType: 'aberration',
  ac: 18,
  maxHp: 134,
  speed: 35,
  abilityScores: { str: 19, dex: 16, con: 18, int: 7, wis: 8, cha: 6 },
  passivePerception: 9,
  resistances: ['acid'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'multiattack',
      name: 'Come Out of Order',
      attacks: 2,
      description:
        'It stops being one thing in one place and becomes several things arriving — limbs out of sequence, struck from the order that held them, every part of it coming for you on its own and all of them at once.',
    },
    {
      kind: 'attack',
      name: 'Errata',
      attackBonus: 10,
      damage: '2d8+6',
      damageType: 'acid',
      reach: 5,
      description:
        'Where it strikes it corrects you — strikes a word out of you, the way an editor strikes a line, and the part it deletes does not so much bleed as cease to have been written, leaving a wet black gap where a piece of you used to be filed.',
    },
  ],
  flavorText:
    "It came down into the drowned stacks for the same reason you are passing through them: there was a thing below worth knowing, kept here by the one who drowned the whole library rather than let it out. It read too far. The knowing would not fit in one shape, and so the shape failed — unfiled, unindexed, struck from every list the Archive keeps. What is left runs the flooded halls hating anything still whole and ordered, because order is the thing it could not keep, and misery does so love its company.",
});
