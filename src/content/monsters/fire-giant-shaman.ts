import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Fire-Giant Shaman — Chapter 12 early-mid support. The flame-priests of
 * Yaga-Shura's host, who keep the army's fires lit and the city's dead walking.
 * A `summon` engine (it calls the burning dead up out of the smoke faster than
 * you can put them down), a `debuff` that `blinded`s with a fistful of cinders,
 * and a fire `attack` (a hurled coal) at range — kill it fast or fight the
 * whole burning city it keeps refilling.
 */
export const FIRE_GIANT_SHAMAN: Monster = MonsterSchema.parse({
  id: 'fire-giant-shaman',
  name: 'Fire-Giant Shaman',
  cr: '11',
  size: 'large',
  creatureType: 'giant',
  ac: 18,
  maxHp: 158,
  speed: 30,
  abilityScores: { str: 19, dex: 12, con: 18, int: 13, wis: 17, cha: 14 },
  passivePerception: 14,
  resistances: ['fire'],
  actions: [
    {
      kind: 'attack',
      name: 'Hurled Coal',
      attackBonus: 8,
      damage: '2d8+4',
      damageType: 'fire',
      range: [40, 120],
      description:
        'It scoops a fistful of live coal from the brazier it carries and throws it underhand the long way across the rubble, a slow arc of orange that bursts on you in a spray of fire and grit.',
    },
    {
      kind: 'summon',
      name: 'Stoke the Pyre',
      summonDefId: 'burning-dead',
      count: 1,
      maxActive: 2,
      cooldownRounds: 2,
      description:
        'It lifts the brazier and breathes the rite over it, and somewhere in the smoke a thing that had finally lain still remembers it is on fire and gets up again. The shaman does not raise the dead so much as refuse to let them finish dying.',
    },
    {
      kind: 'debuff',
      name: 'Fistful of Cinders',
      condition: 'blinded',
      saveDC: 16,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It flings a handful of glowing ash into your face, and the world goes to a stinging orange blur of grit and watering and afterimage — you swing at where you last knew the shape to be.',
    },
  ],
  flavorText:
    "The fire giants do not march without their shamans, and Yaga-Shura's are the worst of them — flame-priests who tend the great burning of the siege the way a lesser people tend a hearth. It is their rite that keeps the city's dead alight and walking, their breath on the coals that will not let Saradush's pyres go cold. They keep to the back of the line, where the smoke is thickest, and they are never the last thing left standing, because they never run out of things to put in front of them.",
});
