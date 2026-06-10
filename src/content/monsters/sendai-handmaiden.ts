import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Szendra's Handmaiden — Chapter 13 early-mid, drow supporting cast out of the
 * enclave. A war-priestess of Arachne sworn to the Slainkin matron, she keeps
 * the galleries the petrified ambushers cannot: poison on the scourge, a roll of
 * conjured darkness to blind the intruder, and the Spider Queen's favour to mend
 * whatever you have already broken. A poison `attack`, a `debuff` (blinded), and
 * a `sustain` that wards a faltering ally.
 */
export const SENDAI_HANDMAIDEN: Monster = MonsterSchema.parse({
  id: 'sendai-handmaiden',
  name: "Szendra's Handmaiden",
  cr: '12',
  size: 'medium',
  creatureType: 'humanoid (drow)',
  ac: 20,
  maxHp: 172,
  speed: 30,
  abilityScores: { str: 12, dex: 16, con: 14, int: 13, wis: 17, cha: 15 },
  passivePerception: 16,
  resistances: ['poison'],
  actions: [
    {
      kind: 'attack',
      name: 'Venom-Scourge',
      attackBonus: 12,
      damage: '2d8+6',
      damageType: 'poison',
      reach: 5,
      description:
        'A scourge of writhing snake-heads, each fanged mouth wet with the drow soporific — every lash both a wound and a dose, the venom doing in the blood what the leather could not.',
    },
    {
      kind: 'debuff',
      name: 'Cloud of Darkness',
      condition: 'blinded',
      saveDC: 18,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'She speaks the Spider Queen\'s word and the air goes to a darkness no torch will answer — a blackness the drow see through and you do not, so that the next stroke comes out of nothing.',
    },
    {
      kind: 'sustain',
      name: "Spider Queen's Favour",
      target: 'ally',
      heal: '3d8+6',
      cooldownRounds: 2,
      description:
        'She lays a hand on a faltering sister and calls down Arachne\'s cold mercy, knitting the wound shut with web-grey light — the enclave does not let its own fall while a handmaiden still stands to pray.',
    },
  ],
  flavorText:
    "Szendra keeps her enclave the way Arachne keeps her web: by the devotion of priestesses who have bound their whole hope of favour to the matron's rise. The handmaidens are the surviving faithful of that bargain, war-priestesses who tend the galleries the stone ambushers cannot — dousing the lights, dosing the scourges, calling the Spider Queen's favour down on whatever the intruder has not quite finished killing. They do not fear you. They have wagered their souls on a Slainkin becoming a god, and next to that a swordarm in the dark is a small thing.",
});
