import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Void-Warden — an ascension-only ELITE (Ascension ≥ 2). The warden of the silence
 * the wheel turns through, drawn up the chain by the climbing soul; chapter-agnostic
 * by design. A controller / anchor: a `debuff` (blinded — it folds the room out from
 * under your sight), a self `sustain` that wraps it in the cold of the between-places,
 * and a reaching draining touch. Endgame band (CR 13): leave it standing and it
 * outlasts you in the dark it makes.
 */
export const VOID_WARDEN: Monster = MonsterSchema.parse({
  id: 'void-warden',
  name: 'Void-Warden',
  cr: '13',
  size: 'large',
  creatureType: 'aberration (the cycle\'s hollow)',
  ac: 18,
  maxHp: 178,
  speed: 30,
  abilityScores: { str: 17, dex: 16, con: 18, int: 16, wis: 19, cha: 14 },
  passivePerception: 16,
  resistances: ['cold', 'necrotic', 'psychic'],
  actions: [
    {
      kind: 'debuff',
      name: 'Unseeing Hush',
      condition: 'blinded',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It opens the space behind your eyes — not darkness, which is a thing, but the absence the wheel turns through between one life and the next — and for a few held breaths the hall is simply not there to be looked at, while everything in it that does not need eyes keeps coming.',
    },
    {
      kind: 'sustain',
      name: 'Draw on the Silence',
      target: 'self',
      heal: '3d8',
      wardTempHp: 24,
      cooldownRounds: 2,
      description:
        'It steps half a pace into the nothing it is warden of and comes back wearing it — the wounds you opened gone quiet and grey and somehow never to have happened, sealed under a skin of the same cold absence you will have to cut through twice now to reach it.',
    },
    {
      kind: 'attack',
      name: 'Erasing Touch',
      attackBonus: 12,
      damage: '2d10+6',
      damageType: 'psychic',
      reach: 10,
      lifeDrain: 0.25,
      description:
        'It reaches across the dark it has made and lays a hand where you used to be, and where it touches a little of you simply stops — not killed, unmade, drawn back into the between to feed the long patience of the thing that took it.',
    },
  ],
  flavorText:
    "The wheel does not turn through nothing. Between the death that ends a life and the waking that begins the next there is a silence, vast and lightless and aware, and it keeps wardens. The Void-Warden is one of them, pulled loose of its post and up the chain in the wake of a soul that has learned to climb the wheel on purpose — and it does not approve. To it the ascending dead are a leak in the proper order of endings, souls that should have stayed turned-under rising instead, again and again, refusing the dark that is owed. It does not hate you for it; the between does not hate. It only folds the light out from around you a piece at a time, and waits, with the bottomless patience of a place that has never once been in a hurry, for you to be still and grey and accounted-for like all the rest.",
});
