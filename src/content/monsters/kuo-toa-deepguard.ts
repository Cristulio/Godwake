import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Kuo-Toa Deepguard — Chapter 13 fodder out of the flooded approaches to
 * Abazigal's Lair. The fish-folk of the deep caverns took the half-dragon for a
 * god the moment he came down into their water, and now they keep his lower
 * galleries with barbed harpoons and clinging nets. A reach `attack` (the barbed
 * harpoon that drags as it bites) and a `debuff` (the sticky mucus net that
 * fouls you in place — restrained) to hold you for the brood that comes behind.
 */
export const KUO_TOA_DEEPGUARD: Monster = MonsterSchema.parse({
  id: 'kuo-toa-deepguard',
  name: 'Kuo-Toa Deepguard',
  cr: '11',
  size: 'medium',
  creatureType: 'humanoid (kuo-toa)',
  ac: 17,
  maxHp: 120,
  speed: 30,
  abilityScores: { str: 16, dex: 15, con: 16, int: 9, wis: 14, cha: 8 },
  passivePerception: 14,
  resistances: ['cold'],
  actions: [
    {
      kind: 'attack',
      name: 'Barbed Harpoon',
      attackBonus: 9,
      damage: '2d8+4',
      damageType: 'piercing',
      reach: 10,
      description:
        'A long harpoon of black coral and dragon-bone, barbed so it bites going in and tears coming out — and the deepguard hauls on the line the instant it sets, to drag you down to where the water is.',
    },
    {
      kind: 'debuff',
      name: 'Sticky Net',
      condition: 'restrained',
      saveDC: 15,
      saveAbility: 'dex',
      durationRounds: 2,
      description:
        'It casts a net wept over with the glue the fish-folk render from their own backs, and where it lands it clings and will not be shrugged — webbing you to the wet stone for the harpoons that come behind.',
    },
  ],
  flavorText:
    "Long before Abazigal took the deep caverns for his lair, the kuo-toa held the water at the bottom of them, mad and devout and waiting for a god to come down into the dark and be worshipped. When the half-dragon came, they decided he was the one, the way the fish-folk always decide, all at once and past all argument — and now they keep his lower galleries as zealously as they once kept their own dead idols. They croak his name in their drowned tongue as they cast, and they mean it as a prayer, and the harpoon at the end of the prayer is just as sharp.",
});
