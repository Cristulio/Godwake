import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Karthen Marauder — Chapter 12 fodder. The human rabble of Hargan-Vor's
 * siege: sellswords and brigands who took the giant's coin to ring a city of
 * refugee Slainkin and starve it into the fire. A plain `attack` brute with a
 * looted greataxe, fattened on a season of easy plunder behind the lines and
 * grown careless about the difference between a sack and a fight.
 */
export const SARADUSH_MARAUDER: Monster = MonsterSchema.parse({
  id: 'saradush-marauder',
  name: 'Karthen Marauder',
  cr: '10',
  size: 'medium',
  creatureType: 'humanoid (mercenary)',
  ac: 19,
  maxHp: 156,
  speed: 30,
  abilityScores: { str: 18, dex: 13, con: 16, int: 9, wis: 11, cha: 10 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Plunderer\'s Greataxe',
      attackBonus: 12,
      damage: '2d12+6',
      damageType: 'slashing',
      reach: 5,
      description:
        'A heavy axe taken off a Karthen guardsman who no longer needs it, the haft re-wrapped in stolen finery. He swings it the way a man swings at a door he means to be through, not at a thing that might swing back.',
    },
  ],
  flavorText:
    "Hargan-Vor did not march only fire giants to Karthen. The bulk of the ring is this: mercenaries and marauders out of every hard country, paid in the promise of a sacked city and given the one task of seeing that nothing inside the walls gets out alive. They have not had to fight for weeks — only to wait, and burn what tries to flee, and grow fat on the plunder of the camps. The waiting has made them slow. It has not made them merciful.",
});
