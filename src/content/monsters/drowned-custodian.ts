import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Drowned Custodian — Chapter 7 boss, the bound guardian of the Drowned
 * Archive and the first true gate on the deep descent toward the captor. Once
 * the Keeper who drowned the whole library rather than let its forbidden knowing
 * loose, then was drowned with it and bound to catalogue forever, unable to
 * finish and unable to die.
 *
 * Kit (the proven apex pattern, scaled a clear notch above the Ch6 boss): a
 * round-1 `paralyze` opener that reads you out of yourself under the weight of
 * everything it has kept, then `multiattack` every round thereafter (the picker
 * falls to multiattack once the opener is spent), swinging its single drowning
 * blow. `battle-rage` past half turns the back of the fight into the moment it
 * stops cataloguing you and simply commits to closing you, like a book, for
 * good. Highest stat block of the Drowned Archive — the start of the L20 descent.
 */
export const DROWNED_CUSTODIAN: Monster = MonsterSchema.parse({
  id: 'drowned-custodian',
  name: 'The Drowned Custodian',
  cr: '11',
  size: 'large',
  creatureType: 'undead (keeper)',
  ac: 20,
  maxHp: 210,
  speed: 30,
  abilityScores: { str: 20, dex: 15, con: 20, int: 19, wis: 20, cha: 18 },
  passivePerception: 20,
  resistances: ['cold', 'necrotic', 'psychic'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'Reading of the Stilled',
      saveDC: 19,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It opens you the way it opens a book it has read a thousand times, finds the place where your name is written, and reads it aloud in the drowned dark — and hearing yourself read out, filed, catalogued, and shelved, the body forgets for a moment that it was ever anything but a thing kept on a list.',
    },
    {
      kind: 'multiattack',
      name: 'Close the Volume',
      attacks: 2,
      description:
        'Both drowned hands come round at once, the way a keeper closes a great book at the end of the day — over and over, each fall heavier than the last, putting you away.',
    },
    {
      kind: 'attack',
      name: 'Weight of Black Water',
      attackBonus: 12,
      damage: '2d10+8',
      damageType: 'cold',
      reach: 10,
      description:
        'The blow lands with the whole pressure of the drowned vault behind it, forty fathoms of black water and every secret sunk in it, and where it touches you the cold goes all the way in and reads you, briefly, the way the deep reads anything that sinks: completely, and without mercy, and to the bottom.',
    },
  ],
  flavorText:
    "When word came that the captor's enemies were near, the Keeper of this place did not flee with the forbidden books and did not burn them. It opened the floodgates and brought the dark sea in over the whole library, drowning every dangerous page and itself along with them, so that nothing the captor had buried here could ever be read out into the world. The water kept its word. It also kept the Keeper — bound now to the stacks it murdered, cataloguing the drowned forever, never finishing, never dying, a guardian made of its own last loyal act. It does not rise to meet you in anger. It rises the way a tide rises, certain and slow, and says, in a voice full of black water: \"You are the first thing to come down here in an age that still has a name. Give it to me. I will file you where the others are filed, and you will be kept, and kept, and never have to climb again. The road below leads only to the one who drowned us both. Be still. Let me close you here, where it is quiet.\"",
});
