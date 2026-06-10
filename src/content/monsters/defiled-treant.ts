import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Defiled Treant — Chapter 10 mid. A guardian-tree of Tor Maladin, kin to
 * the Tree of Life, rotted as the great Tree rots. It leads with a `restrained`
 * debuff (roots through the floor-stone) and then breaks you with a reaching
 * bough. The city's living wood turned against the city: slow, vast, and full
 * of a grief that comes out as crushing weight.
 */
export const DEFILED_TREANT: Monster = MonsterSchema.parse({
  id: 'defiled-treant',
  name: 'Defiled Treant',
  cr: '11',
  size: 'huge',
  creatureType: 'plant',
  ac: 18,
  maxHp: 184,
  speed: 20,
  abilityScores: { str: 22, dex: 8, con: 21, int: 12, wis: 16, cha: 12 },
  passivePerception: 13,
  resistances: ['bludgeoning', 'piercing'],
  vulnerabilities: ['fire'],
  actions: [
    {
      kind: 'debuff',
      name: 'Snaring Roots',
      condition: 'restrained',
      saveDC: 17,
      saveAbility: 'str',
      durationRounds: 2,
      description:
        'It sinks its toes through the cracked temple-flags and the roots come up around your own feet in a slow black tangle, the same roots that drank from the Tree of Life and now drink only the rot, closing on your ankles with the strength of a thing that has held this hill since before the city had a name.',
    },
    {
      kind: 'attack',
      name: 'Crushing Bough',
      attackBonus: 13,
      damage: '2d10+7',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'A limb the thickness of a roof-beam swings down out of its own canopy and lands across you like a felled tree, and for a moment you are pressed flat into the floor of the burning city it was grown to shade.',
    },
  ],
  flavorText:
    "Around the Tree of Life stood its lesser kin — treants grown from its own seed across the ages of Tor Maladin, set to ward the slopes that led up to the holy crown of the city. They sicken from the roots up as the great Tree sickens, the green going black at the heart, the long patient mind curdling to a single ache. This one no longer remembers the difference between a friend of the city and an enemy of it. It remembers only that something is killing the Tree, and that it hurts, and that you are near enough to crush.",
});
