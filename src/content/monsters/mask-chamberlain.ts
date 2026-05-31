import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Mask-Chamberlain — Chapter 9 ELITE. The official who ran the household of
 * the Court and runs its ruin still: it keeps the masquerade staffed and patched
 * forever. It `summon`s Mirror-Doubles off the hall's broken glass to fill out
 * the room (count 1, maxActive 2, cooldown 3) and `sustain`s the fallen — laying
 * a fresh mask on a downed courtier and vouching it back to its feet (ally heal
 * 3d6 + a 20-point ward of court-authority, cooldown 2) — while crushing with its
 * heavy ceremonial staff. Fell the chamberlain or the court never empties.
 */
export const MASK_CHAMBERLAIN: Monster = MonsterSchema.parse({
  id: 'mask-chamberlain',
  name: 'The Mask-Chamberlain',
  cr: '12',
  size: 'large',
  creatureType: 'undead',
  ac: 19,
  maxHp: 188,
  speed: 30,
  abilityScores: { str: 19, dex: 13, con: 19, int: 16, wis: 17, cha: 18 },
  passivePerception: 15,
  resistances: ['psychic', 'bludgeoning', 'necrotic'],
  actions: [
    {
      kind: 'summon',
      name: 'Fill the Hall',
      summonDefId: 'mirror-double',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'It strikes the floor with its staff of office, the old call for the household to assemble, and the cracked panes along the walls give up your reflections one by one to stand the room — an empty court refusing, as a matter of protocol, to be empty.',
    },
    {
      kind: 'sustain',
      name: 'A Fresh Mask',
      target: 'ally',
      heal: '3d6',
      wardTempHp: 20,
      cooldownRounds: 2,
      description:
        'It stoops over a fallen courtier with a chamberlain\'s unhurried care, lifts the cracked mask away and sets a fresh one in its place, and vouches the thing back into the household — the ruin sealing under a glaze of borrowed standing that has to be broken through all over again.',
    },
    {
      kind: 'attack',
      name: 'Staff of Office',
      attackBonus: 11,
      damage: '2d10+7',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'The long ebony staff it once used to rap for silence comes down on you with the full weight of a thing that has had its authority questioned exactly once and does not intend to allow a second time.',
    },
  ],
  flavorText:
    "A great house runs on someone no one ever looks at — the steward who knows every face and keeps every secret and never, ever wears a mask of their own, because their power is in being trusted to assign the others. The Court's chamberlain is that someone, and death has not relieved it of the post. It keeps the masquerade staffed out of the mirrors and patched out of protocol, presiding over a ball with no guests left, refusing on principle to admit the house has fallen. To it you are not an intruder. You are an irregularity in the seating, and it will see you corrected.",
});
