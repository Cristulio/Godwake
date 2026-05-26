import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Shadow — undead lurker from the alleys behind the counting houses. Light
 * resists everything, drains Strength on hit. (We don't yet have stat-drain
 * wired, so Shadow ships as a hard-to-hit necrotic striker — flavor reads as
 * "the blade goes through it.")
 */
export const SHADOW: Monster = MonsterSchema.parse({
  id: 'shadow',
  name: 'Shadow',
  cr: '1/2',
  size: 'medium',
  creatureType: 'undead',
  ac: 12,
  maxHp: 16,
  speed: 40,
  abilityScores: { str: 6, dex: 14, con: 13, int: 6, wis: 10, cha: 8 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Strength Drain',
      attackBonus: 4,
      damage: '2d6+2',
      damageType: 'necrotic',
      reach: 5,
      description:
        "The shadow flows up the blade like ink in water and lays a cold hand across your shoulder. It comes away with something that was warm.",
    },
  ],
  resistances: ['acid', 'cold', 'fire', 'lightning', 'thunder', 'bludgeoning', 'piercing', 'slashing'],
  immunities: ['necrotic', 'poison'],
  vulnerabilities: ['radiant'],
  flavorText:
    'It has the shape of a tall thin man pressed flat against a wall, except no wall is there. Where it crosses the lamplight, it does not unblot.',
});
