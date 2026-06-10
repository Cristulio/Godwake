import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drow War-Priestess — Ch4 support caster. Arachne's battlefield medic: she heals
 * and wards her House's warriors mid-fight (`sustain`, target: ally — 2d6 heal
 * plus a 12-point ward, cooldown 2) while scourging with a serpent-flail. Pairs
 * brutally with any drow front-liner; drop her first or the line never falls.
 */
export const DROW_WAR_PRIESTESS: Monster = MonsterSchema.parse({
  id: 'drow-war-priestess',
  name: 'Drow War-Priestess',
  cr: '4',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 17,
  maxHp: 66,
  speed: 30,
  abilityScores: { str: 11, dex: 15, con: 13, int: 13, wis: 16, cha: 15 },
  passivePerception: 13,
  resistances: ['poison'],
  actions: [
    {
      kind: 'sustain',
      name: "Arachne's Mending",
      target: 'ally',
      heal: '2d6',
      wardTempHp: 12,
      cooldownRounds: 2,
      description:
        'She presses the spider-sigil to a wounded House-mate and the wound closes around a skin of black webbing — the Spider Queen is not finished with this one yet.',
    },
    {
      kind: 'attack',
      name: 'Serpent Scourge',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'piercing',
      reach: 10,
      description:
        'A flail whose heads are living vipers, struck out together; they bite where the leather lands.',
    },
  ],
  flavorText:
    'A priestess of the second rank, not yet a Matron but climbing the only ladder Zhal Vasha keeps. She values her House-warriors precisely as much as they are useful, which today is a great deal. Arachne rewards the survivor, and she intends her people to survive you.',
});
