import { MonsterSchema, type Monster } from '../../schemas/monster';

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
 */
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
  resistances: ['psychic'],
  flavorText:
    "Beneath the high silver collar of the Cowled Wizards, a thin man in his fifties with a magistrate's seal of office on a chain. He has had people killed before lunch and signed the next warrant before the body was lifted.",
});
