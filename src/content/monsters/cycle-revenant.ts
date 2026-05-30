import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cycle-Revenant — Ch6 warmup/early striker. One of the soul's own past lives,
 * dragged back off the wheel and turned against the self that would break it.
 * A life-drain attacker (`lifeDrain` on its grasp — it heals half the necrotic
 * it deals): the longer it touches you, the more of you it becomes. The grim
 * mirror of the chapter — to climb off the wheel you must cut down everyone you
 * have ever been.
 */
export const CYCLE_REVENANT: Monster = MonsterSchema.parse({
  id: 'cycle-revenant',
  name: 'Cycle-Revenant',
  cr: '6',
  size: 'medium',
  creatureType: 'undead',
  ac: 16,
  maxHp: 90,
  speed: 30,
  abilityScores: { str: 16, dex: 14, con: 15, int: 10, wis: 11, cha: 13 },
  passivePerception: 11,
  resistances: ['necrotic', 'cold'],
  actions: [
    {
      kind: 'attack',
      name: 'Grave-Cold Grasp',
      attackBonus: 8,
      damage: '2d6+4',
      damageType: 'necrotic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It takes hold the way you would take your own hand, and the cold runs the wrong way down the bone — out of you and into the thing wearing your old face, which warms by exactly as much as you fail.',
    },
  ],
  flavorText:
    "It wears a face you almost recognise, because it is one you used to have. The Loom keeps every life a soul has spent, filed and cold, and when a soul tries to climb off the wheel the Loom sends the old selves up to bring it home. They are not angry. They only want you back in line, the way they were put back, life after life after life.",
});
