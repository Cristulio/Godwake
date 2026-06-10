import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drider — a drow disgraced by Arachne and remade into half-elf, half-spider.
 * Opens combat with a paralyzing web (reuses the engine-side Hold Person
 * `kind: 'paralyze'` shape per the brief — no new mechanics this PR), then
 * advances and bites.
 */
export const DRIDER: Monster = MonsterSchema.parse({
  id: 'drider',
  name: 'Drider',
  cr: '4',
  size: 'large',
  creatureType: 'monstrosity',
  ac: 16,
  maxHp: 80,
  speed: 30,
  abilityScores: { str: 16, dex: 14, con: 14, int: 13, wis: 14, cha: 9 },
  passivePerception: 14,
  actions: [
    {
      kind: 'paralyze',
      name: 'Binding Web',
      saveDC: 13,
      saveAbility: 'str',
      durationRounds: 2,
      description:
        "The drider strikes the air above you with its forelegs and a sheet of grey silk unspools and tightens. Where it lands across the shoulders, the arms forget what they are for.",
    },
    {
      kind: 'attack',
      name: 'Fang and Sickle',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'piercing',
      reach: 5,
      description:
        "The thing that used to be a drow priestess closes the distance on eight legs and bites with the mouth of a drow. The fangs go in where the silk has bound the joint.",
    },
  ],
  resistances: ['poison'],
  flavorText:
    "Arachne disgraces her failed initiates by remaking them from the waist down — a black spider's body fused to a drow torso, still wearing the priestess's tabard. They live in the rafters of Zhal Vasha and are not invited to the temple any more.",
});
