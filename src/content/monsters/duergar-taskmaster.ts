import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Duergar Taskmaster — Ch1 ELITE summoner. A gray-dwarf overseer who runs the
 * cell-block on conscript labor. Demonstrates the `summon` kind: when it has
 * fewer than two goblin conscripts on the floor, it bellows another up the
 * stairs (cooldown 2 so it alternates with its maul). Turn the fight into an
 * attrition problem — kill the taskmaster to stop the bleed.
 */
export const DUERGAR_TASKMASTER: Monster = MonsterSchema.parse({
  id: 'duergar-taskmaster',
  name: 'Duergar Taskmaster',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (duergar)',
  ac: 16,
  maxHp: 32,
  speed: 25,
  abilityScores: { str: 16, dex: 11, con: 14, int: 11, wis: 10, cha: 9 },
  passivePerception: 10,
  resistances: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Iron Maul',
      attackBonus: 5,
      damage: '1d10+3',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'A two-handed slab of black iron brought down with the bored competence of a man who breaks rocks and people interchangeably.',
    },
    {
      kind: 'summon',
      name: 'Conscript the Block',
      summonDefId: 'goblin',
      count: 1,
      maxActive: 2,
      cooldownRounds: 2,
      description:
        'He sets two fingers to his teeth and whistles down the stair. Something small and resentful comes up it.',
    },
  ],
  flavorText:
    'Gray as wet slate, eyes like two cooling coals. He has run this block for thirty years on the simple principle that there is always another goblin in the dark and never a shortage of work to break it on.',
});
