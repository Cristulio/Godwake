import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Deathless Ascendant — an ascension-only ELITE (Ascension ≥ 2). A soul that climbed
 * the wheel so many times it forgot how to stop, dragged along beside the player as a
 * grim mirror; not bound to a chapter. An attrition tank: a self `sustain` that simply
 * refuses the ending (heal 4d8, cooldown 2), a heavy cleaver, a `debuff` (frightened —
 * the dread of a thing that will not die), and `battle-rage` to close. Endgame band
 * (CR 14): the longer it stands, the worse the maths.
 */
export const DEATHLESS_ASCENDANT: Monster = MonsterSchema.parse({
  id: 'deathless-ascendant',
  name: 'Deathless Ascendant',
  cr: '14',
  size: 'medium',
  creatureType: 'undead (twice-ascended)',
  ac: 19,
  maxHp: 198,
  speed: 30,
  abilityScores: { str: 19, dex: 14, con: 20, int: 12, wis: 16, cha: 18 },
  passivePerception: 14,
  resistances: ['necrotic', 'poison', 'radiant'],
  actions: [
    {
      kind: 'sustain',
      name: 'Refuse the Ending',
      target: 'self',
      heal: '4d8',
      cooldownRounds: 2,
      description:
        'You put it down and it declines. The wounds knit with the bored ease of a thing that has died more times than you have drawn breath, the gap where its life should run already filled by sheer dull refusal — it has been to the bottom of the wheel and back too often to take a little dying seriously.',
    },
    {
      kind: 'debuff',
      name: 'Weight of Every Death',
      condition: 'frightened',
      saveDC: 17,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It lets you feel, for a moment, the full count of its endings — every fall down the chain, every cold waking at the bottom, stacked into a single weight and set on your chest — and the body knows long before the mind does that there is no winning against a thing that has already lost this fight a thousand times and come back anyway.',
    },
    {
      kind: 'attack',
      name: 'Wheel-Worn Cleaver',
      attackBonus: 12,
      damage: '2d12+6',
      damageType: 'slashing',
      reach: 5,
      description:
        'The blade is old past telling, notched and re-ground down the centuries it has carried it up the wheel, and it swings with the flat patience of a labourer at a task it has done too many times to rush — there is no anger in it, only the certainty that the work ends when you do.',
    },
  ],
  bossMechanic: 'battle-rage',
  flavorText:
    "Some souls climb the wheel for an ending — to ascend, to break the cycle, to finally be allowed to stop. This one climbed for so long that the wanting wore out, and the stopping never came, and somewhere on the thousandth descent it simply forgot the difference between living and not. The Deathless Ascendant is what is left: a climber that no longer remembers a destination, walking the chain out of pure habit, neither alive enough to rest nor dead enough to be released. It rises in the same chapters you do because it is doing the same thing you are, and it looks at you the way a man looks at his own reflection in bad light — with a dim, exhausted recognition, and the dull conviction that the only mercy left in any of it is to make sure you never have to climb as far as it has.",
});
