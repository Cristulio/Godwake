import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Hollow Pretender — Chapter 9 boss, the usurper on the empty throne. It
 * wears the mask of every ruler this Court ever had, one over the next, and
 * there has never been a face beneath the last of them — only the readiness to
 * wear another. It took the throne by being whatever the room needed to believe,
 * and it rules a hall of no one by the same lie, forever.
 *
 * boss-framework kit (the first ENDGAME boss — it acts TWICE a turn): layered on
 * the apex pattern (paralyze opener, multiattack, battle-rage past half) it now
 * fights as the Court itself. It calls your own reflections out of the cracked
 * glass to attend it (a `summon` of Mirror-Doubles), and while its false court
 * stands the true Pretender is just one more face in the crowd — a condition
 * `gate` that drops it to two-fifths of incoming damage until you cut the decoys
 * down. Periodically it works the full `Unmasking` — a telegraphed `frightened`
 * that winds up one ceremonious turn before the whole Court's nothing is shown at
 * once. And at half HP the lie redoubles (an enrage `phase`): crack the mask
 * expecting the kill, find no face under it, and watch it don a fresh rank of
 * faces — the wards you broke closing over again, the Court lying even in how it
 * dies. Two actions a turn means it can raise the court AND strike, or wind up
 * the Unmasking AND close.
 */
export const THE_HOLLOW_PRETENDER: Monster = MonsterSchema.parse({
  id: 'the-hollow-pretender',
  name: 'The Hollow Pretender',
  cr: '13',
  size: 'medium',
  creatureType: 'undead (usurper)',
  ac: 21,
  maxHp: 240,
  speed: 30,
  abilityScores: { str: 18, dex: 20, con: 19, int: 17, wis: 16, cha: 22 },
  passivePerception: 16,
  resistances: ['psychic', 'force', 'necrotic'],
  bossMechanic: 'battle-rage',
  actionsPerTurn: 2,
  gate: {
    whileAddAlive: 'mirror-double',
    damageTakenPct: 0.4,
    wardLabel: 'cut down the false faces',
  },
  actions: [
    {
      kind: 'paralyze',
      name: 'The Face Beneath',
      saveDC: 20,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It raises a gloved hand to the edge of the mask, courteous, almost shy, and lifts it — and there is nothing there. Not a wound, not a skull: a held, perfect absence, the shape of a face with no face in it, and looking into the nothing your body stops, the way a thing stops at the lip of a height, certain that to move is to fall in.',
    },
    {
      kind: 'summon',
      name: 'The Court Attends',
      summonDefId: 'mirror-double',
      count: 1,
      maxActive: 1,
      once: true,
      description:
        'It gestures, courteous, to the cracked glass of the hall, and the Court\'s faces step out of the mirrors to attend it — your own shape among them, wearing your stance, because the Court has already taken your measure and found it useful. While its court stands, the Pretender is only one more masked thing in a crowd, and you cannot find the true one to strike.',
    },
    {
      kind: 'debuff',
      name: 'The Unmasking',
      condition: 'frightened',
      saveDC: 17,
      saveAbility: 'wis',
      durationRounds: 2,
      telegraph: {
        chargeText:
          'It raises both gloved hands to the edges of the mask, slow, ceremonious, and begins to lift — not the quick flash of the opening but the full Unmasking, peeling the borrowed faces away one after another toward the nothing that wears them all.',
      },
      description:
        'The last mask comes away and there is the absence entire — not a face\'s worth of nothing but the whole Court\'s, every ruler it ever wore subtracted at once — and to stand in front of that much nothing is to feel yourself begin, quietly, to be subtracted too.',
    },
    {
      kind: 'multiattack',
      name: 'A Hundred Borrowed Hands',
      attacks: 2,
      description:
        'It fights with everyone it has ever been — the duellist, the assassin-courtier, the king who learned the blade for show — each stroke in a different dead hand\'s style, so there is no rhythm to read because there is no one fighting you, only a sequence of borrowings.',
    },
    {
      kind: 'attack',
      name: 'Sceptre of a Hundred Reigns',
      attackBonus: 13,
      damage: '2d12+8',
      damageType: 'psychic',
      reach: 10,
      description:
        'The sceptre is a rod of fused regalia, every ruler\'s crown and rod and seal-ring melted into one length of cold gold. Where it touches you it does not break the skin so much as press a verdict through it — you are not of this court, and the court does not keep what is not of it.',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Nothing Redoubles',
      enterText:
        'You crack the mask expecting the kill and there is no face under it to kill — only more readiness to wear another. The Pretender does not falter. It dons fresh faces, the Court lying even in how it dies, and the wards you broke begin to close over again.',
      transform: true,
      addActions: [
        {
          kind: 'summon',
          name: 'Don Fresh Faces',
          summonDefId: 'mirror-double',
          count: 1,
          maxActive: 1,
          once: true,
          telegraph: {
            chargeText:
              'It sweeps a gloved hand across the broken mirrors and the whole dead court rises to its face at once — a fresh rank of your reflections stepping out of the glass to stand between you and the nothing on the throne.',
          },
          description:
            'A new court attends, your own face foremost among them, and the wards close. Cut the false faces down again, or never reach the throne.',
        },
      ],
    },
  ],
  flavorText:
    "There is a throne in the last hall and it is empty, and the thing that rules from it has never once sat down — a slender, courtly shape in layered finery, masked, that bows to you as you enter with the exact warmth of a host who has been expecting you a long time. It wears the face of the Court's first king, and beneath that the face of the second, and beneath that every face that ever held this hall, all the way down to nothing, because it took the throne not by blood but by being, perfectly, whatever each room needed to crown. It is the captor's oldest trick worn as a creature: rule by becoming the thing they wish were true. \"Welcome back,\" it says, in a voice you almost trust. \"You have worn so many faces climbing down to me. Surely you can spare the last one. Take off yours — I will keep it safe — and there will be a place for you here, where no one ever has to be anyone at all.\"",
});
