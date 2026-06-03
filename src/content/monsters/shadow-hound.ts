import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Shadow Hound — a fey beast that walks the Athkatlan lamp-corners. Eats
 * light, hunts in pairs, vanishes when it loses sight of its prey. The
 * hounds the slaver houses turn loose at night and the Cowled politely
 * pretend not to see.
 */
export const SHADOW_HOUND: Monster = MonsterSchema.parse({
  id: 'shadow-hound',
  name: 'Shadow Hound',
  cr: '1',
  size: 'medium',
  creatureType: 'fey (beast)',
  ac: 15,
  maxHp: 34,
  speed: 40,
  abilityScores: { str: 14, dex: 15, con: 12, int: 4, wis: 13, cha: 6 },
  passivePerception: 13,
  actions: [
    {
      kind: 'attack',
      name: 'Lunging Bite',
      attackBonus: 6,
      damage: '2d6+4',
      damageType: 'piercing',
      reach: 5,
      description:
        'It comes in low and silent, more shape than weight, and the bite is on you before the bark would have been. The teeth come away with frost on them.',
    },
  ],
  resistances: ['cold', 'necrotic'],
  flavorText:
    'A wolfhound the colour of an unlit alley, with no eyes you can fix on and a lengthening shadow that does not match the lamplight. It does not pant. It does not breathe at all.',
});
