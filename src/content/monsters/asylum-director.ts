import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Asylum Director — Glassreach's boss. Opens with Hold Person, then carves
 * at the player with a glaive while he still keeps up the surgeon's pretense.
 *
 * Hold Person DC dropped 15 → 13 in the boss-wall tuning pass: at the L5-7
 * power band even a WIS-12 (+1) wizard failed the DC 15 save ~70% of the time,
 * and once paralyzed the glaive autocrits. DC 13 keeps the threat real (+1 WIS
 * still fails 55%) but the lockdown is no longer near-certain.
 *
 * boss-framework content (layered on; the old `battle-rage` flag is replaced by
 * a richer half-HP PHASE). Bloodied, the Director sets the glaive aside and
 * begins the real work — a psychic vivisection:
 *  - "Sever Resolve" carves at the will, leaving the player `weakened` (their
 *    blows fall softer) — picked whenever the debuff is not already up.
 *  - "Psychic Lobotomy" is a telegraphed psychic burst (the AoE pressure of a
 *    mind being opened) the player gets one full turn to read and answer.
 *  - The phase enrages (+3 damage) and flips the transform hook. Magnitudes are
 *    deliberately conservative pending the sim pass.
 */
export const ASYLUM_DIRECTOR: Monster = MonsterSchema.parse({
  id: 'asylum-director',
  name: 'The Asylum Director',
  cr: '5',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 15,
  maxHp: 78,
  speed: 30,
  abilityScores: { str: 14, dex: 14, con: 14, int: 18, wis: 16, cha: 14 },
  passivePerception: 13,
  actions: [
    {
      kind: 'paralyze',
      name: 'Hold Person',
      saveDC: 13,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        "The Director closes the fingers of one hand into a fist as if crushing something small. The air around you tightens to glass. \"You will be still while I work.\"",
    },
    {
      kind: 'attack',
      name: "Director's Glaive",
      attackBonus: 8,
      damage: '2d8+4',
      damageType: 'slashing',
      reach: 10,
      description:
        "He moves with the practiced economy of a man who has cut subjects open for thirty years. The blade comes in low, level, and from a distance you cannot quite close.",
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Lobotomy',
      enterText:
        "The Director sets the glaive aside. \"The body was only ever the anteroom.\" Something behind his monocle opens, and a pressure finds the inside of your skull.",
      replaceActions: true,
      addActions: [
        {
          kind: 'debuff',
          name: 'Sever Resolve',
          condition: 'weakened',
          saveDC: 13,
          saveAbility: 'wis',
          durationRounds: 2,
          amount: 3,
          description:
            'He reaches past your eyes and finds the thing that decides to fight. With a surgeon\'s patience he severs a little of it, and your arms go heavy, your blows uncertain.',
        },
        {
          kind: 'attack',
          name: 'Psychic Lobotomy',
          attackBonus: 8,
          damage: '4d8',
          damageType: 'psychic',
          telegraph: {
            chargeText:
              'The Director spreads both hands toward your skull, the air between them folding inward — the whole room leans toward the point he is about to open in your mind.',
          },
          description:
            'The pressure resolves all at once, a clean psychic incision opening everything behind your eyes to the cold of the asylum.',
        },
      ],
      bonusDamage: 3,
      transform: true,
    },
  ],
  resistances: ['psychic'],
  flavorText:
    "Glassreach's warden, in office longer than any of the Veiled Court above him remember authorising. Tall, thin, robe trimmed in the asylum's silver and grey, the eye behind his monocle a colour you do not have a word for. He has been waiting. He has been very patient. Wound him past the half and he sets the glaive down and gets to the part he actually came for.",
});
