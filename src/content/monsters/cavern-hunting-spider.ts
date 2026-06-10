import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cavern Hunting-Spider — Ch4 multiattacker + restrainer. Opens by spitting web
 * (`debuff`, DEX save → restrained: the player attacks at disadvantage and is
 * easier to hit), then closes with a two-bite `multiattack`. Web first, feast
 * second — the classic ambush-predator pattern, now fully mechanical.
 */
export const CAVERN_HUNTING_SPIDER: Monster = MonsterSchema.parse({
  id: 'cavern-hunting-spider',
  name: 'Cavern Hunting-Spider',
  cr: '3',
  size: 'large',
  creatureType: 'beast',
  ac: 15,
  maxHp: 64,
  speed: 40,
  abilityScores: { str: 15, dex: 16, con: 13, int: 2, wis: 11, cha: 4 },
  passivePerception: 13,
  actions: [
    {
      kind: 'debuff',
      name: 'Web Spray',
      condition: 'restrained',
      saveDC: 13,
      saveAbility: 'dex',
      durationRounds: 2,
      description:
        'A jet of grey silk catches you across the legs and sets in seconds, gluing you to the cavern floor while it circles.',
    },
    {
      kind: 'multiattack',
      name: 'Feeding Frenzy',
      attacks: 2,
      description:
        'Once you are stuck it loses all caution — both sets of fangs working you over in a blur.',
    },
    {
      kind: 'attack',
      name: 'Fangs',
      attackBonus: 8,
      damage: '2d8+4',
      damageType: 'piercing',
      reach: 5,
      description: 'Curved black fangs that punch through leather and find the meat beneath.',
    },
  ],
  flavorText:
    'Big as a war-hound and twice as patient, it hunts the faerzress-lit galleries below Zhal Vasha. The drow do not keep it; they simply walk a different corridor. It has learned that the things which come from the surface do not know which corridor to avoid.',
});
