import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Karmic Echo — Ch6 mid controller. The accumulated weight of every life the
 * soul has ever lived, risen up at once to press it back down. Opens combat by
 * stilling the player under the sheer mass of its own past (`paralyze` → Weight
 * of Lives, DC 17, the round-1 opener the engine reserves for it), then strikes
 * with recursion — the same blow it has landed a thousand turnings running.
 */
export const KARMIC_ECHO: Monster = MonsterSchema.parse({
  id: 'karmic-echo',
  name: 'Karmic Echo',
  cr: '8',
  size: 'medium',
  creatureType: 'aberration',
  ac: 17,
  maxHp: 108,
  speed: 30,
  abilityScores: { str: 11, dex: 16, con: 15, int: 17, wis: 18, cha: 15 },
  passivePerception: 16,
  resistances: ['psychic'],
  actions: [
    {
      kind: 'paralyze',
      name: 'Weight of Lives',
      saveDC: 17,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'Every life you have ever spent arrives in your head at the same instant — each death, each grave, each turning of the wheel, all of it true at once. There is no room left over for the body to move.',
    },
    {
      kind: 'attack',
      name: 'Recursion',
      attackBonus: 9,
      damage: '2d10+5',
      damageType: 'psychic',
      reach: 5,
      description:
        'It lands the blow it has landed on you before — in a hundred prior lives, by a hundred prior hands — and the strike arrives carrying all the times it has already killed you.',
    },
  ],
  flavorText:
    "Not a creature so much as a standing wave: the sum of a single soul's whole ledger, every life it lived and lost, folded over on itself until it casts a shadow. The Loom does not so much send it as let it happen — the karmic weight of a soul that refuses to lie still, turned back against the one carrying it. It is, in the most literal sense, your own past trying to keep you.",
});
