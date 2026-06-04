import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Nizidramanii'yt — Chapter 10 boss, the green dragon coiled in the desecrated
 * temple of Rillifane, the great set-piece guarding the last stair to the Tree
 * of Life. The captor loosed it in the holy place to keep the way while he works
 * at the roots.
 *
 * boss-framework kit (Ch10, multi-action): it acts TWICE a turn — coiling melee
 * plus a second working — so a turn is never one simple swing. Its breath is now
 * a TELEGRAPHED special: it rears off the altar and gathers the killing fog one
 * turn (clearly flashed on the dragon + header), and the Breath of the Defiled
 * Grove lands on its next turn — a full turn to read it and race the wyrm down,
 * shrug it off, or hard-control it to choke the charge in its throat. Layered
 * with a Wing Buffet that empties your lungs (weakened) and a half-HP ENRAGE
 * PHASE (replacing the legacy `battle-rage`): wound it past half and the wyrm
 * thrashes free of the altar, its guard dropping as its blows turn vicious —
 * a wounded dragon is the worst kind.
 */
export const NIZIDRAMANIIYT: Monster = MonsterSchema.parse({
  id: 'nizidramaniiyt',
  name: "Nizidramanii'yt",
  cr: '14',
  size: 'huge',
  creatureType: 'dragon',
  ac: 20,
  maxHp: 276,
  speed: 40,
  abilityScores: { str: 23, dex: 14, con: 21, int: 16, wis: 15, cha: 18 },
  passivePerception: 18,
  immunities: ['poison'],
  resistances: ['acid'],
  actionsPerTurn: 2,
  actions: [
    {
      kind: 'debuff',
      name: 'Breath of the Defiled Grove',
      condition: 'poisoned',
      saveDC: 19,
      saveAbility: 'con',
      durationRounds: 2,
      telegraph: {
        chargeText:
          'The great neck draws back off the altar and the throat swells with a sick green light, the temple air bending toward it — it is taking the breath. Next turn it lets the grove out of its lungs; a turn to put it down, or be somewhere the fog is not.',
      },
      description:
        'It rears off the altar and breathes, and the temple of the tree-father fills with a rolling green fog that smells of every dead and stagnant thing the forest ever swallowed — it gets into your eyes and your throat and the bottom of your lungs, and the world goes swimming and sick and your every blow comes slow through the haze of it.',
    },
    {
      kind: 'debuff',
      name: 'Wing Buffet',
      condition: 'weakened',
      amount: 4,
      saveDC: 17,
      saveAbility: 'str',
      durationRounds: 2,
      description:
        'Without rising it throws one wing — a single contemptuous beat of a sail of green-gold leather — and the whole temple of air slams into you at once, three hundred years of dust and crushed incense driven into a wall of wind that empties your lungs and folds you half over. You keep your feet, barely, but the breath is gone out of you and the next blows you throw fall with the strength of a tired man.',
    },
    {
      kind: 'multiattack',
      name: 'Rend and Coil',
      attacks: 2,
      description:
        'It does not need to move from the wrecked altar it has draped itself across — the long neck strikes and the great body turns at once, bite and crushing coil arriving from two directions on a thing too slow to be in neither place, the whole desecrated temple seeming to lean in with it.',
    },
    {
      kind: 'attack',
      name: 'Reaching Bite',
      attackBonus: 14,
      damage: '2d12+9',
      damageType: 'piercing',
      reach: 10,
      description:
        'The head comes down the full length of the temple on a neck like a falling column, and the jaws take you where you stand a clear lunge from where the dragon lay, closing with a sound like the temple doors slamming and a stink of swamp-rot blown through gold.',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'Cornered Wyrm',
      enterText:
        "Something in it changes when the wounds go deep enough — the old contempt curdles into the first real attention it has paid you. Nizidramanii'yt comes off the altar at last, scattering the wreck of Rillifane's shrine, no longer lounging but coiling and uncoiling in a fury that forgets its own guard. A wounded dragon is the worst kind, and it has only just decided you are worth killing.",
      bonusDamage: 3,
      acDelta: -1,
    },
  ],
  flavorText:
    "The captor did not trust the broken city's own defenders to hold the last stair, so he loosed a dragon in the temple of Rillifane Rallathil — Nizidramanii'yt, a green wyrm old enough to remember the planting of the lesser groves, coiled now across the smashed altar of the tree-father in a sprawl of green-gold scale and possessive contempt. The holy place reeks of it: swamp-rot and crushed gold, the incense of three hundred years gone under a reptile musk. It opens one slitted eye the colour of stagnant water as you come, and does not bother to rise, because nothing has yet climbed this stair that was worth the standing up for, and it does not expect you to be the first.",
});
