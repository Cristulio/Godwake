import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Veilsworn Courtier — Chapter 9 early-mid controller. A senior masked shade
 * that still keeps the etiquette of accusation: it turns its mask to you and the
 * face it wears is one you failed, one you betrayed, one that condemned you, and
 * the recognition roots you (`debuff` → frightened, DC 18; the picker re-levels
 * it whenever it lapses, so you fight most of the encounter flinching). Then it
 * runs you through with a thin court-rapier while you cannot bear to look.
 */
export const VEILSWORN_COURTIER: Monster = MonsterSchema.parse({
  id: 'veilsworn-courtier',
  name: 'Veilsworn Courtier',
  cr: '9',
  size: 'medium',
  creatureType: 'undead',
  ac: 18,
  maxHp: 118,
  speed: 30,
  abilityScores: { str: 14, dex: 18, con: 16, int: 15, wis: 16, cha: 19 },
  passivePerception: 14,
  resistances: ['psychic', 'poison'],
  actions: [
    {
      kind: 'debuff',
      name: 'The Face You Wronged',
      condition: 'frightened',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It inclines the mask toward you with perfect manners, and the painted face is suddenly, exactly, the face of someone you left behind — and your whole body remembers being ashamed before your mind can name them, and will not let you meet the eyes it does not have.',
    },
    {
      kind: 'attack',
      name: 'Court-Rapier',
      attackBonus: 9,
      damage: '2d8+6',
      damageType: 'piercing',
      reach: 5,
      description:
        'A duelling-blade thin as a rumour slides out from a sleeve of mourning-silk. It is held the way a thing is held by someone who has killed politely a great many times, and finds your guard exactly where your flinching left it open.',
    },
  ],
  flavorText:
    "The high masks of the Court did their murder with manners — a bow, a kind word, an accusation worn on the face like rouge — and the Veilsworn keep the form of it long after the wearers are dust. It cannot make a new face; it can only wear yours back at you, dressed as someone you have something to answer for, and let your own conscience do the binding it no longer has the will to. The rapier is only there to finish what shame begins.",
});
