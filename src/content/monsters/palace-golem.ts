import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Rillifane Palace Golem — Chapter 10 mid. An ironwood guardian of the elven
 * palace and the temple halls, grown rather than forged, set to keep the inner
 * city. It does not know the city has fallen; it knows only that you are not of
 * the blood it was made to admit, and so it must not let you pass. A tanky
 * `multiattack` slammer — high AC, poison/psychic immune, no mind to break.
 */
export const PALACE_GOLEM: Monster = MonsterSchema.parse({
  id: 'palace-golem',
  name: 'Rillifane Palace Golem',
  cr: '11',
  size: 'large',
  creatureType: 'construct',
  ac: 19,
  maxHp: 168,
  speed: 25,
  abilityScores: { str: 21, dex: 9, con: 20, int: 3, wis: 11, cha: 1 },
  passivePerception: 10,
  immunities: ['poison', 'psychic'],
  resistances: ['piercing', 'slashing'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Gatewarden Sweep',
      attacks: 2,
      description:
        'It does not hurry and it does not feint. The two great ironwood arms come round one after the other in the slow inevitable arc of a gate closing, and the only question the thing is asking is whether you will still be standing in the doorway when the second one arrives.',
    },
    {
      kind: 'attack',
      name: 'Ironwood Slam',
      attackBonus: 12,
      damage: '2d10+6',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'A fist of living elder-wood, grown around a heart of temple-stone, falls on you with the weight of the whole standing palace behind it, and the floor takes the shock a half-beat after your bones do.',
    },
  ],
  flavorText:
    "The high elves did not forge their guardians; they grew them, shaping the heartwood of ancient trees around a core of consecrated stone and waking them to one long instruction — keep the inner halls, admit only the blood of the city. The golem at the temple door has kept that instruction for an age, and it keeps it yet, because no one told it the city was lost and it would not understand if they had. It reads you, finds you are not of the blood, and steps to bar the way with the patience of a thing that has never once been tired.",
});
