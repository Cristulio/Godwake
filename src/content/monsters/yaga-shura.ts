import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Yaga-Shura — Chapter 12 boss, the fire-giant lord of the Five and the hand
 * behind the siege of Saradush. Faithful to the Throne of Bhaal: his heart was
 * cut out in a ritual and hidden away, and while it beats elsewhere he cannot
 * truly be killed — wounds that would fell a giant only stoke him hotter.
 *
 * Kit: a `multiattack` apex (the world-ending greatsword, twice, at huge reach)
 * with a hurled flaming boulder for range. `battle-rage` reads the heart-rite
 * directly — taken past half, he does not fail; the missing heart means the
 * pain has nowhere to land, and he comes on harder for being hurt. The siege is
 * the lesson the player carries out of here: you cannot put this one down until
 * the heart is undone.
 */
export const YAGA_SHURA: Monster = MonsterSchema.parse({
  id: 'yaga-shura',
  name: 'Yaga-Shura',
  cr: '15',
  size: 'huge',
  creatureType: 'giant (bhaalspawn)',
  ac: 22,
  maxHp: 312,
  speed: 40,
  abilityScores: { str: 27, dex: 13, con: 23, int: 14, wis: 17, cha: 18 },
  passivePerception: 17,
  resistances: ['fire', 'bludgeoning', 'slashing'],
  immunities: ['fire'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'multiattack',
      name: 'The Siege Made Flesh',
      attacks: 2,
      description:
        'He fights the way his army fights, only there is only one of him and it is enough — two falling arcs of the great fire-blade, each carrying the whole mountain of him, each meant not to wound but to end.',
    },
    {
      kind: 'attack',
      name: 'Greatsword of the Burning March',
      attackBonus: 14,
      damage: '2d12+9',
      damageType: 'fire',
      reach: 15,
      description:
        'The blade is taller than a man and lit the orange-white of a forge at the pour. Where it lands it does not cut so much as render — flesh, plate and the stone behind you all going at once in a wash of heat that smells of the whole burning city.',
    },
    {
      kind: 'attack',
      name: 'Hurled Pyre-Stone',
      attackBonus: 14,
      damage: '3d12+9',
      damageType: 'bludgeoning',
      range: [60, 240],
      description:
        'He pulls a wagon-sized block of Saradush\'s own wall off the rubble, sets it alight in his bare hands, and throws it the length of the burning street — the city he came to unmake coming down on you in a single falling sun.',
    },
  ],
  flavorText:
    "After Irenicus, after the long climb back into the light, the dead god's blood pulls you on — and it pulls you here, to a city on fire. Saradush is ringed in red iron and packed with refugee Bhaalspawn, and the hand around its throat belongs to Yaga-Shura, one of the Five, the fire-giant lord who took the dead god's purpose for his own. Melissan sent you in past the line, through the burning, to break the siege — and the breaking ends here, with the giant himself, at the heart of the fire he made. But there is a trick in him you will learn the hard way: his heart was cut from his chest in a ritual and carried away, and while it beats somewhere far from here he does not feel the wounds that should kill him. Hurt him, and he only burns hotter. \"You came up out of the dark for THIS?\" the giant says, almost delighted, the greatsword already rising. \"Then burn with the rest of them, little godling. I cannot even feel you.\"",
});
