import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Apostle of Stillness — Ch5 elite lockdown-controller. The dead god's herald,
 * whose first and only sermon is silence. Opens with the divine command
 * (`paralyze`, WIS save, the same engine-side Hold Person shape the Director and
 * Matron use) and then smites the held with radiant judgement. Survive the
 * stilling or eat free crits. Resists radiant and psychic.
 */
export const APOSTLE_OF_STILLNESS: Monster = MonsterSchema.parse({
  id: 'apostle-of-stillness',
  name: 'Apostle of Stillness',
  cr: '6',
  size: 'medium',
  creatureType: 'celestial',
  ac: 16,
  maxHp: 82,
  speed: 30,
  abilityScores: { str: 14, dex: 14, con: 16, int: 13, wis: 18, cha: 18 },
  passivePerception: 14,
  resistances: ['radiant', 'psychic'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Be Still and Hear',
      saveDC: 15,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        'It raises one finger to its own ruined lips. "Be still. The sermon is short." And the air sets around your joints like cooling wax, and you are very still, and it begins to preach.',
    },
    {
      kind: 'attack',
      name: 'Radiant Judgement',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'radiant',
      reach: 5,
      description:
        'It lays a hand flat against you, almost gentle, and the light goes through — not into the body so much as the part of you that has been refusing to lie down.',
    },
  ],
  flavorText:
    "It carries no weapon, only a stilled face and a finger raised forever to its lips. Where its eyes were there are two coins of unmoving light. It has silenced congregations, choirs, whole cities of the screaming dead, and it has never once raised its voice to do it. The quiet it offers is real, and total, and it cannot understand why anyone runs from it.",
});
