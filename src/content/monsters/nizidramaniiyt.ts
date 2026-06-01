import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Nizidramanii'yt — Chapter 10 boss, the green dragon coiled in the desecrated
 * temple of Rillifane, the great set-piece guarding the last stair to the Tree
 * of Life. The captor loosed it in the holy place to keep the way while he works
 * at the roots. Kit: a `multiattack` of rending coils and reach bite (the bite
 * is the repeated swing), and a green-dragon `debuff` breath that leaves the
 * lungs poisoned. `battle-rage` at half HP — a wounded dragon is the worst kind.
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
  bossMechanic: 'battle-rage',
  actions: [
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
    {
      kind: 'debuff',
      name: 'Breath of the Defiled Grove',
      condition: 'poisoned',
      saveDC: 19,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It rears off the altar and breathes, and the temple of the tree-father fills with a rolling green fog that smells of every dead and stagnant thing the forest ever swallowed — it gets into your eyes and your throat and the bottom of your lungs, and the world goes swimming and sick and your every blow comes slow through the haze of it.',
    },
  ],
  flavorText:
    "The captor did not trust the broken city's own defenders to hold the last stair, so he loosed a dragon in the temple of Rillifane Rallathil — Nizidramanii'yt, a green wyrm old enough to remember the planting of the lesser groves, coiled now across the smashed altar of the tree-father in a sprawl of green-gold scale and possessive contempt. The holy place reeks of it: swamp-rot and crushed gold, the incense of three hundred years gone under a reptile musk. It opens one slitted eye the colour of stagnant water as you come, and does not bother to rise, because nothing has yet climbed this stair that was worth the standing up for, and it does not expect you to be the first.",
});
