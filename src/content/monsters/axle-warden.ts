import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Axle-Warden — Ch6 ELITE summoner. The mechanism that turns the wheel and
 * feeds bodies back onto it. Demonstrates `summon` at the top band: it spins up
 * Threadbare Penitents off the rim (maxActive 2, cooldown 2) while crushing
 * from reach with a wheel-breaker maul. A war of attrition — close the gap and
 * fell the warden, or be ground down by the brood it never stops turning out.
 */
export const AXLE_WARDEN: Monster = MonsterSchema.parse({
  id: 'axle-warden',
  name: 'Axle-Warden',
  cr: '9',
  size: 'large',
  creatureType: 'construct',
  ac: 18,
  maxHp: 152,
  speed: 30,
  abilityScores: { str: 20, dex: 11, con: 18, int: 9, wis: 14, cha: 12 },
  passivePerception: 12,
  resistances: ['bludgeoning', 'necrotic'],
  actions: [
    {
      kind: 'summon',
      name: 'Turn the Wheel',
      summonDefId: 'threadbare-penitent',
      count: 1,
      maxActive: 2,
      cooldownRounds: 2,
      description:
        'It hauls the great axle a quarter-turn and a worn soul slides off the rim where the wheel meets the floor — upright before it has finished arriving, already reaching for you.',
    },
    {
      kind: 'attack',
      name: 'Wheel-Breaker Maul',
      attackBonus: 10,
      damage: '2d10+6',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'The maul is a spoke pulled from the wheel itself, swung on the long arc. It does not aim for you so much as for the place the wheel says you should be put back to.',
    },
  ],
  flavorText:
    "Vast, slow, and built — not born — for one task: to keep the wheel turning no matter what climbs onto it. Where a thing has hands it has clamps; where it has a face it has the blank brass dial that reads off how many souls are due. It has never stopped working and was never meant to. The Loom-Mother set it at the axle before the first turning, and it has wound the dead back into the living every moment since.",
});
