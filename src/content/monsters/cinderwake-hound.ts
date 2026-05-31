import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cinderwake Hound — Chapter 8 warmup skirmisher. A war-hound burned down to a
 * thing of living cinder that still runs the picket-lines of a battle long lost.
 * Fast (`speed` 40) and single-minded: one lunging `attack` that arrives before
 * you have set your feet. Hunts in the open ash ahead of the slower dead, the
 * way a scout-pack runs ahead of a column.
 */
export const CINDERWAKE_HOUND: Monster = MonsterSchema.parse({
  id: 'cinderwake-hound',
  name: 'Cinderwake Hound',
  cr: '7',
  size: 'medium',
  creatureType: 'elemental',
  ac: 16,
  maxHp: 80,
  speed: 40,
  abilityScores: { str: 16, dex: 18, con: 15, int: 3, wis: 12, cha: 6 },
  passivePerception: 14,
  resistances: ['fire'],
  actions: [
    {
      kind: 'attack',
      name: 'Ash-Lunge',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'fire',
      reach: 5,
      description:
        'It crosses the open ground in a streak of blown embers and is on you before the sound of it arrives — jaws of banked coal closing where your throat was a half-beat ago.',
    },
  ],
  flavorText:
    "Whatever it was bred from is long burned out of it; what runs the ashfields now is only the shape of a hunting hound drawn in live cinder, trailing sparks where its paws break the crust. It still keeps the old picket — circling the dead column's flank, driving anything living back toward the spears. It does not eat. It only herds, and burns what will not be herded.",
});
