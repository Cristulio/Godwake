import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Hobgoblin Drillmaster — Ch1 ELITE leader of "The Hobgoblin Picket". A line
 * officer who fights you and works the conscript at the same time. Demonstrates
 * the `debuff` kind on a Ch1 elite: a parade-ground War-Cry that frightens (the
 * player attacks at disadvantage while it holds), turning the goblin recruit at
 * his elbow from filler into a real second blade. Soft DC 11 for the early band;
 * he re-barks it the moment the fear lapses, otherwise he runs you through.
 */
export const HOBGOBLIN_DRILLMASTER: Monster = MonsterSchema.parse({
  id: 'hobgoblin-drillmaster',
  name: 'Hobgoblin Drillmaster',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (goblinoid)',
  ac: 18,
  maxHp: 40,
  speed: 30,
  abilityScores: { str: 15, dex: 14, con: 13, int: 12, wis: 12, cha: 11 },
  passivePerception: 11,
  actions: [
    {
      kind: 'debuff',
      name: "Drillmaster's Bark",
      condition: 'frightened',
      saveDC: 11,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'He does not shout at you. He shouts THROUGH you, the way he shouts through a parade square — a flat command-voice that finds the part of you that was once told to stand still and be hit.',
    },
    {
      kind: 'attack',
      name: 'Drilled Longsword',
      attackBonus: 6,
      damage: '1d10+4',
      damageType: 'slashing',
      reach: 5,
      description:
        'No flourish to it. A straight thrust off the front foot, recovered before you can punish the lunge — the same cut ten thousand times.',
    },
  ],
  flavorText:
    'Scavenged half-plate kept to a shine no scavenger keeps. He has trained levies his whole short violent life and treats the goblin at his elbow as a tool and you as a discipline problem. Both are solved the same way.',
});
