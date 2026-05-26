import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Hobgoblin Soldier — Ch2 seed. Disciplined goblinoid in scale armor;
 * the polar opposite of the rabble-goblin. Trained, deliberate, formal.
 */
export const HOBGOBLIN: Monster = MonsterSchema.parse({
  id: 'hobgoblin',
  name: 'Hobgoblin Soldier',
  cr: '1/2',
  size: 'medium',
  creatureType: 'humanoid (goblinoid)',
  ac: 18,
  maxHp: 16,
  speed: 30,
  abilityScores: { str: 13, dex: 12, con: 12, int: 10, wis: 10, cha: 9 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Longsword',
      attackBonus: 3,
      damage: '1d8+1',
      damageType: 'slashing',
      reach: 5,
      description:
        'The hobgoblin steps in with parade-ground precision and lays the blade in a clean diagonal. No flourish. No wasted breath.',
    },
  ],
  flavorText:
    'Burnt-orange skin, black-iron half-plate kept to a soldierly shine, and a longsword carried like the regulation it is. Hobgoblins do not raid — they march. Where one stands, three more are forming up.',
});
