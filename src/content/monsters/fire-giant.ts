import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Fire Giant — Chapter 12 mid, the line of Yaga-Shura's host. The thing the
 * siege is built on: a mountain of red-iron muscle in scorched plate, with a
 * greatsword that drinks the heat and a hurled boulder for anything it cannot
 * reach. A `multiattack` bruiser (the greatsword, twice, at reach) that also
 * lobs a flame-wreathed rock at range — close or far, there is no clean
 * distance from one of these.
 */
export const FIRE_GIANT: Monster = MonsterSchema.parse({
  id: 'fire-giant',
  name: 'Fire Giant',
  cr: '12',
  size: 'huge',
  creatureType: 'giant',
  ac: 20,
  maxHp: 204,
  speed: 30,
  abilityScores: { str: 24, dex: 11, con: 21, int: 10, wis: 14, cha: 11 },
  passivePerception: 14,
  resistances: ['fire'],
  immunities: ['fire'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Two Strokes of the Line',
      attacks: 2,
      description:
        'It brings the greatsword down and across in two slow, enormous arcs, each one carrying the whole weight of the giant behind it. There is no quickness to read. There is only the certainty that being where the blade goes is the end of you.',
    },
    {
      kind: 'attack',
      name: 'Heat-Drinking Greatsword',
      attackBonus: 11,
      damage: '2d10+7',
      damageType: 'fire',
      reach: 10,
      description:
        'A slab of black iron the length of a war-banner, banked to a sullen orange along its edge. It cuts and burns in the one stroke, and the wound it leaves does not bleed so much as smoke.',
    },
    {
      kind: 'attack',
      name: 'Hurled Boulder',
      attackBonus: 11,
      damage: '3d10+7',
      damageType: 'bludgeoning',
      range: [60, 240],
      description:
        'It tears a chunk of the broken wall loose, wreathes it in the heat coming off its own hands, and throws it the length of the street — a falling, burning piece of Saradush coming back down on the city it was taken from.',
    },
  ],
  flavorText:
    "These are the host. Yaga-Shura led the fire giants down out of the mountains and they ringed Saradush in a wall of red iron, and what they cannot burn they break, and what they cannot break they wait out. They fight the way the mountains made them: slow, vast, and final. A single one of them held a gate against the city's whole guard. The siege has dozens. You are going to have to go through them anyway.",
});
