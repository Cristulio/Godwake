import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slagbound Legionary — Chapter 8 early-mid bruiser. One of the heavy infantry
 * fused to its own plate when the firestorm rolled the line — armour and man run
 * together into a single slow walking ingot. The chapter's wall: high `ac`,
 * `multiattack`, and a stat block that simply does not hurry. You break it down
 * or you go around it, but there is no rushing past.
 */
export const SLAGBOUND_LEGIONARY: Monster = MonsterSchema.parse({
  id: 'slagbound-legionary',
  name: 'Slagbound Legionary',
  cr: '8',
  size: 'medium',
  creatureType: 'undead',
  ac: 19,
  maxHp: 124,
  speed: 25,
  abilityScores: { str: 18, dex: 9, con: 18, int: 7, wis: 10, cha: 8 },
  passivePerception: 10,
  resistances: ['fire', 'bludgeoning', 'poison'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Locked Advance',
      attacks: 2,
      description:
        'It comes on at a walk it cannot break, shield-edge then fused fist, the whole weight of a man poured into metal driving each blow through whatever guard you raise.',
    },
    {
      kind: 'attack',
      name: 'Fused Gauntlet',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'The hand and the gauntlet are one cooled lump of slag now, swung on a stiff arm like a maul on a short haft. There is no skill left in it — only mass, and the certainty of a thing that cannot feel what you do back.',
    },
  ],
  flavorText:
    "When the fire came down the line the heavy companies did not break ranks; they stood, as drilled, and the heat welded them where they stood — pauldron to shoulder, greave to shin, visor to the face behind it. What rose afterward is a man and his harness with no seam left between them, marching the same fifty yards of ash it has marched for a century, leaning into a charge that already happened.",
});
