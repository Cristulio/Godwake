import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Mirror-Double — Chapter 9 fodder, and the thing the Court's glass keeps
 * spawning. It peels off a cracked looking-glass wearing your own shape and
 * fights you with your own habits — a plain `attack` striker whose high AC is
 * just your own guard turned back on you (it copies the last stance it saw).
 * Summoned by the Glasswright Duelist and the Mask-Chamberlain; also walks the
 * warmup pools on its own.
 */
export const MIRROR_DOUBLE: Monster = MonsterSchema.parse({
  id: 'mirror-double',
  name: 'Mirror-Double',
  cr: '8',
  size: 'medium',
  creatureType: 'construct',
  ac: 18,
  maxHp: 90,
  speed: 30,
  abilityScores: { str: 16, dex: 16, con: 14, int: 8, wis: 11, cha: 10 },
  passivePerception: 11,
  resistances: ['psychic', 'force'],
  actions: [
    {
      kind: 'attack',
      name: 'Your Own Stroke, Returned',
      attackBonus: 10,
      damage: '2d8+5',
      damageType: 'slashing',
      reach: 5,
      description:
        'It does not invent an attack. It gives you back the last one you threw — the same line, the same timing, struck with a glass edge — so that to parry it you must somehow be quicker than yourself.',
    },
  ],
  flavorText:
    "Every wall of the Court was mirrored once, so the masked could admire the faces they had stolen. The glass cracked but did not stop reflecting; now anything that passes leaves a copy behind, a flat bright thing that steps out of the surface wearing your stance and carrying your worst habits as a weapon. It is not clever. It does not need to be. It only has to be exactly as good as you, and unwilling to die first.",
});
