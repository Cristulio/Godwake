import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slaver Overseer — Ch2 ELITE leader who braces the lane beside the bandit-captain.
 * A career slave-driver who fights the way he works: a Crack of the Lash that
 * `debuff`s (frightened — the player attacks at disadvantage while it holds),
 * cowing you long enough for the captain at his shoulder to find the openings. DC
 * 12 for the mid-band; he re-cracks it the moment the fear lapses, otherwise he
 * leans into a two-handed mace. The captain is the blade; the overseer makes you
 * flinch from it.
 */
export const SLAVER_OVERSEER: Monster = MonsterSchema.parse({
  id: 'slaver-overseer',
  name: 'Slaver Overseer',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 16,
  maxHp: 56,
  speed: 30,
  abilityScores: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 12 },
  passivePerception: 11,
  actions: [
    {
      kind: 'debuff',
      name: 'Crack the Lash',
      condition: 'frightened',
      saveDC: 12,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'The whip comes apart of the air a hand from your face — not to cut, to teach. He has broken better than you with that sound, and some animal part of you knows it and recoils.',
    },
    {
      kind: 'attack',
      name: 'Two-Handed Mace',
      attackBonus: 6,
      damage: '2d8+4',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'When the lash has made room, the mace fills it — a slow, certain, downward thing that expects you to already be flinching.',
    },
  ],
  flavorText:
    'He has overseen pits from Calimport to the Athkatlan docks and learned that the chain does half the work and the FEAR of the chain does the other half. He and the captain are paid by different masters and neither has ever once questioned the arrangement on a working day.',
});
