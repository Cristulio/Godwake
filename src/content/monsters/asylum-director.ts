import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Asylum Director — Spellhold's boss. Opens with Hold Person, then
 * carves at the player with a glaive. At half HP triggers battle-rage
 * (advantage + 2 dmg, sticks for rest of combat), reusing the PR #11
 * mechanic. Both an opening lockdown AND a back-half spike — meant to
 * feel like a Beholder-adjacent encounter inside the schema budget.
 */
export const ASYLUM_DIRECTOR: Monster = MonsterSchema.parse({
  id: 'asylum-director',
  name: 'The Asylum Director',
  cr: '5',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 16,
  maxHp: 78,
  speed: 30,
  abilityScores: { str: 14, dex: 14, con: 14, int: 18, wis: 16, cha: 14 },
  passivePerception: 13,
  actions: [
    {
      kind: 'paralyze',
      name: 'Hold Person',
      saveDC: 15,
      saveAbility: 'wis',
      durationRounds: 3,
      description:
        "The Director closes the fingers of one hand into a fist as if crushing something small. The air around you tightens to glass. \"You will be still while I work.\"",
    },
    {
      kind: 'attack',
      name: 'Director\'s Glaive',
      attackBonus: 8,
      damage: '2d10+4',
      damageType: 'slashing',
      reach: 10,
      description:
        "He moves with the practiced economy of a man who has cut subjects open for thirty years. The blade comes in low, level, and from a distance you cannot quite close.",
    },
  ],
  resistances: ['psychic'],
  bossMechanic: 'battle-rage',
  flavorText:
    "Spellhold's warden, in office longer than any of the Cowled Wizards above him remember authorising. Tall, thin, robe trimmed in the asylum's silver and grey, the eye behind his monocle a colour you do not have a word for. He has been waiting. He has been very patient.",
});
