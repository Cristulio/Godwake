import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Slayer Hound — the Cowled Wizards' kennel breed. Bigger than the slaver-
 * house shadow-hounds of Ch2 and bred lean for hunting escapees through the
 * corridors of Spellhold. Hits hard, dies fast — the design's "pack predator"
 * read comes from running it 2-to-a-room in the pools rather than from any
 * engine-side pack mechanic (no on-pack-hit hook exists in MonsterAction).
 */
export const SLAYER_HOUND: Monster = MonsterSchema.parse({
  id: 'slayer-hound',
  name: 'Slayer Hound',
  cr: '4',
  size: 'medium',
  creatureType: 'beast (magical)',
  ac: 15,
  maxHp: 54,
  speed: 50,
  abilityScores: { str: 17, dex: 15, con: 14, int: 3, wis: 12, cha: 6 },
  passivePerception: 14,
  actions: [
    {
      kind: 'attack',
      name: 'Rending Bite',
      attackBonus: 7,
      damage: '2d8+5',
      damageType: 'piercing',
      reach: 5,
      description:
        "The hound takes you behind the knee, jerks back, and re-bites with the second motion of the same lunge. Bred for this. Trained for this.",
    },
  ],
  flavorText:
    "Long in the leg, wide across the shoulder, ribs showing through close grey fur. The Cowled Wizards' kennelmasters cull any pup that doesn't bay correctly on the third command. The ones that live are very good at their job.",
});
