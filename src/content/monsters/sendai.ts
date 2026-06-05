import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Sendai — Chapter 13 named elite, one of the last of the Five. A drow
 * Bhaalspawn matron who carved an enclave out of the rock and filled it with her
 * own kin turned to stone, waiting on her word. She is a strong sub-fight, not
 * the chapter boss (that is Abazigal). Her kit is the enclave made flesh: a
 * `paralyze` that catches you the way she catches her statues, a `summon` that
 * wakes the petrified ambushers around her (one at a time, cooldown 3 — trimmed
 * so the CR11 adds stop out-walling her own chapter boss), a `multiattack` with
 * the venom-mace, and `battle-rage` when the matron's pride is finally wounded.
 */
export const SENDAI: Monster = MonsterSchema.parse({
  id: 'sendai',
  name: 'Sendai',
  cr: '15',
  size: 'medium',
  creatureType: 'humanoid (drow Bhaalspawn)',
  ac: 20,
  maxHp: 238,
  speed: 30,
  abilityScores: { str: 14, dex: 18, con: 16, int: 15, wis: 18, cha: 18 },
  passivePerception: 17,
  resistances: ['poison', 'necrotic'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'As I Have Held the Rest',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'She raises a hand heavy with rings and speaks a word older than the enclave, and for a moment you understand exactly how her kin came to be standing in the galleries — the same stillness reaching up through your own legs, the same patient command to wait, and wait, and never move again.',
    },
    {
      kind: 'attack',
      name: 'Mace of the Twice-Promised',
      attackBonus: 12,
      damage: '2d8+6',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'A spiked mace given her by Lolth and sworn again to Bhaal, and it carries both promises in it — the head crushing where it lands and the drow venom seeping after, so the bruise keeps blooming long past the blow.',
    },
    {
      kind: 'multiattack',
      name: "Matron's Wrath",
      attacks: 2,
      description:
        'She fights with the cold economy of a woman who has outlived every rival but four, the mace coming in twice in the space you expect one stroke, each blow placed by two centuries of practice.',
    },
    {
      kind: 'summon',
      name: 'Wake, and Serve',
      summonDefId: 'petrified-ambusher',
      count: 1,
      maxActive: 1,
      cooldownRounds: 3,
      description:
        'She does not call for guards — she calls on the statues, and a word from her cracks the grey crust off the nearest of her stone-set kin, which steps down off its pedestal mid-lunge to finish what she points it at.',
    },
  ],
  flavorText:
    "Of the Five rival Bhaalspawn, Sendai held herself the cleverest, and her enclave is the proof and the trap of it — a drow city carved deep in the rock, every gallery lined with her own kin turned to stone and posed waiting, so that her whole stronghold is one held ambush that wakes as you near her seat. She sits at the centre of it on a throne of petrified drow, a matron who has ruled by patience where her siblings ruled by force, and she watches you come the way she has watched a hundred would-be killers come: certain that the rock will take you long before you reach her, and entirely willing to step down and finish it herself if it does not.",
});
