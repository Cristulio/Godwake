import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drowned Mnemonic — Ch7 mid controller. A memory that outlived the mind it
 * belonged to: the whole recall of some sunken scholar, peeled loose and kept
 * by the Archive long after the skull that held it dissolved. Opens combat by
 * pouring everything it remembers into you at once (`paralyze` → Total Recall,
 * DC 18, the round-1 opener the engine reserves for it), drowning the body's
 * small argument for moving under a sea of someone else's knowing, then strikes
 * with the one fact it has rehearsed a thousand turnings: that you are soft, and
 * here.
 */
export const DROWNED_MNEMONIC: Monster = MonsterSchema.parse({
  id: 'drowned-mnemonic',
  name: 'Drowned Mnemonic',
  cr: '9',
  size: 'medium',
  creatureType: 'aberration',
  ac: 18,
  maxHp: 120,
  speed: 30,
  abilityScores: { str: 11, dex: 16, con: 16, int: 19, wis: 18, cha: 16 },
  passivePerception: 16,
  resistances: ['psychic', 'cold'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Total Recall',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It empties itself into you the way a flooded room empties into a lower one: every page it ever held, every drowned hour at the desk, every secret the Archive sank for being too much to bear — all of it true in your head at once, and no room anywhere in the press of it for so small a thought as moving.',
    },
    {
      kind: 'attack',
      name: 'Marginal Note',
      attackBonus: 10,
      damage: '2d10+6',
      damageType: 'psychic',
      reach: 5,
      description:
        'It makes the one annotation it has left to make, pressed into you like a stylus into wet clay — a single line in the margin of you, in a hand that has written it on a thousand readers before, all of whom it remembers, none of whom it mourned.',
    },
  ],
  flavorText:
    "Not a creature so much as a residue: the memory of a mind, kept after the mind was gone, the way a drowned house keeps the shape of the water that filled it. The Archive does not waste a thing that has been read — it strips the knowing from the dead and shelves it, and the older recalls, untethered too long, rise and drift and drown the living in remembered dark. To meet it is to be read by everything it ever read, all at once, until you forget which of the lives crowding your skull is the one that is yours.",
});
