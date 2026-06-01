import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Burning Dead — Chapter 12 fodder. The immolated dead of Saradush, the
 * townsfolk and refugee Bhaalspawn the siege-fires caught and would not let
 * lie. They rose still alight, and they have not gone out. A fire `attack`
 * (the charred grasp that sears what it holds) paired with a `debuff` that
 * `frightened`s — there is a particular horror in a thing that walks toward
 * you wearing its own burning, mouth open in a scream it stopped making an age
 * ago.
 */
export const BURNING_DEAD: Monster = MonsterSchema.parse({
  id: 'burning-dead',
  name: 'Burning Dead',
  cr: '10',
  size: 'medium',
  creatureType: 'undead',
  ac: 16,
  maxHp: 124,
  speed: 30,
  abilityScores: { str: 15, dex: 12, con: 16, int: 6, wis: 9, cha: 8 },
  passivePerception: 9,
  resistances: ['fire', 'necrotic'],
  immunities: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Charred Grasp',
      attackBonus: 8,
      damage: '2d8+4',
      damageType: 'fire',
      reach: 5,
      description:
        'It takes hold of you with hands that are still burning, and the fire does not so much spread as continue — it was never put out, and now it is on you too, and the dead thing leans in as if to share the warmth.',
    },
    {
      kind: 'debuff',
      name: 'A Face Still Screaming',
      condition: 'frightened',
      saveDC: 16,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It turns the ruin of its face to you, mouth fixed open around a scream it finished screaming weeks ago, and some part of you that knows exactly how this ends recoils before you can master it.',
    },
  ],
  flavorText:
    "When Yaga-Shura's fire came over the walls it did not kill cleanly. It caught the people of Saradush in their houses and their streets and it stayed caught, and the dead it made rose still alight, walking the smoke with their own burning for a shroud. They do not know the siege is the cause of them. They only know they are on fire, and that they are not, and that you are not yet, and they would have you join them in the only state they have left.",
});
