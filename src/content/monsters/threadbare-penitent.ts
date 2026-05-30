import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Threadbare Penitent — Ch6 (Beyond the Godwake) warmup striker. The chaff of
 * the wheel: souls worn down to almost nothing across too many turnings, set
 * by the Loom to grind down whatever tries to climb off it. Demonstrates
 * `multiattack` at the top band — two worn-handed rakes a turn. Fragile for
 * the chapter, but it comes in numbers and it does not feel the strikes you
 * land on it.
 */
export const THREADBARE_PENITENT: Monster = MonsterSchema.parse({
  id: 'threadbare-penitent',
  name: 'Threadbare Penitent',
  cr: '6',
  size: 'medium',
  creatureType: 'undead',
  ac: 16,
  maxHp: 84,
  speed: 30,
  abilityScores: { str: 17, dex: 12, con: 16, int: 6, wis: 9, cha: 5 },
  passivePerception: 9,
  resistances: ['necrotic'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Penance',
      attacks: 2,
      description:
        'It works at you with both worn hands at once, the way a thing does a chore it has done ten thousand times and has forgotten the reason for.',
    },
    {
      kind: 'attack',
      name: 'Worn Hands',
      attackBonus: 8,
      damage: '1d10+4',
      damageType: 'necrotic',
      reach: 5,
      description:
        'The fingers have been ground down to the second knuckle by the turning of the wheel. What is left of them still finds the soft places, and where they touch, something of you is rubbed away.',
    },
  ],
  flavorText:
    'A soul that has gone round the wheel so many times there is nothing left of any one life — no face, no name, only the posture of penance and the habit of obedience. The Loom keeps them by the thousand the way a mill keeps chaff: useful only in mass, swept up and spent without counting.',
});
