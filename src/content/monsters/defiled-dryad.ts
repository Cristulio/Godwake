import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Defiled Dryad — Chapter 10 early-mid. A woodland spirit of the Tree of Life,
 * sickened as the Tree is sickened. Where a dryad's charm once drew the weary
 * to rest in safe shade, the defiling has soured it: the same reaching warmth
 * now lands as dread. Leads with `debuff` (frightened — the charm gone wrong),
 * then a bramble lash. The grief of the city made into a snare.
 */
export const DEFILED_DRYAD: Monster = MonsterSchema.parse({
  id: 'defiled-dryad',
  name: 'Defiled Dryad',
  cr: '10',
  size: 'medium',
  creatureType: 'fey',
  ac: 17,
  maxHp: 136,
  speed: 30,
  abilityScores: { str: 13, dex: 17, con: 16, int: 14, wis: 18, cha: 19 },
  passivePerception: 15,
  resistances: ['poison'],
  actions: [
    {
      kind: 'debuff',
      name: 'Soured Charm',
      condition: 'frightened',
      saveDC: 17,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It opens its arms the way it once opened them to lead lost travellers into safe shade, and the old warmth still reaches for you — but the Tree that gave it warmth is poisoned now, and what arrives is the rot under the welcome, an invitation to lie down in the sick dark and never rise, and your skin crawls back from it before your mind can name why.',
    },
    {
      kind: 'attack',
      name: 'Bramble Lash',
      attackBonus: 11,
      damage: '2d8+6',
      damageType: 'slashing',
      reach: 10,
      description:
        'The bark of its arms splits into a whip of blackened thorn and lashes out the full reach of the glade-shade, and the thorns are wet with something that was sap before the Tree began to die.',
    },
  ],
  flavorText:
    "The dryads of Suldanessellar were the Tree of Life made gentle and walking — its grief and its welcome given a face, set to lead the lost to rest. When Irenicus put his hand to the Tree's roots the dryads sickened with it, and the welcome curdled into the same long, reaching sweetness that a thing about to drown shows the one it pulls under. It still wants you to come to it. It still opens its arms. That is the worst of it.",
});
