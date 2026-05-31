import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Brine-Archivist — Ch7 early-mid/mid support. The under-keeper of the drowned
 * stacks: it re-shelves the broken, mending and warding the Archive's other
 * servants mid-fight (`sustain`, target ally — 3d8 heal plus an 18-point ward of
 * salt-stiffened thread, cooldown 2) and, when there is nothing left to mend,
 * binds with a lash of waterlogged sinew. Pairs viciously with any Ch7
 * front-liner; drop the archivist first or the line is re-shelved faster than
 * you can pull it down.
 */
export const BRINE_ARCHIVIST: Monster = MonsterSchema.parse({
  id: 'brine-archivist',
  name: 'Brine-Archivist',
  cr: '8',
  size: 'medium',
  creatureType: 'undead',
  ac: 18,
  maxHp: 104,
  speed: 30,
  abilityScores: { str: 13, dex: 14, con: 16, int: 15, wis: 18, cha: 13 },
  passivePerception: 15,
  resistances: ['cold', 'necrotic'],
  actions: [
    {
      kind: 'sustain',
      name: 'Re-Shelve the Broken',
      target: 'ally',
      heal: '3d8',
      wardTempHp: 18,
      cooldownRounds: 2,
      description:
        'It gathers a faltering servant the way it once gathered a fallen volume — patient, two-handed, unhurried — and works the brine back into the breaks until the wound stiffens shut with salt and the thing stands straight again, sealed in a rime of hardened thread.',
    },
    {
      kind: 'attack',
      name: 'Catalogue-Chain',
      attackBonus: 9,
      damage: '2d6+5',
      damageType: 'cold',
      reach: 10,
      description:
        'It swings the length of waterlogged chain it once used to bind the dangerous books to their shelves. The cold of forty fathoms is wound into every link, and it strikes the way a thing strikes that has all the patience of the drowned.',
    },
  ],
  flavorText:
    "It kept the lowest stacks, where the books too dangerous to read were chained and sunk and left to the dark, and it kept them through the drowning and after, because keeping is the only verb it has left. To the archivist nothing is ever lost — only mis-shelved, only waiting to be put back. It will mend its drowned kin all day and never once wonder why they keep breaking, because a thing that is being read is, after all, only being used.",
});
