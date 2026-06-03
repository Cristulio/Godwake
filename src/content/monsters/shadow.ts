import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Shadow — undead lurker from the alleys behind the counting houses. Light
 * resists everything. Its cold grip saps the strength from your arm ('weakened'
 * debuff — every weapon hit lands for less), the shared sapper behavior it
 * lends Ch2, then it engulfs with a necrotic touch.
 */
export const SHADOW: Monster = MonsterSchema.parse({
  id: 'shadow',
  name: 'Shadow',
  cr: '1/2',
  size: 'medium',
  creatureType: 'undead',
  ac: 14,
  maxHp: 34,
  speed: 40,
  abilityScores: { str: 6, dex: 14, con: 13, int: 6, wis: 10, cha: 8 },
  passivePerception: 10,
  actions: [
    {
      kind: 'debuff',
      name: 'Strength Drain',
      condition: 'weakened',
      saveDC: 12,
      saveAbility: 'con',
      durationRounds: 2,
      amount: 3,
      description:
        "It lays a cold hand across your shoulder and comes away with something that was warm — and the next swing you take is slower, weaker, as if the arm were borrowed.",
    },
    {
      kind: 'attack',
      name: 'Engulfing Touch',
      attackBonus: 6,
      damage: '2d6+4',
      damageType: 'necrotic',
      reach: 5,
      description:
        "The shadow flows up the blade like ink in water and presses flat against you, and the cold of it sinks past the skin.",
    },
  ],
  resistances: ['acid', 'cold', 'fire', 'lightning', 'thunder', 'bludgeoning', 'piercing', 'slashing'],
  immunities: ['necrotic', 'poison'],
  vulnerabilities: ['radiant'],
  flavorText:
    'It has the shape of a tall thin man pressed flat against a wall, except no wall is there. Where it crosses the lamplight, it does not unblot.',
});
