import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drowned Acolyte — Ch7 (The Drowned Archive) warmup striker. The chaff of the
 * stacks: a novice copyist who drowned at the reading-desks when the vault took
 * in the deep and never once stopped turning pages. Demonstrates `multiattack`
 * at the Ch7 band — two waterlogged grabs a turn from a body that does not yet
 * know it is dead. Fragile for the chapter, but it comes in numbers and it does
 * not flinch from anything you do to it.
 */
export const DROWNED_ACOLYTE: Monster = MonsterSchema.parse({
  id: 'drowned-acolyte',
  name: 'Drowned Acolyte',
  cr: '7',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 96,
  speed: 30,
  abilityScores: { str: 17, dex: 12, con: 17, int: 8, wis: 9, cha: 6 },
  passivePerception: 9,
  resistances: ['cold', 'necrotic'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Sodden Diligence',
      attacks: 2,
      description:
        'It reaches with both swollen hands at once, the way a clerk does a task it has done ten thousand times and can no longer feel — page, hand, page, hand, and you somewhere in between.',
    },
    {
      kind: 'attack',
      name: 'Waterlogged Grasp',
      attackBonus: 9,
      damage: '1d10+5',
      damageType: 'cold',
      reach: 5,
      description:
        'The fingers have gone soft and grey with the years underwater, but they close like a book closing, and the cold of the deep stacks runs out of them into you and does not run back.',
    },
  ],
  flavorText:
    'It died bent over a reading-desk when the dark water came up through the floor of the Archive, and it has not yet finished the passage it was copying. There is no name left under the bloat — only the posture of study and the habit of obedience to a page. The Custodian keeps them by the shelf-full, the way a drowned town keeps its dead: in rows, in place, and never counted out.',
});
