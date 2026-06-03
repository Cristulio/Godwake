import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cowled Wardpriest — Ch2 support caster. The "cult-leader that wards an ally"
 * archetype. Demonstrates the `sustain` kind (target: ally): each time an ally
 * is exposed it lays a 10-point ward of temp HP on it, turning an otherwise
 * killable escort into a wall. Focus it down first or the fight never ends.
 */
export const COWLED_WARDPRIEST: Monster = MonsterSchema.parse({
  id: 'cowled-wardpriest',
  name: 'Cowled Wardpriest',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 15,
  maxHp: 52,
  speed: 30,
  abilityScores: { str: 9, dex: 13, con: 13, int: 16, wis: 14, cha: 12 },
  passivePerception: 12,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'sustain',
      name: 'Cowl-Ward',
      target: 'ally',
      wardTempHp: 10,
      cooldownRounds: 2,
      description:
        'She lifts two fingers toward her companion and a skin of grey light closes over them — the blows you land on it now land on nothing.',
    },
    {
      kind: 'attack',
      name: 'Mind Lance',
      attackBonus: 7,
      damage: '2d6+5',
      damageType: 'psychic',
      range: [60, 120],
      description:
        'A thin bar of silver thought crosses the room and ends behind your eyes.',
    },
  ],
  flavorText:
    'Where the enforcers of the Cowled Wizards break, the wardpriests mend — but only their own. She has never once shielded a prisoner and never once failed to shield a colleague. The math of the guild is very simple to her.',
});
