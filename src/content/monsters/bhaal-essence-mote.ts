import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bhaal-Essence Mote — Chapter 14 fodder. The chaff of the Throne: a gobbet of
 * congealed murder skimmed off one of the pools, given just enough shape to want
 * what the pools want. It is not a creature so much as an appetite with a reach —
 * a `lifeDrain` striker that thickens on every wound it opens, dragging a little
 * of your warmth back to the essence it was poured from.
 */
export const BHAAL_ESSENCE_MOTE: Monster = MonsterSchema.parse({
  id: 'bhaal-essence-mote',
  name: 'Bhaal-Essence Mote',
  cr: '12',
  size: 'medium',
  creatureType: 'fiend (bhaalspawn-essence)',
  ac: 19,
  maxHp: 180,
  speed: 30,
  abilityScores: { str: 16, dex: 16, con: 18, int: 6, wis: 10, cha: 12 },
  passivePerception: 10,
  resistances: ['necrotic', 'poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Congealing Murder',
      attackBonus: 13,
      damage: '2d10+8',
      damageType: 'necrotic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It reaches with a limb that is only blood deciding, for a moment, to be a hand — and where it closes on you something is taken the wrong way out, a red thread of you drawn back into the mote, which thickens and reddens and stands a little more upright on the having of it.',
    },
  ],
  flavorText:
    "The pools of the Throne are not water. They are the rendered murder of a dead god and every soul his blood ever poisoned, and they do not lie still — they bud. This is the least of what they bud: a clot the size of a person, skimmed up off the surface by the hunger underneath, that holds together only as long as it is killing. It has no face and remembers no name, not even Bhaal's. It only knows the one thing the pools know, the one thing left of the God of Murder when everything else of him boiled away: that there should be less of you, and more of this.",
});
