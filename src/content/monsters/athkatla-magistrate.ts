import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Athkatlan Magistrate — Ch2 boss. A senior Cowled Wizard who sits as
 * magistrate over a guild court and rules with the kind of casual cruelty
 * that requires no warrant. Brittle (low HP, light armor) but lethal: opens
 * combat with a Hold Person and then chips the paralyzed player to death
 * with Mind Spike.
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
      saveDC: 14,
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
  firstStrike: true,
  flavorText:
    "Beneath the high silver collar of the Cowled Wizards, a thin man in his fifties with a magistrate's seal of office on a chain. He has had people killed before lunch and signed the next warrant before the body was lifted.",
});
