import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cowled Enforcer — a junior Veiled Magus on patrol. They tax unlicensed
 * magic with a thrown bolt of force; not yet senior enough for the
 * Magistrate's Hold Person trick. Caster archetype: thin armor, ranged.
 */
export const COWLED_ENFORCER: Monster = MonsterSchema.parse({
  id: 'cowled-enforcer',
  name: 'Cowled Enforcer',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 14,
  maxHp: 46,
  speed: 30,
  abilityScores: { str: 9, dex: 14, con: 11, int: 17, wis: 12, cha: 11 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Force Bolt',
      attackBonus: 7,
      damage: '2d6+5',
      damageType: 'force',
      range: [60, 120],
      description:
        'A line of pale violet light leaves the enforcer\'s open palm and arrives without sound. The Cowled tax their unlicensed competition cleanly.',
    },
  ],
  resistances: ['fire'],
  flavorText:
    'A grey hood, a high collar, a mask of beaten silver shaped like a featureless face. The Veiled Court of Sudria does not raid — it collects. Its patrols ask once.',
});
