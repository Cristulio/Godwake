import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Reborn Husk — Ch5 warmup chaff + summon-fodder. A soul the cycle pulled back
 * one time too many: the body remembers being alive but not why. Plain melee,
 * no special — it exists to be the thing the Cycle-Shepherd (and the boss
 * mechanic-flavour) spills onto the field. The cheapest body in the Godwake.
 */
export const REBORN_HUSK: Monster = MonsterSchema.parse({
  id: 'reborn-husk',
  name: 'Reborn Husk',
  cr: '3',
  size: 'medium',
  creatureType: 'undead',
  ac: 13,
  maxHp: 46,
  speed: 30,
  abilityScores: { str: 14, dex: 11, con: 15, int: 6, wis: 9, cha: 5 },
  passivePerception: 9,
  resistances: ['necrotic'],
  actions: [
    {
      kind: 'attack',
      name: 'Grasping Claw',
      attackBonus: 7,
      damage: '2d6+4',
      damageType: 'necrotic',
      reach: 5,
      description:
        'It reaches the way a drowning man reaches, all want and no aim, and where the fingers close the warmth goes out of you and into it.',
    },
  ],
  flavorText:
    "It has died before — you can tell by the seams of pale light where the cycle stitched it shut and sent it back. The eyes track you with a terrible patience, as if it knows you are only a few deaths behind it and is waiting, almost kindly, for you to catch up.",
});
