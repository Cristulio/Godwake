import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ember-Conscript — Chapter 8 (The Ashfall March) warmup striker. The chaff of
 * a dead army: a common foot-soldier burned into his own scorched mail and
 * marched on, long after the war it died for ended. Demonstrates `multiattack`
 * at this band — two drilled hacks of a char-edged sword. Fragile for the
 * chapter, but it comes up out of the ash in ranks and keeps the cadence it was
 * drilled in, forever.
 */
export const EMBER_CONSCRIPT: Monster = MonsterSchema.parse({
  id: 'ember-conscript',
  name: 'Ember-Conscript',
  cr: '7',
  size: 'medium',
  creatureType: 'undead',
  ac: 17,
  maxHp: 92,
  speed: 30,
  abilityScores: { str: 17, dex: 12, con: 16, int: 6, wis: 8, cha: 6 },
  passivePerception: 9,
  resistances: ['fire', 'necrotic'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Drilled Cadence',
      attacks: 2,
      description:
        'It works the old two-stroke drill into you the way a thing does a chore burned past the bone — high cut, low cut, the rhythm it was beaten into on some parade-ground a hundred years dead.',
    },
    {
      kind: 'attack',
      name: 'Char-Edged Sword',
      attackBonus: 8,
      damage: '1d10+5',
      damageType: 'fire',
      reach: 5,
      description:
        'The blade fused to its hand long ago, edge still glowing dull where the fire took it. Where it lands it does not so much cut as brand, the heat of an old burning passed on into you.',
    },
  ],
  flavorText:
    'A soldier worn down to almost nothing but the habit of obedience — face gone to slag under the helm, hands grown into the grips of a sword and shield it has not set down since the day the fire came through the line. It does not know the war is over. No one who could have told it survived to do so, and it would not have stood down on their word anyway. It only knows the order it was given last, and it keeps it.',
});
