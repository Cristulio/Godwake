import { MonsterSchema, type Monster } from '../../schemas/monster';

export const KOBOLD: Monster = MonsterSchema.parse({
  id: 'kobold',
  name: 'Kobold',
  cr: '1/8',
  size: 'small',
  creatureType: 'humanoid (kobold)',
  ac: 12,
  maxHp: 14,
  speed: 30,
  abilityScores: { str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8 },
  passivePerception: 8,
  actions: [
    {
      kind: 'attack',
      name: 'Bone Dagger',
      attackBonus: 5,
      damage: '1d6+2',
      damageType: 'piercing',
      reach: 5,
      description: 'A short blade chipped from femur and tied with sinew.',
    },
  ],
  flavorText:
    'Scrawny and sharp. The cellars under Tresendar Manor crawl with them — drawn here, the cleric says, by the smell of fresh meat the goblins keep leaving.',
});
