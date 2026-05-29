import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Plaguebound Cur — Ch1 debuff striker. A jail-hound kept on rotten meat until
 * its breath turned poisonous. Bites for modest damage but its Plague-Breath
 * (CON save) poisons the player: attacks at disadvantage until it wears off.
 * The first of the new `debuff` toolkit (poisoned).
 */
export const PLAGUEBOUND_CUR: Monster = MonsterSchema.parse({
  id: 'plaguebound-cur',
  name: 'Plaguebound Cur',
  cr: '1',
  size: 'medium',
  creatureType: 'beast',
  ac: 13,
  maxHp: 19,
  speed: 40,
  abilityScores: { str: 14, dex: 13, con: 14, int: 3, wis: 12, cha: 6 },
  passivePerception: 13,
  immunities: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Rotting Bite',
      attackBonus: 4,
      damage: '1d6+2',
      damageType: 'piercing',
      reach: 5,
      description:
        'The cur lunges low and clamps onto the leg, worrying the bite with a wet, infected growl.',
    },
    {
      kind: 'debuff',
      name: 'Plague-Breath',
      condition: 'poisoned',
      saveDC: 11,
      saveAbility: 'con',
      durationRounds: 3,
      description:
        'It throws its head back and coughs a cloud of green rot into your face. Hold your breath, or the world swims.',
    },
  ],
  flavorText:
    'A gaol-dog gone wrong. The duergar feed it on what the cells leave behind, and what comes back up is worse than what went down. Its gums are black and its breath arrives a half-second before its teeth.',
});
