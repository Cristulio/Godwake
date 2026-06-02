import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Animated Armor — empty plate harnesses Velnaris drives with bound elementals.
 * Lab guardians. Iconic Chapter 1 BG2 encounter (his vaults are full of them).
 */
export const ANIMATED_ARMOR: Monster = MonsterSchema.parse({
  id: 'animated-armor',
  name: 'Animated Armor',
  cr: '1',
  size: 'medium',
  creatureType: 'construct',
  ac: 15,
  maxHp: 26,
  speed: 25,
  abilityScores: { str: 14, dex: 11, con: 13, int: 1, wis: 3, cha: 1 },
  passivePerception: 6,
  actions: [
    {
      kind: 'attack',
      name: 'Iron Slam',
      attackBonus: 5,
      damage: '1d10+3',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'The empty harness pivots and drives a gauntleted fist forward. The plates ring as they move.',
    },
  ],
  immunities: ['poison', 'psychic'],
  flavorText:
    'An empty harness driven by a bound elemental. The plates ring like a struck bell when it walks. The master uses dozens to guard his vaults.',
});
