import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cult Fanatic — robed, knife-mad believer. Mid-CR Ch2 enemy. Hits hard
 * with a sacrificial dagger and shouts blasphemies between strikes.
 */
export const CULT_FANATIC: Monster = MonsterSchema.parse({
  id: 'cult-fanatic',
  name: 'Cult Fanatic',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 13,
  maxHp: 22,
  speed: 30,
  abilityScores: { str: 11, dex: 14, con: 12, int: 10, wis: 13, cha: 14 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Sacrificial Dagger',
      attackBonus: 4,
      damage: '1d4+2',
      damageType: 'piercing',
      reach: 5,
      description:
        'The fanatic shrieks a name in no language you know and drives the dagger in beneath the breath.',
    },
  ],
  flavorText:
    'A dirty white robe, a circle of dried blood at the collar, eyes that have not slept the way yours have. The dagger they carry is older than the cult and has the names of better gods scratched off it.',
});
