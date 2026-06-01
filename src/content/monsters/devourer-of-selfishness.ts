import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Devourer of Selfishness — Chapter 11 ELITE, the guardian-manifestation of the
 * Trial of Selfishness, the last and worst of the five. The pit shows you a thing
 * that will die unless you give up a piece of yourself to save it, and the part of
 * you that would let it die rises as a vast, inward-folding hunger that exists only
 * to keep itself whole at any cost. Its kit is the sin entire: a `paralyze` that
 * holds you while it decides what of you to take (DC 20), a `lifeDrain` maw that
 * pours your warmth into its own keeping (heals half the necrotic), and a `debuff`
 * that leaves you lessened for the giving (weakened). Everything it does, it does to
 * be more itself at your expense — which is selfishness with no mask left on it.
 */
export const DEVOURER_OF_SELFISHNESS: Monster = MonsterSchema.parse({
  id: 'devourer-of-selfishness',
  name: 'Devourer of Selfishness',
  cr: '14',
  size: 'huge',
  creatureType: 'fiend (sin-manifestation)',
  ac: 20,
  maxHp: 262,
  speed: 30,
  abilityScores: { str: 21, dex: 14, con: 21, int: 15, wis: 16, cha: 18 },
  passivePerception: 14,
  resistances: ['necrotic', 'cold', 'psychic', 'poison'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Hold What Is Mine',
      saveDC: 20,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It folds its attention onto you the way a miser folds a hand over a coin, total and possessive, and under that regard you stop — not from fear but from a sudden, swallowing certainty that you belong to it now, that there is no part of you it has not already decided is its.',
    },
    {
      kind: 'attack',
      name: 'Inward Maw',
      attackBonus: 13,
      damage: '2d12+8',
      damageType: 'necrotic',
      reach: 10,
      lifeDrain: 0.5,
      description:
        'A mouth opens somewhere in the mass of it — there is no face for it to be in — and what it bites does not bleed outward but is drawn in, your warmth and your edges and the certainty of where you end folding into the hunger and surfacing, an instant later, as one more thing it owns.',
    },
    {
      kind: 'debuff',
      name: 'Lessened for the Giving',
      condition: 'weakened',
      saveDC: 20,
      saveAbility: 'con',
      durationRounds: 2,
      amount: 4,
      description:
        'It takes from you the part you were keeping in reserve — the held strength, the second effort — and folds it into itself, so that every blow you land after lands lighter, missing the weight you no longer have because it is wearing it.',
    },
  ],
  flavorText:
    "The fifth and final trial is Selfishness, and the pit saves it for last because it is the one that wears no flattering shape. There is a thing here that will die without a piece of you — your strength, your blood, the warmth you were saving for yourself — and the trial is only whether you will give it. The devourer is the refusal made enormous: a vast, faceless, inward-folding hunger that is nothing but the will to keep itself whole no matter what dies for it. It does not hate you. It does not even see you, exactly. It only knows that you are made of things it could have, and that having is the only verb it has left. To put it down you must spend yourself on something that cannot pay you back — which is, of course, the very thing the trial was asking all along.",
});
