import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Drow Matron Mother — Ust Natha's boss. A spider-priestess of Lolth at the
 * head of one of Ust Natha's eight Houses. Opens combat with a paralyzing
 * temple-prayer (reuses the engine-side Hold Person mechanic), then carves
 * at the player with the venom-edged ritual dagger. At half HP triggers
 * battle-rage (advantage + 2 dmg, sticks for rest of combat) — the same
 * PR #11 mechanic the Magistrate and the Asylum Director both use.
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
      kind: 'attack',
      name: 'Venomed Ritual Dagger',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'poison',
      reach: 5,
      description:
        "The dagger is cold mithral with the Lolth-glyph chased into the flat, the edge wet with a priestess-cured drow venom. She does not draw it back between strokes — she opens you and turns the wrist on the same motion.",
    },
  ],
  resistances: ['poison', 'psychic'],
  bossMechanic: 'battle-rage',
  flavorText:
    "Tall, slender, robed in spider-silk dyed the same arterial red as the temple banners behind her. The obsidian holy-symbol of Lolth sits at her throat on a chain of finger-bones — surface-elven, by the proportions. Ust Natha's eight Matron Mothers rule by murder and by leaving the murders un-witnessed. This one has been Matron for sixty years. She has not been challenged twice by the same House.",
});
