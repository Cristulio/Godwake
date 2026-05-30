import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Fallen Archon — Ch5 elite captain. The dead god's general, a war-celestial
 * burnt hollow but still drilled to the bone. `multiattack` (two strikes of the
 * judgement-sword) over a clean radiant `attack`, plus `battle-rage`: once it
 * drops to half HP it stops holding the line and starts settling the account
 * (+2 damage per hit, rest of combat). The hardest non-boss thing in the
 * Godwake — a dress rehearsal for the Hollow Dawn. Resists radiant.
 */
export const FALLEN_ARCHON: Monster = MonsterSchema.parse({
  id: 'fallen-archon',
  name: 'Fallen Archon',
  cr: '7',
  size: 'large',
  creatureType: 'celestial',
  ac: 17,
  maxHp: 88,
  speed: 30,
  abilityScores: { str: 19, dex: 14, con: 18, int: 12, wis: 15, cha: 16 },
  passivePerception: 14,
  resistances: ['radiant'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'multiattack',
      name: 'Judgement-Forms',
      attacks: 2,
      description:
        'It fights the way a fortress would fight if a fortress could step — no wasted motion, two measured strokes of the great sword, each one landing exactly where the last opened you.',
    },
    {
      kind: 'attack',
      name: 'Greatsword of the Last Host',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'radiant',
      reach: 10,
      description:
        'A two-handed blade of fixed light longer than you are tall, swung in flat economical arcs that give off no heat and take no prisoners.',
    },
  ],
  flavorText:
    "It led the god's last war and it lost, and the losing burnt the captain out of the armour without ever letting the armour fall down. Pauldrons the size of shields, a helm with two slits of cold light, a tabard whose blazon has gone to soot. It still holds the line at the threshold of the Godwake — out of orders no one alive remembers giving, against an enemy it long ago stopped being able to lose to anyone but you.",
});
