import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Mind Flayer Fragment — a half-formed illithid spawn lurking in the
 * tunnels above Ust Natha, drawn down from the illithid enclaves deeper
 * still. Opens with a paralyzing psychic stun (reuses Hold Person's
 * `kind: 'paralyze'` shape) and then drives a tentacle through the temple
 * with the player held.
 */
export const MIND_FLAYER_FRAGMENT: Monster = MonsterSchema.parse({
  id: 'mind-flayer-fragment',
  name: 'Mind Flayer Fragment',
  cr: '5',
  size: 'medium',
  creatureType: 'aberration',
  ac: 14,
  maxHp: 62,
  speed: 30,
  abilityScores: { str: 11, dex: 12, con: 12, int: 18, wis: 16, cha: 14 },
  passivePerception: 15,
  actions: [
    {
      kind: 'paralyze',
      name: 'Mind Blast',
      saveDC: 14,
      saveAbility: 'int',
      durationRounds: 2,
      description:
        "The thing turns the front of its face towards you and the room behind your eyes goes very bright and very quiet. You cannot remember what you were about to do. You cannot remember which limb does what.",
    },
    {
      kind: 'attack',
      name: 'Tentacle Drive',
      attackBonus: 7,
      damage: '2d8+4',
      damageType: 'psychic',
      reach: 5,
      description:
        "Four wet ropes of grey muscle find the seams in the helmet and tighten. Where they press through the temple, the world goes white at the edges and stays white longer than it should.",
    },
  ],
  resistances: ['psychic'],
  flavorText:
    "Not a full mind flayer — those nest deeper, in the colonies the drow no longer raid. This is a half-grown one that the elder-brain abandoned or sent up as a scout. The tentacles work. The mouth works. The thoughts are not yours when it is in the room.",
});
