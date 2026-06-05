import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Imp Needler — Ch1 ELITE puppet-master of "The Imp's Court". The hobgoblin it
 * has bribed into bodyguard does the dying; the imp does the poisoning. Leads
 * with a `debuff` (poisoned — the player attacks at disadvantage while the venom
 * works) on a soft DC 11, then plinks with hellish bolts from out of reach. The
 * classic "kill the small clever one to stop the bleed" elite: drop the imp and
 * the venom stops coming; ignore it for the bodyguard and you fight half-blind.
 */
export const IMP_NEEDLER: Monster = MonsterSchema.parse({
  id: 'imp-needler',
  name: 'Imp Needler',
  cr: '1',
  size: 'tiny',
  creatureType: 'fiend (devil)',
  ac: 13,
  maxHp: 24,
  speed: 40,
  abilityScores: { str: 6, dex: 17, con: 13, int: 11, wis: 12, cha: 14 },
  passivePerception: 11,
  actions: [
    {
      kind: 'debuff',
      name: 'Barbed Venom',
      condition: 'poisoned',
      saveDC: 11,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It flicks the needle-tip of its tail across you almost lazily, on the wing, and the cut goes hot and then cold and then everything you swing at swims a little.',
    },
    {
      kind: 'attack',
      name: 'Hellish Bolt',
      attackBonus: 5,
      damage: '1d6+3',
      damageType: 'fire',
      range: [40, 120],
      description:
        'A bead of sulphur-fire spat from above, where it perches just out of a swordarm\'s reach and grins.',
    },
  ],
  resistances: ['cold'],
  immunities: ['poison'],
  flavorText:
    'A hand-span of red malice with a barb on its tail and an eye for who is actually in charge — which, in its considered opinion, is itself. The hobgoblin is on a wage. The imp is on a whim.',
});
