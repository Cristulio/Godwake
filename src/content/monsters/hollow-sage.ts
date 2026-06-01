import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Hollow Sage — a Spellhold mage whose mind has been emptied out and left
 * with only the paralyzing gaze still wired. Reuses the engine-side Hold
 * Person mechanic from PR #9 (kind: 'paralyze') so the player can be locked
 * down by something that isn't a boss.
 */
export const HOLLOW_SAGE: Monster = MonsterSchema.parse({
  id: 'hollow-sage',
  name: 'Hollow Sage',
  cr: '3',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 14,
  maxHp: 56,
  speed: 30,
  abilityScores: { str: 9, dex: 13, con: 12, int: 14, wis: 16, cha: 8 },
  passivePerception: 13,
  actions: [
    {
      kind: 'paralyze',
      name: 'Hollow Gaze',
      saveDC: 13,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        "The Sage turns his face towards you and the eyes are not there. Where they should be, the air is bright and very still. Your body forgets how to move.",
    },
    {
      kind: 'attack',
      name: 'Withering Touch',
      attackBonus: 6,
      damage: '2d6+3',
      damageType: 'necrotic',
      reach: 5,
      description:
        "He lays one open palm against your shoulder. Where the skin meets, your breath leaves you and does not come back at the same temperature.",
    },
  ],
  resistances: ['psychic', 'necrotic'],
  flavorText:
    "Once a Cowled scholar. The mind is gone — scoured out by an experiment the warden no longer remembers commissioning — but the spells that were riveted into the bone still fire when someone walks within range.",
});
