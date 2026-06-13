import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Veiled Magus — Ch2 ELITE caster, the senior Veiled Magus behind the audits,
 * the rooftop chase and the twin-cowl ambush. Above bloodied he trades dismissive
 * Arcane Bolts; once you cut him to half a half-HP PHASE takes him and he stops
 * being patient — winding up a single telegraphed Shatterbolt the player gets one
 * full turn to read (race the HP, mitigate, or hard-control him to collapse the
 * charge). It gives Ch2 a "race the cast" beat distinct from the conjurer (summon)
 * and wardpriest (ward), and stays under the Magistrate boss: a smaller blast, no
 * guards, only a single phase. Conservative magnitudes pending the sim pass.
 */
export const COWLED_MAGUS: Monster = MonsterSchema.parse({
  id: 'cowled-magus',
  name: 'Veiled Magus',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 15,
  maxHp: 52,
  speed: 30,
  abilityScores: { str: 9, dex: 15, con: 13, int: 17, wis: 13, cha: 12 },
  passivePerception: 12,
  actions: [
    {
      kind: 'attack',
      name: 'Arcane Bolt',
      attackBonus: 6,
      damage: '2d6+5',
      damageType: 'force',
      range: [60, 120],
      description:
        'A lance of grey-violet force loosed underhand, the gesture of someone who files you under "administrative".',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'Unbinding',
      enterText:
        'The magus presses two fingers to the wound, looks at his own blood as if it were a clerical error, and stops economising. The air around his hands begins to fold inward.',
      replaceActions: true,
      addActions: [
        {
          kind: 'attack',
          name: 'Shatterbolt',
          attackBonus: 6,
          damage: '3d6+5',
          damageType: 'force',
          range: [60, 120],
          telegraph: {
            chargeText:
              'He draws both hands apart and a knot of grey-violet force swells between them, the lane-light bending toward it — the next beat it comes apart all at once, at you.',
          },
          description:
            'The gathered force unbinds in a single flat crack of pressure that folds the air and everything standing in it.',
        },
      ],
      acDelta: -1,
    },
  ],
  resistances: ['psychic'],
  flavorText:
    'Silver collar, mirror mask, and a temper kept on a very short administrative leash. He would genuinely rather have processed you. Since you insist, he will stop being careful about it — which is the most dangerous thing a Veiled Magus can decide to do.',
});
