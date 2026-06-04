import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ilyich, the duergar slaver — boss of Chapter 1's Velnaris dungeon, and the
 * game's tutorial boss for the telegraph read.
 *
 * Above half HP he simply trades plain pick swings (learn to attack and
 * defend). At half HP the stone-blood fury takes him: a boss-framework HP PHASE
 * swaps his action list to a single, devastating Overhead Pick that he must
 * WIND UP — a telegraphed charge the player gets one full turn to answer (race
 * the HP, brace, or hard-control him to cancel the blow), then it falls. The
 * phase enrages him (+2 damage) and drops his AC by 2 as he abandons his guard.
 *
 * This replaces the old `battle-rage` flag with a richer, readable berserk: same
 * "push him to half and he turns dangerous" beat, now layered with the telegraph
 * the chapter is meant to teach. Magnitudes are deliberately conservative
 * pending the sim pass.
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
  phases: [
    {
      atHpPctBelow: 50,
      name: 'Stone-Blood Fury',
      enterText:
        'Ilyich throws his head back and roars — stone-blood fury takes him. He plants his boots, drops his guard, and hauls the war pick high over his head.',
      replaceActions: true,
      addActions: [
        {
          kind: 'attack',
          name: 'Overhead Pick',
          attackBonus: 5,
          damage: '2d8+3',
          damageType: 'piercing',
          reach: 5,
          telegraph: {
            chargeText:
              'Ilyich heaves the war pick up overhead, both hands white on the haft, every muscle winding — the next blow will fall with all his weight behind it.',
          },
          description:
            'The pick comes down in a full overhead arc, the whole weight of his stone-heavy frame driving the spike through guard and bone alike.',
        },
      ],
      bonusDamage: 2,
      acDelta: -2,
      transform: true,
    },
  ],
  flavorText:
    "Ilyich led the duergar slavers the master paid to break and feed his subjects. A guard's bored cruelty and a slaver's patience — until you cut him. Push him to half and the stone-blood fury takes him: guard forgotten, the war pick rising over his head for downstrokes you will see coming and have to answer all the same.",
});
