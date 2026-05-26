import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Mad Mage Prisoner — a Spellhold inmate whose memory has been shaved down to
 * the single hand-shape of Magic Missile. He still casts it, over and over,
 * at anything that moves. Auto-hits in 5e RAW; modelled here as a high-bonus
 * force-damage attack to approximate the no-miss feel within the existing
 * attack schema.
 */
export const MAD_MAGE_PRISONER: Monster = MonsterSchema.parse({
  id: 'mad-mage-prisoner',
  name: 'Mad Mage Prisoner',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 11,
  maxHp: 22,
  speed: 30,
  abilityScores: { str: 8, dex: 12, con: 11, int: 16, wis: 8, cha: 9 },
  passivePerception: 9,
  actions: [
    {
      kind: 'attack',
      name: 'Magic Missile',
      attackBonus: 8,
      damage: '1d4+1',
      damageType: 'force',
      range: [120, 120],
      description:
        'The prisoner traces the same three sigils he has traced ten thousand times. A bolt of grey-violet light unspools from his fingertip and finds you without bothering to look.',
    },
  ],
  flavorText:
    "A shaven-headed man in a stained robe, the brand of the Cowled Wizards still fresh on his palm. He mutters the incantation without breath between words — the only thing left in the cell that still has a shape.",
});
