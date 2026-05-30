import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Loom-Apostle — Ch6 support caster. The celebrant of the wheel: it mends and
 * wards the Loom's other servants mid-fight (`sustain`, target ally — 3d6 heal
 * plus a 16-point ward of re-woven thread, cooldown 2) and scourges with a
 * censer of pale fire when there is no one left to mend. Pairs viciously with
 * any Ch6 front-liner; drop the apostle first or the line re-weaves faster than
 * you can cut it.
 */
export const LOOM_APOSTLE: Monster = MonsterSchema.parse({
  id: 'loom-apostle',
  name: 'Loom-Apostle',
  cr: '7',
  size: 'medium',
  creatureType: 'aberration',
  ac: 17,
  maxHp: 96,
  speed: 30,
  abilityScores: { str: 12, dex: 14, con: 15, int: 14, wis: 18, cha: 16 },
  passivePerception: 14,
  resistances: ['radiant', 'necrotic'],
  actions: [
    {
      kind: 'sustain',
      name: 'Re-weave the Thread',
      target: 'ally',
      heal: '3d6',
      wardTempHp: 16,
      cooldownRounds: 2,
      description:
        'It lays a hand on a faltering servant of the wheel and draws the broken thread back through the weave. The wound does not close so much as un-happen, sealed over with a skin of bright, humming line.',
    },
    {
      kind: 'attack',
      name: 'Censer of Pale Fire',
      attackBonus: 8,
      damage: '2d6+4',
      damageType: 'radiant',
      reach: 5,
      description:
        'It swings a censer that burns with the cold white light shed at the rim of the wheel — the light a soul sees in the half-second before it is sent down again. It burns going in.',
    },
  ],
  flavorText:
    "Hooded, faceless, its hands stained to the wrist with the dye the Loom uses to mark a finished life. It tends the wheel the way a verger tends a great machine he was made to love and was never taught to question. To the apostle, your death is not an ending and never was — only a thread cut, knotted, and fed back in. It will mend its kin all day, and never once wonder why they bleed.",
});
