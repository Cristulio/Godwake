import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cell Wight — Ch1 debuff bruiser. A prisoner who died in the deep cells and
 * got back up wrong. Its withering grip (CON save) leaves the player 'weakened'
 * — every weapon hit lands for 3 less for the duration. The reference user of
 * the new 'weakened' condition.
 */
export const CELL_WIGHT: Monster = MonsterSchema.parse({
  id: 'cell-wight',
  name: 'Cell Wight',
  cr: '2',
  size: 'medium',
  creatureType: 'undead',
  ac: 13,
  maxHp: 30,
  speed: 30,
  abilityScores: { str: 15, dex: 11, con: 14, int: 8, wis: 11, cha: 12 },
  passivePerception: 10,
  resistances: ['necrotic'],
  immunities: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Grave-Iron Claw',
      attackBonus: 4,
      damage: '1d8+2',
      damageType: 'slashing',
      reach: 5,
      description:
        'Nails gone to black iron rake down in a single grinding stroke.',
    },
    {
      kind: 'debuff',
      name: 'Withering Grip',
      condition: 'weakened',
      saveDC: 12,
      saveAbility: 'con',
      durationRounds: 3,
      amount: 3,
      description:
        'A cold hand closes on your wrist and something leaves you through it — not blood, but the strength behind the blow.',
    },
  ],
  flavorText:
    'It still wears the manacle that killed it, fused now into the bone of one wrist. Whatever it was sentenced for, the sentence has not ended; it works the corridor it died in, and it resents anything still warm enough to leave.',
});
