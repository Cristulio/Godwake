import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Page-Wraith — Ch7 warmup/early striker. A drift of loose pages torn out of
 * drowned books that learned, in the dark, to hate the warm and the whole. A
 * life-drain attacker (`lifeDrain` on its cutting flock — it heals half the cold
 * it deals): every page that opens you reads a little of your heat away into
 * itself. The thing the Tidebound Codex spits loose by the ream; fought singly
 * it is a nuisance, fought in a flock it bleeds a careless party white.
 */
export const PAGE_WRAITH: Monster = MonsterSchema.parse({
  id: 'page-wraith',
  name: 'Page-Wraith',
  cr: '7',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 100,
  speed: 30,
  abilityScores: { str: 14, dex: 18, con: 15, int: 9, wis: 11, cha: 12 },
  passivePerception: 11,
  resistances: ['cold', 'slashing'],
  actions: [
    {
      kind: 'attack',
      name: 'Reading Flock',
      attackBonus: 9,
      damage: '2d6+5',
      damageType: 'slashing',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'The pages come at you all at once and all edge-on, a thousand small cuts that are also a thousand small mouths, and where each one opens you it takes the warmth out through the wound and folds it into itself, growing a shade less grey for it.',
    },
  ],
  flavorText:
    "Loosed from their bindings when the water swelled the spines and burst them, the pages did not rot — they drifted, and drifting in the dark for long enough they took on a kind of hunger that is almost a kind of reading. They hate what is whole the way the unbound hate the bound. They want only to come apart with you and learn, page by page, exactly how you were put together.",
});
