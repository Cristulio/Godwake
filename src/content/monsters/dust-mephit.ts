import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Dust Mephit — small elemental denizens of Velnaris's lab. They burst into
 * choking dust when slain. Iconic Chapter 1 BG2 encounter.
 */
export const DUST_MEPHIT: Monster = MonsterSchema.parse({
  id: 'dust-mephit',
  name: 'Dust Mephit',
  cr: '1/8',
  size: 'small',
  creatureType: 'elemental',
  ac: 12,
  maxHp: 14,
  speed: 30,
  abilityScores: { str: 5, dex: 14, con: 10, int: 9, wis: 11, cha: 10 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Claws',
      attackBonus: 3,
      damage: '1d4',
      damageType: 'slashing',
      reach: 5,
      description: 'It darts close, raking with chalk-white claws that leave a gritty smear.',
    },
  ],
  immunities: ['poison'],
  flavorText:
    'A grey-skinned imp made of choking dust. The lab is thick with them — they swarm the bell-jars where the master keeps his fresher specimens.',
});
