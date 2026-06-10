import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bugbear Headsman — Ch1 ELITE brute, the lone hoarder of "The Bugbear's Trove".
 * Where a roadside bugbear just swings, the headsman is a half-HP PHASE spike:
 * above bloodied he trades plain maul blows; once you cut him to half he goes
 * blood-mad, drops his guard, and winds up a single telegraphed Overhead Crush
 * the player gets one full turn to read — race the HP, brace, or hard-control him
 * to collapse the charge. It echoes the chapter's telegraph lesson on an elite
 * before Karzok teaches it for real, and stays under the boss: no enrage damage
 * bonus, only the dropped guard. Conservative magnitudes pending the sim pass.
 */
export const BUGBEAR_HEADSMAN: Monster = MonsterSchema.parse({
  id: 'bugbear-headsman',
  name: 'Bugbear Headsman',
  cr: '2',
  size: 'medium',
  creatureType: 'humanoid (goblinoid)',
  ac: 14,
  maxHp: 44,
  speed: 30,
  abilityScores: { str: 17, dex: 13, con: 14, int: 8, wis: 11, cha: 9 },
  passivePerception: 10,
  actions: [
    {
      kind: 'attack',
      name: 'Spiked Maul',
      attackBonus: 6,
      damage: '2d6+4',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'A studded length of fence-rail swung two-handed, the kind of blow that breaks a shield more often than it finds a man.',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'Blood-Mad',
      enterText:
        'The headsman touches the wound, looks at the red on his hand, and stops being bored. He plants his feet, lets the maul drag, and begins to haul it up overhead.',
      replaceActions: true,
      addActions: [
        {
          kind: 'attack',
          name: 'Overhead Crush',
          attackBonus: 6,
          damage: '2d8+3',
          damageType: 'bludgeoning',
          reach: 5,
          telegraph: {
            chargeText:
              'The maul goes up over his head, both fists white on the haft, every slab of him winding behind it — the next swing comes down with all of him behind it.',
          },
          description:
            'The whole weight of the brute drops through the maul-head in a single overhand arc, guard and collarbone giving at once.',
        },
      ],
      acDelta: -2,
    },
  ],
  flavorText:
    'The trove is his, and the trove is mostly other men\'s teeth. He has done this work long enough to be bored by it — right up until you make him bleed, and then there is a brief, total honesty to him that the maul makes worse.',
});
