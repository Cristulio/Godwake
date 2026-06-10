import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Heart-Ember — not a creature so much as a wound made briefly visible. While
 * Hargan-Vor fights, the rite hiding his cut-out heart slips and a single ember
 * of it surfaces here, hovering and red at the edge of him. It IS the giant's
 * condition gate (see yaga-shura.ts): while it burns, blows on the giant find
 * nothing to land in. So it is built as a deliberate 1-2 turn objective at its
 * chapter — tanky enough not to pop in one hit, but no real damage threat — not
 * the trivial early-game elemental that stood in for it before. Its HP rides the
 * ascension scaling every summon now takes (engine/combat monsterSummon).
 */
export const HEART_EMBER: Monster = MonsterSchema.parse({
  id: 'heart-ember',
  name: 'Heart-Ember',
  cr: '4',
  size: 'small',
  creatureType: 'elemental (fragment)',
  ac: 14,
  maxHp: 95,
  speed: 0,
  abilityScores: { str: 5, dex: 14, con: 20, int: 3, wis: 10, cha: 16 },
  passivePerception: 8,
  resistances: ['bludgeoning', 'piercing', 'slashing'],
  immunities: ['fire', 'poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Searing Pulse',
      attackBonus: 6,
      damage: '1d8',
      damageType: 'fire',
      reach: 5,
      description:
        'The ember throbs once, in time with a heart beating a hundred leagues away, and the heat of it laps out at you — a reminder, not a wound.',
    },
  ],
  flavorText:
    'A single coal of the giant\'s cut-out heart, surfaced from wherever the rite hid it, hanging in the air red and slow. It does not strike so much as smoulder. While it burns, the man cannot be killed — put it out and he becomes mortal for the first time.',
});
