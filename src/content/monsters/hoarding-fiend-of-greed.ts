import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Hoarding Fiend of Greed — Chapter 11 mid bruiser, the guardian-manifestation of
 * the Trial of Greed. The pit lays out more than you can carry and asks whether you
 * will take only your due or grasp for all of it, and the grasping rises as a
 * swollen, gold-crusted fiend that has eaten every coin in the trove and means to
 * eat you too. A `sustain` core: it folds its hoard around itself as a ward
 * (wardTempHp 24 on self, cooldown 3), so it keeps standing on stolen reserves long
 * after it should be down — and grasps with a fistful of fused treasure that takes
 * back whatever it touches. Greed does not die while it still has something to clutch.
 */
export const HOARDING_FIEND_OF_GREED: Monster = MonsterSchema.parse({
  id: 'hoarding-fiend-of-greed',
  name: 'Hoarding Fiend of Greed',
  cr: '12',
  size: 'large',
  creatureType: 'fiend (sin-manifestation)',
  ac: 20,
  maxHp: 230,
  speed: 25,
  abilityScores: { str: 19, dex: 12, con: 20, int: 13, wis: 14, cha: 17 },
  passivePerception: 12,
  resistances: ['fire', 'acid', 'bludgeoning'],
  actions: [
    {
      kind: 'sustain',
      name: 'Clutch the Hoard',
      target: 'self',
      wardTempHp: 24,
      cooldownRounds: 3,
      description:
        'It drags the loose treasure of the trial in against itself with both arms, the coins and plate and fused regalia climbing its hide like a second skin, and behind that crust of everything-it-has-taken it simply refuses to be as hurt as it is.',
    },
    {
      kind: 'attack',
      name: 'Fist of Fused Treasure',
      attackBonus: 14,
      damage: '2d12+8',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'It swings a hand that is a single welded mass of everything it ever grasped — crowns, chains, the cups of the dead — and the weight of all that holding lands on you with the particular bitterness of wealth that was never once spent or enjoyed, only kept.',
    },
  ],
  flavorText:
    "The fourth of the five trials is Greed, and the pit is generous about it: it heaps the floor with more than any one soul could carry and tells you to help yourself, knowing that the helping is the trap. Take only your due and pass; grasp for all of it and stay. The fiend is the grasping made flesh — a bloated, gold-scabbed thing that took the trove's offer to its limit and kept taking until the wealth was all there was of it, and now cannot stop, because a hoard is only safe while it is growing. It will not give you a clean death and it will not take one; it clutches its stolen reserves and stands on them past all reason, the way the greedy cling to the last coin while the house burns down around the strongbox.",
});
