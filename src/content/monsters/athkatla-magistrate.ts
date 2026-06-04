import { MonsterSchema, type Monster, type MonsterSummon } from '../../schemas/monster';

/**
 * Athkatlan Magistrate — Ch2 boss. A senior Cowled Wizard who sits as
 * magistrate over a guild court and rules with the kind of casual cruelty
 * that requires no warrant. Brittle (low HP, light armor) but lethal: opens
 * combat with a Hold Person and then chips the paralyzed player to death
 * with Mind Spike. Hold Person DC is intentionally soft (11) — at the L3-4
 * power band the player hits with WIS+0/+1, so DC 11 lands at roughly 50/55.
 * Three rounds of guaranteed paralyze + auto-advantage Mind Spike was a
 * save-or-die at DC 14; the playtest-tour synthesis (deaths to Magistrate
 * even for WIS-poor classes) pushed the DC further from 12 → 11.
 *
 * boss-framework content (layered on, stats unchanged):
 *  - A periodic guard summon: from round 2 he calls the court's enforcers
 *    (reusing the `slaver-cuirassier` bestiary def), never more than one alive
 *    at a time, on a cooldown — a brittle caster buying himself a body to hide
 *    behind. `minRound: 2` is load-bearing: it keeps the round-1 opener telegraph
 *    (paralyze) and the held-player fallback (attack) correct.
 *  - A half-HP PHASE, "The Sentence": once bloodied he stops chipping and passes
 *    judgement, swapping Mind Spike for a telegraphed Sentence (a heavy psychic
 *    execution the player gets one turn to race or mitigate) while still calling
 *    guards. Conservative magnitudes pending the sim pass.
 */
const COURT_GUARD_SUMMON: MonsterSummon = {
  kind: 'summon',
  name: 'Summon the Court Guard',
  summonDefId: 'slaver-cuirassier',
  count: 1,
  maxActive: 1,
  minRound: 2,
  cooldownRounds: 3,
  description:
    'The Magistrate raps the seal of office against the bench. "Bailiff." A uniformed enforcer steps from the gallery, chain already in hand.',
};

export const ATHKATLA_MAGISTRATE: Monster = MonsterSchema.parse({
  id: 'athkatla-magistrate',
  name: 'The Magistrate',
  cr: '4',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 14,
  maxHp: 52,
  speed: 30,
  abilityScores: { str: 9, dex: 14, con: 12, int: 18, wis: 14, cha: 13 },
  passivePerception: 12,
  actions: [
    {
      kind: 'paralyze',
      name: 'Hold Person',
      saveDC: 11,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        'The Magistrate raises one gloved hand. The air between you turns to glass. "Stand still for the sentence."',
    },
    COURT_GUARD_SUMMON,
    {
      kind: 'attack',
      name: 'Mind Spike',
      attackBonus: 7,
      damage: '3d6+4',
      damageType: 'psychic',
      range: [60, 120],
      description:
        'A bar of cold silver light crosses the hall and ends in your skull. The Magistrate does not so much as raise his voice.',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Sentence',
      enterText:
        'The Magistrate rises from the bench, robe falling straight. "The court has heard enough. The defendant is found wanting. Sentence is passed."',
      replaceActions: true,
      addActions: [
        COURT_GUARD_SUMMON,
        {
          kind: 'attack',
          name: 'Sentence',
          attackBonus: 7,
          damage: '4d6+4',
          damageType: 'psychic',
          range: [60, 120],
          telegraph: {
            chargeText:
              'The Magistrate lifts the seal of office overhead and begins to read the sentence aloud — the words landing like weights, the air thickening to glass around your skull.',
          },
          description:
            'He speaks the last word of the sentence and it detonates behind your eyes — a verdict made of pure psychic weight, carried out at once.',
        },
      ],
    },
  ],
  resistances: ['psychic'],
  flavorText:
    "Beneath the high silver collar of the Cowled Wizards, a thin man in his fifties with a magistrate's seal of office on a chain. He has had people killed before lunch and signed the next warrant before the body was lifted. When the chipping is too slow he calls the bailiffs; when you have bled him pale he stops chipping and simply passes sentence.",
});
