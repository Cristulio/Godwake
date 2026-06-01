import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Lash-Captain — Ch2 fear-controller. A slaver-house enforcer whose spiked whip
 * keeps the line in order. Cracks the whip to frighten the player (`debuff`,
 * WIS save → attacks at disadvantage) then carves at reach. A reach bruiser
 * that punishes you for the round you spend half-blind with fear.
 */
export const LASH_CAPTAIN: Monster = MonsterSchema.parse({
  id: 'lash-captain',
  name: 'Lash-Captain',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 16,
  maxHp: 60,
  speed: 30,
  abilityScores: { str: 15, dex: 14, con: 14, int: 10, wis: 13, cha: 14 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Spiked Whip',
      attackBonus: 7,
      damage: '2d8+5',
      damageType: 'slashing',
      reach: 10,
      description:
        'Ten feet of barbed leather, snapped out and drawn back across the wound on the return so it opens twice.',
    },
    {
      kind: 'debuff',
      name: 'Crack the Whip',
      condition: 'frightened',
      saveDC: 13,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'The crack comes a hand-span from your ear, loud as a breaking bone. It is meant to remind you what you are to him: stock.',
    },
  ],
  flavorText:
    'He has driven coffles down the Trade Way for twenty years and learned that the whip is mostly for the sound. The men who fear the sound do not need to be struck. He is disappointed, slightly, every time someone makes him strike.',
});
