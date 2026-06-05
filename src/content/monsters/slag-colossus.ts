import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slag-Colossus — Chapter 8 ELITE. A siege-engine of war-dead: a whole company
 * caught in one pour of molten iron and cooled into a single lumbering mass that
 * the march drags along to throw bodies at whatever bars the road. It `summon`s
 * Ember-Conscripts off its own fused surface (maxActive 1, first add round 3,
 * cooldown 6 — trimmed so the adds no longer out-wall its own chapter boss) while
 * crushing from reach with a fist the size of a wagon. A war of attrition — fell
 * the colossus, or be ground down by the ranks it keeps reforging out of itself.
 */
export const SLAG_COLOSSUS: Monster = MonsterSchema.parse({
  id: 'slag-colossus',
  name: 'Slag-Colossus',
  cr: '10',
  size: 'large',
  creatureType: 'construct',
  ac: 19,
  maxHp: 178,
  speed: 25,
  abilityScores: { str: 21, dex: 8, con: 20, int: 5, wis: 11, cha: 8 },
  passivePerception: 11,
  resistances: ['fire', 'bludgeoning', 'poison'],
  actions: [
    {
      kind: 'summon',
      name: 'Reforge the Ranks',
      summonDefId: 'ember-conscript',
      count: 1,
      maxActive: 1,
      minRound: 3,
      cooldownRounds: 6,
      description:
        'A seam in its flank glows and splits, and a soldier-shape pulls itself free of the cooling slag — already armed, already in step, peeled off the colossus the way a casting is broken from its mould.',
    },
    {
      kind: 'attack',
      name: 'Siege-Fist',
      attackBonus: 11,
      damage: '2d10+7',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'It brings down a fist that was a dozen men, on an arc as slow and certain as a falling wall. It does not aim. It does not need to. The ground where the road runs is where the fist is going.',
    },
  ],
  flavorText:
    "When the molten iron of the breached foundry-wagons ran across the packed companies it did not kill them so much as collect them — a hundred soldiers set in one cooling pour, pauldrons and spear-points and screaming faces all still half-visible in the surface like flies in amber. What stood up out of it is a single mountainous thing that walks the march on legs of fused war-dead, and when it needs more soldiers it simply lets some of itself stand up and fight.",
});
