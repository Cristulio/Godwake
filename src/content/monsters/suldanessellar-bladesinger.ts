import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Corrupted Suldanessellar Bladesinger — Chapter 10 early-mid. The city's
 * martial pride: a high-elf bladesinger whose song of war has been turned to
 * the captor's purpose. The bladesong keeps the AC high and the blade moving in
 * a multiattack flurry. A fallen artist of the sword, fighting beautifully for
 * the wrong cause, with no one left inside to be ashamed of it.
 */
export const SULDANESSELLAR_BLADESINGER: Monster = MonsterSchema.parse({
  id: 'suldanessellar-bladesinger',
  name: 'Corrupted Bladesinger',
  cr: '10',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 18,
  maxHp: 126,
  speed: 35,
  abilityScores: { str: 14, dex: 20, con: 15, int: 17, wis: 13, cha: 14 },
  passivePerception: 14,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'multiattack',
      name: 'The Turned Bladesong',
      attacks: 2,
      description:
        'The song the elves made to defend this city moves through it still, two strokes to the breath, the blade weaving its own bright defence as it cuts — only the song has forgotten which side of the walls it stands on, and it sings the same for the burning of the city as it ever did for the keeping of it.',
    },
    {
      kind: 'attack',
      name: 'Singing Glaive',
      attackBonus: 11,
      damage: '2d8+6',
      damageType: 'slashing',
      reach: 5,
      description:
        'The long elven blade comes round in a line so clean it seems unhurried, and the humming of it on the air is almost lovely until it opens you, and the bladesinger steps through the cut to the next without once breaking the measure.',
    },
  ],
  flavorText:
    "To be a bladesinger of Suldanessellar was to study a single art for two centuries until the sword and the singer were one motion. This one studied that long, and longer, and the art survived what was done to its master — the body keeps the bladesong perfectly while the mind that gave it meaning has been emptied and refilled with the captor's want. It salutes you, out of an etiquette nothing remains to feel, and then it dances, and the dance is to kill you, and it is still the most beautiful thing in this burning city.",
});
