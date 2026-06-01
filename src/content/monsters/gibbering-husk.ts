import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Gibbering Husk — Ch3 mind-affecting controller. A Spellhold inmate hollowed
 * out by the Sphere's whispers, now a vector for them. Its Gibbering Babble
 * (`debuff`, WIS save → blinded) floods the player's senses: attacks at
 * disadvantage AND the husk's allies hit you more easily. A force-multiplier
 * for the aberrant packs of the asylum.
 */
export const GIBBERING_HUSK: Monster = MonsterSchema.parse({
  id: 'gibbering-husk',
  name: 'Gibbering Husk',
  cr: '3',
  size: 'medium',
  creatureType: 'aberration',
  ac: 14,
  maxHp: 56,
  speed: 20,
  abilityScores: { str: 14, dex: 10, con: 14, int: 6, wis: 13, cha: 8 },
  passivePerception: 11,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'attack',
      name: 'Raking Slam',
      attackBonus: 6,
      damage: '2d6+3',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'It throws its whole weight forward in a graceless overhand blow, mouth working the entire time.',
    },
    {
      kind: 'debuff',
      name: 'Gibbering Babble',
      condition: 'blinded',
      saveDC: 13,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        'A torrent of voices pours out of it — yours among them, saying things you have not said yet. The room greys at the edges and refuses to hold still.',
    },
  ],
  flavorText:
    'It was a person, and a patient, and then a doorway. The Sphere speaks through the hole where its mind was, in a hundred overlapping voices, and the voices are very interested in you.',
});
