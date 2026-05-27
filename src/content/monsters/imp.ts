import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Imp — a devil-spawn slipped through the wards Irenicus's apprentices laid
 * for elementals. It tortures the mephits for sport. Ranged needler with
 * poison; tuned below RAW so it isn't a one-shot terror in Ch1.
 */
export const IMP: Monster = MonsterSchema.parse({
  id: 'imp',
  name: 'Imp Tormentor',
  cr: '1',
  size: 'tiny',
  creatureType: 'fiend (devil)',
  ac: 13,
  maxHp: 10,
  speed: 20,
  abilityScores: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Sting',
      attackBonus: 5,
      damage: '1d4+3',
      damageType: 'piercing',
      reach: 5,
      description:
        'The imp flits in and stabs with a barbed tail, oily venom beading on the tip.',
    },
    {
      kind: 'attack',
      name: 'Hellish Bolt',
      attackBonus: 5,
      damage: '1d6+2',
      damageType: 'fire',
      range: [60, 120],
      description:
        'It hurls a sputtering ember of brimstone. The air smells of burnt iron after.',
    },
  ],
  resistances: ['cold'],
  immunities: ['poison'],
  flavorText:
    'A small crimson devil with a needle tail and yellow-slit eyes. It speaks the mephits\' tongue and finds their fear funny. Too thin a hide for a proper devil — flame still bites it. The master would burn it for trespass, if he ever noticed it.',
});
