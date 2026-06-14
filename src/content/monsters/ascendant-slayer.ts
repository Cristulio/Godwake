import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ascendant Slayer — an ascension-only ELITE (Ascension ≥ 2). Not bound to any one
 * chapter: it is the Slayer-shape the climbing soul drags up the wheel with it, and
 * the higher the ascension the more of the dead god wakes in its shadow, so it
 * bleeds through every chapter of the descent. A pure striker — a two-strike
 * `multiattack` of life-drinking rends, and `battle-rage` so the second half of the
 * fight hits harder than the first. Endgame band (CR 15) on purpose: an extreme-risk
 * elite node, ruinous early, a real threat to the last.
 */
export const ASCENDANT_SLAYER: Monster = MonsterSchema.parse({
  id: 'ascendant-slayer',
  name: 'Ascendant Slayer',
  cr: '15',
  size: 'large',
  creatureType: 'fiend (slain-god essence)',
  ac: 18,
  maxHp: 208,
  speed: 40,
  abilityScores: { str: 21, dex: 18, con: 19, int: 10, wis: 12, cha: 16 },
  passivePerception: 14,
  resistances: ['necrotic', 'poison'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Ascendant Frenzy',
      attacks: 2,
      description:
        'It does not pace itself. The whole of it comes at once and then again, two lines of attack out of a body that has stopped pretending to be yours — each rend covering the wind-up of the next, the way your own blood would fight if you ever once let go of it.',
    },
    {
      kind: 'attack',
      name: 'Frenzied Rend',
      attackBonus: 13,
      damage: '2d10+8',
      damageType: 'necrotic',
      reach: 5,
      lifeDrain: 0.3,
      description:
        'It opens you the wrong way round, and the red runs up its arms instead of down yours — the wound feeding the thing that made it, so that every cut it lands stands it a little taller and leaves you a little less sure the next climb will be yours to make.',
    },
  ],
  bossMechanic: 'battle-rage',
  flavorText:
    "Climb the wheel often enough and something climbs it with you. The Ascendant Slayer is the god's murder-shape grown bold on repetition — the Slayer that rose in your shadow at the Throne, and did not lie back down when the cycle turned you out into a new life at the bottom of the chain. Each ascension it remembers more, and wakes earlier, and shoulders further up out of you, until it no longer waits for the Throne to be reached before it walks. It wears your reach and your timing because they were yours; it has simply stopped agreeing that the body around them is. It does not speak. It has only ever wanted the one thing — to be the one who finishes the climb — and it has always been willing to be you to get it.",
});
