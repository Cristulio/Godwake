import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Gallows Wight — Ch1 ELITE leader of "The Hangman's Pit". The pauper that got
 * up wearing the other pauper, and kept the noose. Demonstrates `paralyze` as an
 * elite opener: round one it gets a cold grip on you (Grave-Grip, DC 14) and
 * holds you still while the lesser skeleton beside it works — then it strangles.
 * The paralyze fires round-1 only (engine rule), so the DC sits a notch high to
 * compensate for the single attempt — it was a near-dead 3%-land at the old DC 12.
 * Hard-control or a made save is the whole game; freeze in its grip with a second
 * blade on you and the pit earns its name.
 */
export const GALLOWS_WIGHT: Monster = MonsterSchema.parse({
  id: 'gallows-wight',
  name: 'Gallows Wight',
  cr: '2',
  size: 'medium',
  creatureType: 'undead',
  ac: 13,
  maxHp: 44,
  speed: 30,
  abilityScores: { str: 15, dex: 12, con: 14, int: 9, wis: 12, cha: 11 },
  passivePerception: 11,
  actions: [
    {
      kind: 'paralyze',
      name: 'Grave-Grip',
      saveDC: 14,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It closes a fistful of cold around your wrist and the cold climbs — into the forearm, the shoulder, the lungs — and for a long moment your body forgets it is allowed to move.',
    },
    {
      kind: 'attack',
      name: 'Strangling Chain',
      attackBonus: 5,
      damage: '1d10+4',
      damageType: 'necrotic',
      reach: 5,
      description:
        'It swings the loop of rusted hanging-chain it was buried in, and where the links land they leave a black bruise that does not warm back up.',
    },
  ],
  resistances: ['necrotic'],
  immunities: ['poison'],
  flavorText:
    'Two were dropped in this hole on the same bad day and only enough hate climbed out for one of them. It wears the better-preserved face over its own and keeps the rope, on the not-unreasonable theory that what worked once will work again.',
});
