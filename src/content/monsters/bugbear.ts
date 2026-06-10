import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bugbear — a hulking goblinoid brute Karzok's slavers hired to keep the
 * lower cells. Tuned below RAW CR 1 so it's a bruiser threat in Ch1 without
 * overshadowing the duergar boss.
 */
export const BUGBEAR: Monster = MonsterSchema.parse({
  id: 'bugbear',
  name: 'Bugbear Brute',
  cr: '1',
  size: 'medium',
  creatureType: 'humanoid (goblinoid)',
  ac: 14,
  maxHp: 32,
  speed: 30,
  abilityScores: { str: 15, dex: 12, con: 13, int: 8, wis: 11, cha: 9 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Morningstar',
      attackBonus: 5,
      damage: '2d6+3',
      damageType: 'piercing',
      reach: 5,
      description:
        'The bugbear brings its spiked club down with both hands. It grunts each time, like splitting wood.',
    },
  ],
  flavorText:
    'A hulking goblinoid, half again as tall as its goblin cousins, with patchy fur and a leather collar studded in iron. The duergar use them as cell-keepers — too stupid to question the work, too strong to argue with.',
});
