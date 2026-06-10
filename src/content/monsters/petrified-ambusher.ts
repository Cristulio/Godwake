import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Petrified Ambusher — Chapter 13 fodder out of Szendra's Enclave. The matron
 * lined the carved drow city with her own kin turned to stone, posed mid-stride
 * along every gallery so that what looks like statuary is a held ambush. They
 * stand grey and patient until you pass too close, and then the stone sloughs
 * and the drow inside finishes the lunge it was frozen halfway through. A heavy
 * `attack` (the waking stone fist) and a `debuff` that pins you in their grip
 * (restrained — the closing stone) so the next of them takes you fixed in place.
 */
export const PETRIFIED_AMBUSHER: Monster = MonsterSchema.parse({
  id: 'petrified-ambusher',
  name: 'Petrified Ambusher',
  cr: '11',
  size: 'medium',
  creatureType: 'construct (petrified drow)',
  ac: 20,
  maxHp: 164,
  speed: 25,
  abilityScores: { str: 19, dex: 12, con: 18, int: 8, wis: 11, cha: 6 },
  passivePerception: 11,
  resistances: ['piercing', 'slashing'],
  actions: [
    {
      kind: 'attack',
      name: 'Waking Stone Fist',
      attackBonus: 13,
      damage: '2d10+7',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'The grey crust splits along the arm with a sound like a flagstone cracking, and the drow underneath drives the half-stone fist through the lunge it was frozen mid-throw — a hundred years of held momentum loosed in one blow.',
    },
    {
      kind: 'debuff',
      name: 'Closing Stone',
      condition: 'restrained',
      saveDC: 18,
      saveAbility: 'dex',
      durationRounds: 2,
      description:
        'Stone hands close around a wrist or an ankle and set hard again on the instant, locking you to the spot the way the matron locked them — caught in her gallery the same as her kin, while the next grey shape in the line begins to crack.',
    },
  ],
  flavorText:
    "Szendra lines her enclave with the dead she has not finished using. Down every carved gallery they stand mid-stride, grey and weathered, drow turned to stone and posed as statuary so that the city itself is a held ambush — and the only way to tell the ornament from the trap is to pass too close to one and feel the stone go warm. Then the crust sheds in sheets and the drow inside finishes, unhurried, the lunge it was frozen halfway through, as though no time at all has passed since the matron caught it here and told it to wait.",
});
