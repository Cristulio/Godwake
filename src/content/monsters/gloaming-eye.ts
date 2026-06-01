import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Gloaming Eye — Chapter 3 lesser gazer, a step up from the Witness-Mote: a
 * floating cyclopean eye the size of a head, trailing a few short lash-tendrils.
 * Demonstrates a weak debuff ray on a minion — a Cowing Gaze (frightened) — plus
 * a small searing glance to fall back on. Seeds the Sphere mid / elite comps and
 * escorts the Hollow Gaze.
 */
export const GLOAMING_EYE: Monster = MonsterSchema.parse({
  id: 'gloaming-eye',
  name: 'Gloaming Eye',
  cr: '2',
  size: 'small',
  creatureType: 'aberration',
  ac: 15,
  maxHp: 44,
  speed: 0,
  abilityScores: { str: 8, dex: 14, con: 13, int: 7, wis: 13, cha: 9 },
  passivePerception: 12,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'debuff',
      name: 'Cowing Gaze',
      condition: 'frightened',
      saveDC: 12,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'The great lid peels fully back and the eye holds you the way a held breath holds a room — and the corridor behind you suddenly seems the only sane direction left.',
    },
    {
      kind: 'attack',
      name: 'Searing Glance',
      attackBonus: 5,
      damage: '2d6+3',
      damageType: 'psychic',
      range: [30, 60],
      description:
        'The pupil narrows to a slit and rakes across you, and a line of cold opens behind your eyes where the look passes.',
    },
  ],
  flavorText:
    'Where the Witness-Motes only watch, these have learned to weigh. A single eye grown to the size of a man\'s head, trailing a fringe of grey lash-tendrils, it drifts the upper halls of the Sphere and herds the lost toward the dark below — never touching them, only making every other way unbearable.',
});
