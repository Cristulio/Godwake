import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Half-Dragon Reaver — Chapter 13 mid. The cunning half of Abazigal's brood:
 * his half-blooded get grown to warriors, blue-scaled and broad, carrying the
 * storm in their lineage and a greataxe in their hands. They fight with their
 * sire's pride and a soldier's discipline both — a heavy `multiattack` (the
 * crackling greataxe, twice) and a `debuff` that leaves the struck arm dead and
 * weak (weakened) where the lightning ran through it.
 */
export const HALF_DRAGON_REAVER: Monster = MonsterSchema.parse({
  id: 'half-dragon-reaver',
  name: 'Half-Dragon Reaver',
  cr: '13',
  size: 'medium',
  creatureType: 'humanoid (half-dragon)',
  ac: 19,
  maxHp: 168,
  speed: 30,
  abilityScores: { str: 20, dex: 13, con: 17, int: 11, wis: 12, cha: 13 },
  passivePerception: 12,
  resistances: ['lightning'],
  actions: [
    {
      kind: 'attack',
      name: 'Crackling Greataxe',
      attackBonus: 11,
      damage: '2d12+5',
      damageType: 'slashing',
      reach: 5,
      description:
        'A greataxe edged in cobalt scale-metal, and the reaver\'s own storm-blood runs down the haft into the steel — so the blow lands as a cut and a shock at once, the edge biting while the current jumps the wound wider.',
    },
    {
      kind: 'multiattack',
      name: 'Reaver\'s Cadence',
      attacks: 2,
      description:
        'Half its father\'s pride and half a drilled soldier\'s discipline, it works the axe in a measured two-stroke, the recovery of the first swing already the windup of the second.',
    },
    {
      kind: 'debuff',
      name: 'Sundering Shock',
      condition: 'weakened',
      saveDC: 16,
      saveAbility: 'con',
      durationRounds: 2,
      amount: 4,
      description:
        'It hooks the axe and lets the lightning crawl down it into your sword-arm, and the muscle there goes dead and clumsy for a while, so every blow you land after comes in soft.',
    },
  ],
  flavorText:
    "Where the wyrmlings are Abazigal's beasts, the reavers are his sons — half-dragon by his blood, grown to broad blue-scaled warriors who carry both his pride and the discipline he was careful to drill into them. They guard the heart-galleries of the lair as a household guards its lord, and they fight like it: no wasted motion, no fear, the greataxe coming in the same measured cadence every time and the storm in their veins riding down the edge. They know what their father is becoming. They intend to be standing at his side when he does.",
});
