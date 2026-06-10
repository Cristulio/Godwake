import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slayer-Shade — Chapter 11 fodder, and the thing the Pride trial calls to its
 * side. An echo of the Slainkin taint that the pit drags up out of you: the
 * Slayer-form you carry as your father's son, peeled off and given a half-life of
 * its own, all murder and no self. A `lifeDrain` striker — every wound it opens it
 * pours back into itself (heals half the necrotic it deals), because it is made of
 * appetite and the only way it stays whole is to take you into it. The more it
 * fights you the more it wears your face, which was always the horror of the form.
 */
export const SLAYER_SHADE: Monster = MonsterSchema.parse({
  id: 'slayer-shade',
  name: 'Slayer-Shade',
  cr: '10',
  size: 'medium',
  creatureType: 'fiend (bhaal-echo)',
  ac: 18,
  maxHp: 164,
  speed: 40,
  abilityScores: { str: 19, dex: 18, con: 17, int: 9, wis: 11, cha: 13 },
  passivePerception: 13,
  resistances: ['necrotic', 'cold'],
  actions: [
    {
      kind: 'attack',
      name: 'Slayer-Talon',
      attackBonus: 12,
      damage: '2d10+7',
      damageType: 'necrotic',
      reach: 5,
      lifeDrain: 0.5,
      description:
        'It opens you with a hand that is your hand grown long and grey and certain, and the warmth that runs out of the wound does not fall to the floor — it runs the wrong way, up the talon and into the shade, which steadies and darkens and looks, for a moment, exactly that much more like you.',
    },
  ],
  flavorText:
    "Every child of the Lord of Murder carries the Slayer the way a sword carries an edge: a shape under the skin that is nothing but the urge to kill, made flesh. Most spend their lives keeping it asleep. Here, in the captor's pit, the burning ground reaches into you and pulls a thread of it loose — and what comes free is this, a grey, swift, hungering echo of the worst thing you could be, wearing the start of your own features and meaning to wear the rest. It is not summoned from outside. It was always in you. Hell only does you the discourtesy of letting it walk.",
});
