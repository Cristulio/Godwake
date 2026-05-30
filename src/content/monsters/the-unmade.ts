import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Unmade — Chapter 6 boss, the apex of the whole delve. Beyond the false
 * god of the Godwake waits the thing the false god itself feared: the true
 * source of the cycle, the wheel of souls given a single will. The god that was
 * never born and so was never made — and so can never die, only be refused.
 *
 * Kit (the proven apex pattern, scaled past anything below it): a round-1
 * `paralyze` opener that empties the player under the weight of the unmaking,
 * then `multiattack` every round thereafter (the picker falls to multiattack
 * once the opener is spent), swinging its single heavy `attack`. `battle-rage`
 * at half HP turns the back half of the fight into a race. Highest stat block
 * in the game by design — true endgame, a clear notch above Chapter 5.
 */
export const THE_UNMADE: Monster = MonsterSchema.parse({
  id: 'the-unmade',
  name: 'The Unmade',
  cr: '10',
  size: 'large',
  creatureType: 'aberration (primordial)',
  ac: 19,
  maxHp: 184,
  speed: 30,
  abilityScores: { str: 20, dex: 16, con: 19, int: 18, wis: 20, cha: 22 },
  passivePerception: 20,
  resistances: ['force', 'psychic', 'necrotic'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'Unmaking',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It does not raise a hand. It simply withdraws its attention from the fact of you for a moment — and in that moment you feel how little holds you together, how recently you were nothing and how willing the nothing still is to have you back. The body forgets the argument for moving.',
    },
    {
      kind: 'multiattack',
      name: 'The First Turning',
      attacks: 2,
      description:
        'It turns the wheel by hand, both ways at once, and the world turns with it — two strokes of the same motion that set every soul spinning, brought to bear on the one that would stop the spinning.',
    },
    {
      kind: 'attack',
      name: 'Hand That Turns the Wheel',
      attackBonus: 11,
      damage: '2d10+7',
      damageType: 'force',
      reach: 10,
      description:
        'The hand closes on the line that holds you to the next life and pulls. Where it touches, you are briefly un-decided — neither here nor sent back, and the not-deciding costs you more than any blade.',
    },
  ],
  flavorText:
    "It has no throne, because a throne is a thing made and it was never made. Past the corpse of the false god — the one the surface called the Godwake, the one that ruled the cycle and was, all along, terrified of what set it turning — there is only the wheel, and at the still centre of the wheel, a shape that resolves into attention the longer you fail to look away. It is the axle every soul has turned upon since the first death. It is not your enemy. It is the reason there were ever enemies, and lives, and you. Break it, and the wheel stops for everyone, forever. Become it, and the wheel turns on, with your hand at the centre. There is no third road off this floor.",
});
