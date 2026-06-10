import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Charmed Tor Maladin Archer — Chapter 10 warmup. One of the hidden city's
 * own defenders, turned: a high elf of the canopy-watch whose mind Velnaris or
 * his dryads have hollowed out, still drilling the bow it has carried for three
 * centuries, only pointed the wrong way now. A clean ranged striker. The horror
 * is in the precision — these were the finest archers in Tessar, and they have
 * not forgotten how, only why.
 */
export const SULDANESSELLAR_ARCHER: Monster = MonsterSchema.parse({
  id: 'suldanessellar-archer',
  name: 'Charmed Tor Maladin Archer',
  cr: '9',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 17,
  maxHp: 115,
  speed: 30,
  abilityScores: { str: 12, dex: 19, con: 14, int: 13, wis: 15, cha: 12 },
  passivePerception: 16,
  actions: [
    {
      kind: 'attack',
      name: 'Canopy-Watch Longbow',
      attackBonus: 12,
      damage: '2d8+7',
      damageType: 'piercing',
      range: [80, 320],
      description:
        'It draws without looking, the way a thing does a motion it has made ten thousand times, and the shaft is in you before the bow has finished its arc. The eyes above the nocked arrow are open and empty and aimed, and there is no one behind them to ask why.',
    },
  ],
  flavorText:
    "Tor Maladin set its watchers in the high boughs, and for three hundred years no enemy reached the Tree without first answering their arrows. Now the watch answers to the thing in the temple. The elf on the branch above you nocks an arrow with the unhurried grace of its whole long life, and looses it at the city it was born to guard, because something reached into it and turned the loyalty around without troubling to remove it. It will not stop until the bow is broken or the elf is.",
});
