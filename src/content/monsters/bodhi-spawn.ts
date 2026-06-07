import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bodhi's Spawn — Chapter 10 warmup fodder, the bleed-over from the catacombs.
 * Bodhi's get rises through the under-roots of Suldanessellar ahead of the
 * vampire herself, the first of the city's invaders the climb meets: a pale,
 * fast, hungry thing in the rags of whoever it last fed on. A single life-drain
 * bite — it does not fight so much as feed, and it leaves the wound colder than
 * the blade should.
 */
export const BODHI_SPAWN: Monster = MonsterSchema.parse({
  id: 'bodhi-spawn',
  name: "Bodhi's Spawn",
  cr: '9',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 130,
  speed: 35,
  abilityScores: { str: 16, dex: 18, con: 16, int: 11, wis: 12, cha: 15 },
  passivePerception: 13,
  resistances: ['necrotic'],
  actions: [
    {
      kind: 'attack',
      name: 'Rending Bite',
      attackBonus: 11,
      damage: '2d6+7',
      damageType: 'piercing',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It comes off the wall faster than a dead thing should and has its mouth at you before its feet have settled — and what it takes from you it keeps, the wound going cold and grey at the edges while the spawn warms a shade toward the colour you used to be.',
    },
  ],
  flavorText:
    "Bodhi did not climb into the elven city alone. Her get came up out of the catacombs ahead of her, through the under-roots and the burst tombs, and they meet the road first — pale and quick and starving, still wearing the torn finery of whatever elf-lord or pilgrim they last drank dry. This one does not speak. It only watches your throat, and circles, and waits for the half-step where the climb has made you slow.",
});
