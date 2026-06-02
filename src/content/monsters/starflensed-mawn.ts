import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Starflensed Mawn — Ch5 elite bruiser. A wound in the world where a star was
 * torn out, healed over wrong and gone hungry. Opens by searing the eyes
 * (`debuff` → blinded, CON save: the player attacks at disadvantage AND is
 * easier to hit) then feeds with a two-bite `multiattack`. Blind first, devour
 * second. Resists radiant — the light it bleeds is the light it is made of.
 */
export const STARFLENSED_MAWN: Monster = MonsterSchema.parse({
  id: 'starflensed-mawn',
  name: 'Starflensed Mawn',
  cr: '6',
  size: 'large',
  creatureType: 'aberration',
  ac: 15,
  maxHp: 88,
  speed: 40,
  abilityScores: { str: 19, dex: 13, con: 18, int: 4, wis: 11, cha: 6 },
  passivePerception: 11,
  resistances: ['radiant', 'fire'],
  actions: [
    {
      kind: 'debuff',
      name: 'Searing Flare',
      condition: 'blinded',
      saveDC: 15,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'The wound in its centre gapes and floods the room with the wrong-coloured light of the star it ate, and for a few seconds the world is only that light and the after-image of it burned into your eyes.',
    },
    {
      kind: 'multiattack',
      name: 'Devour',
      attacks: 2,
      description:
        'Blind, you only hear it: the wet double snap of a mouth that has been a mouth for less time than it has been a hunger, closing twice where it heard you breathe.',
    },
    {
      kind: 'attack',
      name: 'Rending Maw',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'piercing',
      reach: 5,
      description:
        'Teeth that are not teeth — splinters of cooled starmatter set in a rim of luminous meat — close on you and tear away with the light still clinging.',
    },
  ],
  flavorText:
    "Stars die too, when a god does. This one was flensed of its place in the firmament and fell here, into the dark below the dark, and the falling did not kill it but it did unmake the part that knew how to be a star. What is left is a hole ringed in light and teeth, and it is always, always feeding, and it has never once been full.",
});
