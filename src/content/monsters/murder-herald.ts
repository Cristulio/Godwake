import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Herald of the Slainkin — Chapter 14 early-mid summoner. One of the priest-
 * voices Maevra raised to sing the harvest along, still working its office at
 * the Throne: it does not fight so much as call, dipping a censer in the pools and
 * shaking more murder into being. A `summon` core (it skims God-Essence Motes
 * off the surface, count 1, maxActive 2, cooldown 3) backed by a censer swung at
 * reach. Silence the herald or the floor keeps standing up against you.
 */
export const MURDER_HERALD: Monster = MonsterSchema.parse({
  id: 'murder-herald',
  name: 'Herald of the Slainkin',
  cr: '13',
  size: 'medium',
  creatureType: 'fiend (cultist)',
  ac: 20,
  maxHp: 208,
  speed: 30,
  abilityScores: { str: 16, dex: 17, con: 17, int: 15, wis: 16, cha: 18 },
  passivePerception: 15,
  resistances: ['necrotic', 'psychic'],
  actions: [
    {
      kind: 'summon',
      name: 'Skim the Pools',
      summonDefId: 'bhaal-essence-mote',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'It swings a censer of black iron low over a pool and draws it up trailing, and where the smoking gobbet of essence falls from the chain it does not splash — it stands, and finds a hand, and turns the no-face it does not have toward you. The harvest, sung along one clot at a time.',
    },
    {
      kind: 'attack',
      name: "Herald's Censer",
      attackBonus: 14,
      damage: '2d10+9',
      damageType: 'necrotic',
      reach: 10,
      description:
        'When you press it too close it swings the censer itself, the heavy reliquary head trailing a wake of the dead god\'s smoke, and the smoke goes into the wound and works at you the way incense works at a long mass — patient, and meant to wear the self out of you.',
    },
  ],
  flavorText:
    "Maevra did not harvest the Children of the Slain God with her own hands alone. She raised voices for it — a choir of priests and the priest-shaped, each given an office in the long liturgy of the harvest, each still singing it here at the end because the song is the only thing they were finally made of. This is one of the lesser cantors, kept on at the Throne to do the menial verse: to keep the floor of the hall populated, to skim the pools and stand the skimmings up, to make certain that whoever climbs to the seat must wade the whole of the murder to reach it. It greets you the way a sexton greets a latecomer to a funeral that will, it is quietly certain, soon enough be yours.",
});
