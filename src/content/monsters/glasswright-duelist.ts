import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Glasswright-Duelist — Chapter 9 early-mid summoner. The Court's master-of-arms,
 * who keeps a mirror-blade and a duelling habit of never fighting one-on-one when
 * it can help it. It strikes off a length of cracked glass and a `summon` rips a
 * Mirror-Double out of it to fight at its side (maxActive 1, cooldown 3), then it
 * presses with its own mirror-rapier. Cut the duelist or fight a hall that keeps
 * handing you back to yourself.
 */
export const GLASSWRIGHT_DUELIST: Monster = MonsterSchema.parse({
  id: 'glasswright-duelist',
  name: 'Glasswright-Duelist',
  cr: '9',
  size: 'medium',
  creatureType: 'undead',
  ac: 18,
  maxHp: 110,
  speed: 30,
  abilityScores: { str: 15, dex: 19, con: 15, int: 14, wis: 13, cha: 16 },
  passivePerception: 13,
  resistances: ['psychic', 'force'],
  actions: [
    {
      kind: 'summon',
      name: 'Second',
      summonDefId: 'mirror-double',
      count: 1,
      maxActive: 1,
      cooldownRounds: 3,
      description:
        'It taps the flat of its blade to a cracked pane and calls a second the way a duellist calls a witness — and your own reflection steps off the glass, takes a guard you recognise as your own, and falls in beside it.',
    },
    {
      kind: 'attack',
      name: 'Mirror-Rapier',
      attackBonus: 10,
      damage: '2d8+6',
      damageType: 'piercing',
      reach: 5,
      description:
        'The blade is a long splinter of polished glass that throws your own straining face back at you the whole length of the lunge, so you flinch from the reflection a breath before the point arrives.',
    },
  ],
  flavorText:
    "It taught the young masks to fence, in the years the Court still had years, and it taught them the one true rule of the place: never meet anyone honestly, and never alone. Now it duels forever in a fallen hall, and when it runs short of seconds it makes them from the mirrors — your reflection, drawn out and armed against you, because the surest blade to put in a thing is the one it already knows how to throw.",
});
