import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Warden's Apprentice — a junior Cowled Wizard in the warden's livery. High
 * AC from layered protective wards. The "dispels temp HP on hit" line from
 * the design brief lives in flavor only — the combat engine has no on-hit
 * scrubbing hook yet, and the brief's hard constraint is to not invent new
 * monster ability schemas. Reads as a high-armor punchy mage in play.
 */
export const WARDENS_APPRENTICE: Monster = MonsterSchema.parse({
  id: 'wardens-apprentice',
  name: "Warden's Apprentice",
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 18,
  maxHp: 58,
  speed: 30,
  abilityScores: { str: 10, dex: 14, con: 13, int: 16, wis: 12, cha: 11 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Dispelling Bolt',
      attackBonus: 7,
      damage: '2d6+4',
      damageType: 'force',
      range: [60, 120],
      description:
        "A grey lance of un-magic crosses the corridor and strikes home. Wards you didn't know you were carrying come loose at the edges and dissolve.",
    },
  ],
  resistances: ['force'],
  flavorText:
    "A young Cowled Wizard in the warden's silver-trim livery, three years into the apprenticeship and already too good with the dispelling spells. The wards layered into her robe make her hard to reach. What she doesn't kill, she unmakes.",
});
