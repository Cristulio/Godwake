import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ilyich, the duergar slaver — boss of BG2 Chapter 1's Irenicus dungeon.
 * Reskinned Goblin Warden role: same fight shape, very different flavor.
 */
export const ILYICH: Monster = MonsterSchema.parse({
  id: 'duergar-ilyich',
  name: 'Ilyich the Duergar',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (dwarf, duergar)',
  ac: 15,
  maxHp: 32,
  speed: 25,
  abilityScores: { str: 15, dex: 11, con: 14, int: 11, wis: 10, cha: 9 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Heavy War Pick',
      attackBonus: 5,
      damage: '1d10+3',
      damageType: 'piercing',
      reach: 5,
      description:
        'The grey-skinned dwarf swings his pick in a heavy two-handed arc. He shouts a curse in Undercommon as the head bites.',
    },
  ],
  resistances: ['poison'],
  bossMechanic: 'battle-rage',
  flavorText:
    'Ilyich led the duergar slavers the master paid to break and feed his subjects. A guard\'s bored cruelty and a slaver\'s patience — until you cut him. Push him to half and he goes berserk, pick swinging with the full weight of stone-blood fury.',
});
