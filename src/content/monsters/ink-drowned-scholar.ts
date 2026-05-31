import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ink-Drowned Scholar — Ch7 early-mid controller. A scholar who read past the
 * point of return and dissolved into the ink it lived in, now a standing column
 * of black water that floods a reader's eyes with everything it learned. Opens
 * by drowning your sight in ink (`debuff` → blinded, DC 17; the picker re-floods
 * it whenever it clears, so it keeps you half-blind on a two-round cadence) then
 * lashes with a whip of its own dissolving substance. Cut it or read the rest of
 * the chapter at disadvantage.
 */
export const INK_DROWNED_SCHOLAR: Monster = MonsterSchema.parse({
  id: 'ink-drowned-scholar',
  name: 'Ink-Drowned Scholar',
  cr: '8',
  size: 'medium',
  creatureType: 'aberration',
  ac: 18,
  maxHp: 112,
  speed: 30,
  abilityScores: { str: 12, dex: 16, con: 16, int: 18, wis: 15, cha: 14 },
  passivePerception: 14,
  resistances: ['acid', 'poison'],
  actions: [
    {
      kind: 'debuff',
      name: 'Floodwriting',
      condition: 'blinded',
      saveDC: 17,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It opens what used to be its mouth and the ink comes out in a slow black bloom, finding your eyes and flooding them — and behind your shut lids you read, unwilling, line after line of the thing it drowned learning, until there is no room left to see by.',
    },
    {
      kind: 'attack',
      name: 'Dissolving Lash',
      attackBonus: 10,
      damage: '2d8+6',
      damageType: 'acid',
      reach: 10,
      description:
        'It throws out an arm that is no longer an arm, a rope of its own dissolving body, and where the ink touches it eats — not the flesh first but the words for the flesh, so the wound forgets how to close.',
    },
  ],
  flavorText:
    "It wanted to know everything, and in the drowned stacks where the forbidden books were sunk to keep them from the world it very nearly did — and the knowing unmade it, ran it together with the ink it bled into the margins until scholar and text were one black water. It does not speak. It writes, on the inside of you, the one sentence it has left: that some things are learned only by coming apart, and it would so love the company.",
});
