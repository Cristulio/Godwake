import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Throne Abishai — Chapter 14 warmup, a fiendish warden of the dead god's seat.
 * The abishai came up out of the Nine Hells to keep the Throne against all
 * claimants while it stood empty, and they keep it still, not caring which power
 * means to fill it. A `debuff` (frightened) opener — the pit-dread that rolls off
 * a devil that has never once doubted it will outlive you — then the barbed
 * scourge from reach while you cannot hold its gaze.
 */
export const THRONE_ABISHAI: Monster = MonsterSchema.parse({
  id: 'throne-abishai',
  name: 'Throne Abishai',
  cr: '12',
  size: 'medium',
  creatureType: 'fiend (devil)',
  ac: 20,
  maxHp: 190,
  speed: 40,
  abilityScores: { str: 18, dex: 15, con: 18, int: 12, wis: 14, cha: 16 },
  passivePerception: 14,
  resistances: ['fire', 'cold', 'poison'],
  actions: [
    {
      kind: 'debuff',
      name: 'Dread of the Pit',
      condition: 'frightened',
      saveDC: 19,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It spreads its wings without urgency and lets you feel, all at once, the long arithmetic behind its patience — the centuries it has stood this door, the claimants it has folded into the floor, the certainty cold as a ledger that you are only the next entry. Something in you that wanted to be brave sits down.',
    },
    {
      kind: 'attack',
      name: 'Barbed Scourge',
      attackBonus: 13,
      damage: '2d10+8',
      damageType: 'slashing',
      reach: 10,
      description:
        'The scourge is a fistful of hooked chain that has dressed a thousand trespassers off this threshold. It does not lash so much as cast and draw, the barbs setting in your guard and tearing free with a portion of it, the devil already measuring where the next throw lands.',
    },
  ],
  flavorText:
    "When the God of Murder died and his Throne stood empty, the powers of the lower planes did what powers do with a vacant seat of office: they posted a guard, in case the chair meant something they had not finished understanding. The abishai have kept the watch ever since, and the long boredom of it has worn all the malice down to procedure. It does not hate you. It simply will not let you past, the way it did not let the last one past, or the thousand before — a clerk of the pit, stamping each soul that climbs to the Throne with the same hooked seal: denied.",
});
