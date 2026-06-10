import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cowled Houndmaster — Ch2 ELITE leader of "The Cowled Kennel-Master". The
 * taskmaster pattern in a silver collar: rather than fight you himself he keeps
 * the lane stocked with shadow-hounds (`summon`, reusing the `shadow-hound`
 * bestiary def), never more than two on the field, on a cooldown so he alternates
 * with a whip-crack of force. An attrition problem — put him down to stop the
 * kennel, or drown under a rotation of hounds that does not end.
 */
export const COWLED_HOUNDMASTER: Monster = MonsterSchema.parse({
  id: 'cowled-houndmaster',
  name: 'Cowled Houndmaster',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 15,
  maxHp: 50,
  speed: 30,
  abilityScores: { str: 11, dex: 14, con: 13, int: 15, wis: 14, cha: 13 },
  passivePerception: 13,
  actions: [
    {
      kind: 'summon',
      name: 'Loose the Pack',
      summonDefId: 'shadow-hound',
      count: 1,
      maxActive: 2,
      cooldownRounds: 2,
      description:
        'He does not look at the dark beside him. He only opens his hand, and a seam of it detaches, lands on four feet, and comes for you already running.',
    },
    {
      kind: 'attack',
      name: 'Lash of Binding',
      attackBonus: 6,
      damage: '2d6+4',
      damageType: 'force',
      reach: 10,
      description:
        'A line of grey light uncoils from his sleeve like a whip and cracks across the gap — the same leash he holds the hounds with, used the other way.',
    },
  ],
  resistances: ['necrotic'],
  flavorText:
    'The Veiled Court keeps worse things than prisoners in their kennels, and someone has to feed them. He has stopped flinching at the dark on his leash; the dark has stopped, mostly, at biting him. Everything past that is your problem.',
});
