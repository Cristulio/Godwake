import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drow Matron Mother — Ust Natha's boss. A spider-priestess of Lolth at the
 * head of one of Ust Natha's eight Houses.
 *
 * Boss-framework kit (layered on the original paralyze opener + venom dagger):
 *   - Round 1: `paralyze` temple-prayer (the held opener, WIS DC 16).
 *   - Then a `summon` — Lolth lends her a spider-child handmaiden (reuses the
 *     chapter's `driderling`), and a `gate` warding the Matron while it lives:
 *     she takes only a quarter of incoming damage until the handmaiden is cut
 *     down. The first foreshadowing of Sendai's statue-gate, three chapters on.
 *   - A `debuff` — her cured venom hangs on the air as a web of poison (player
 *     attacks at disadvantage, CON DC 14).
 *   - At half HP a `phase`: Lolth turns Her regard on the duel and the Matron's
 *     strikes come blessed (+2 damage). This folds in the old `battle-rage` the
 *     boss used to carry, expressed through the new phase system at equal weight.
 */
export const DROW_MATRON_MOTHER: Monster = MonsterSchema.parse({
  id: 'drow-matron-mother',
  name: 'Matron Mother',
  cr: '6',
  size: 'medium',
  creatureType: 'humanoid (elf)',
  ac: 17,
  maxHp: 96,
  speed: 30,
  abilityScores: { str: 11, dex: 16, con: 14, int: 15, wis: 18, cha: 18 },
  passivePerception: 14,
  actions: [
    {
      kind: 'paralyze',
      name: "Lolth's Stilling",
      saveDC: 16,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        "The Matron Mother lifts the obsidian holy-symbol at her throat and the eight-legged sigil cuts a shadow that should not exist in this light. \"Be still, surface-thing. The Spider Queen would look at you.\"",
    },
    {
      kind: 'summon',
      name: 'Handmaiden of the Pit',
      summonDefId: 'driderling',
      once: true,
      description:
        "She sets two fingers to the obsidian sigil and speaks a name in the old tongue, and the floor's own shadow gathers itself up on too many legs. Lolth does not love Her priestesses. But She lends them Her children when a surface-thing has climbed too far — a handmaiden to stand between the Matron and the blade, so that the blade never reaches the Matron at all.",
    },
    {
      kind: 'debuff',
      name: 'Venom of the Pit',
      condition: 'poisoned',
      saveDC: 14,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        "She flicks the dagger's edge and the priestess-cured venom leaves it in a fine line of droplets that hang, then drift, then find you — a web of poison spun on the air itself. Your hands grow uncertain; the room will not hold still enough to be struck cleanly.",
    },
    {
      kind: 'attack',
      name: 'Venomed Ritual Dagger',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'poison',
      reach: 5,
      description:
        "The dagger is cold mithral with the Lolth-glyph chased into the flat, the edge wet with a priestess-cured drow venom. She does not draw it back between strokes — she opens you and turns the wrist on the same motion.",
    },
    {
      kind: 'attack',
      name: "Spider's Curse",
      attackBonus: 7,
      damage: '1d8',
      damageType: 'fire',
      range: [60, 120],
      description:
        "The Matron Mother lifts her free hand and traces a spider-glyph in the air. The web ignites between her fingers and falls on you in burning strands — Lolth's punishment for surface-fire stolen by a surface-thing.",
    },
  ],
  resistances: ['poison', 'psychic'],
  gate: {
    damageTakenPct: 0.25,
    whileAddAlive: 'driderling',
    wardLabel: 'cut down her handmaiden',
  },
  phases: [
    {
      atHpPctBelow: 50,
      name: "Lolth's Regard",
      enterText:
        "The Matron Mother bleeds, and goes still, and smiles — and somewhere vast and elsewhere a regard turns toward the temple. \"She is watching now,\" she breathes. \"You have made me interesting to Her.\" Her strikes come harder after that, and blessed.",
      bonusDamage: 2,
    },
  ],
  flavorText:
    "Tall, slender, robed in spider-silk dyed the same arterial red as the temple banners behind her. The obsidian holy-symbol of Lolth sits at her throat on a chain of finger-bones — surface-elven, by the proportions. Ust Natha's eight Matron Mothers rule by murder and by leaving the murders un-witnessed. This one has been Matron for sixty years. She has not been challenged twice by the same House.",
});
