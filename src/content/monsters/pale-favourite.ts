import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Pale Favourite — Chapter 9 mid striker. A courtier who lived entirely on the
 * regard of others and starved without it; now it is a beautiful, blank-masked
 * thing that takes by touch what it can no longer be given. A `lifeDrain` attacker
 * (heals half the psychic it deals): every embrace it lands wears a little more of
 * your warmth, your certainty, your face onto its empty one. The longer it holds
 * you the more itself it becomes, at your exact expense.
 */
export const PALE_FAVOURITE: Monster = MonsterSchema.parse({
  id: 'pale-favourite',
  name: 'Pale Favourite',
  cr: '10',
  size: 'medium',
  creatureType: 'undead',
  ac: 18,
  maxHp: 130,
  speed: 30,
  abilityScores: { str: 14, dex: 17, con: 16, int: 12, wis: 13, cha: 20 },
  passivePerception: 13,
  resistances: ['psychic', 'necrotic'],
  actions: [
    {
      kind: 'attack',
      name: "Favourite's Embrace",
      attackBonus: 10,
      damage: '2d8+7',
      damageType: 'psychic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It takes your hand, or your throat, with the same fond familiarity, and something goes out of you the wrong way — a warmth, a surety of who you are — and surfaces a moment later on the blank mask as the faint, growing suggestion of your own features.',
    },
  ],
  flavorText:
    "It was someone's darling once, the most adored face in a court built on adoration, and it never learned to hold itself up on anything else. When the regard ran out it did not die so much as hollow, and now it works the ruin the only way it knows: it makes you love it, or fear it, or pity it — any attention will do — and it feeds on the having of you. The mask is blank because it has worn out every face it stole. Yours will not last it long either.",
});
