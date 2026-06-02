import { MonsterSchema, type Monster } from '../../schemas/monster';

export const GOBLIN_WARDEN: Monster = MonsterSchema.parse({
  id: 'goblin-warden',
  name: 'Goblin Warden',
  cr: '1',
  size: 'small',
  creatureType: 'humanoid (goblinoid)',
  ac: 15,
  maxHp: 26,
  speed: 30,
  abilityScores: { str: 13, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Chain-Bound Greatsword',
      attackBonus: 5,
      damage: '1d10+3',
      damageType: 'slashing',
      reach: 5,
      description:
        'A massive jagged blade he drags across the stone — and then plants and swings with both hands.',
    },
  ],
  flavorText:
    'The warden of the Iron Cells. Bigger, meaner, and harder to kill than its kin. The chain coils about its shoulder, the blade scrapes sparks across the floor.',
});
