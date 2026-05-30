import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Unwound — Ch6 mid/elite frenzy striker. A soul that snapped its own
 * thread and did not climb off the wheel so much as fly off it — pure unmade
 * momentum with nothing left to steer it. Demonstrates `multiattack` plus the
 * `battle-rage` mechanic (`bossMechanic: 'battle-rage'`): once it drops to half
 * it commits entirely, +2 a hit for the rest of the fight. The cautionary
 * version of the player's own goal — off the wheel, and ruined by it.
 */
export const THE_UNWOUND: Monster = MonsterSchema.parse({
  id: 'the-unwound',
  name: 'The Unwound',
  cr: '8',
  size: 'medium',
  creatureType: 'aberration',
  ac: 17,
  maxHp: 120,
  speed: 35,
  abilityScores: { str: 19, dex: 16, con: 17, int: 6, wis: 8, cha: 5 },
  passivePerception: 9,
  resistances: ['force'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'multiattack',
      name: 'Come Apart',
      attacks: 2,
      description:
        'It stops being one thing and becomes a direction — both ruined arms arriving at once, with the whole of its unspooled momentum behind each.',
    },
    {
      kind: 'attack',
      name: 'Unraveling Strike',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'force',
      reach: 5,
      description:
        'Where it strikes, the seam between one moment of you and the next is pulled loose, and a little of you simply does not continue.',
    },
  ],
  flavorText:
    'Once a soul that wanted exactly what you want — off the wheel, free of the turning. It got its wish. Without the thread to give it shape, it did not ascend; it unwound, the way a clock does when the spring lets go all at once. What is left runs the Loom-halls at random, striking anything that still holds together, hating the wholeness it can no longer remember having. The Loom does not hunt it. It does not need to. It is the warning.',
});
