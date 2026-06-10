import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Half-Giant Siegebreaker — Chapter 12 early-mid. The heavy muscle of the
 * besieging rabble: half-giant-blooded brutes Hargan-Vor's host keeps for the
 * work of breaking gates and pulling down walls. A `multiattack` bruiser
 * swinging a beam-sized ram-maul at reach, slow to cross the ground and
 * impossible to ignore once it has.
 */
export const HALF_GIANT_SIEGEBREAKER: Monster = MonsterSchema.parse({
  id: 'half-giant-siegebreaker',
  name: 'Half-Giant Siegebreaker',
  cr: '11',
  size: 'large',
  creatureType: 'giant',
  ac: 19,
  maxHp: 198,
  speed: 40,
  abilityScores: { str: 21, dex: 11, con: 19, int: 8, wis: 10, cha: 9 },
  passivePerception: 10,
  resistances: ['fire'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Battering Work',
      attacks: 2,
      description:
        'It does not aim so much as commit — two long box-swings of the ram-maul, one after the other, the way it would work a barred gate, on the flat assumption that whatever it is hitting will eventually stop being in the way.',
    },
    {
      kind: 'attack',
      name: 'Ram-Maul',
      attackBonus: 12,
      damage: '2d10+7',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'A siege-maul the length of a man, headed with a block of banded iron meant for gate-timbers. Where it lands on something softer than oak it does the same work, only faster.',
    },
  ],
  flavorText:
    "For the parts of the siege that call for tearing things down rather than burning them, Hargan-Vor's host keeps these: half-giant-blooded brutes too small to stand in the fire-giant line and far too large to be left out of the work. They broke the outer gate of Karthen in an afternoon and have been looking for something else to break ever since. The walls are mostly down now. You will do.",
});
