import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Unmade — Chapter 6 boss, the apex of the lower delve. Beyond the false
 * god of the Godwake waits the thing the false god itself feared: the true
 * source of the cycle, the wheel of souls given a single will. The god that was
 * never born and so was never made — and so can never die, only be refused.
 *
 * Boss-framework kit (the "cannot die, only be refused" theme made mechanical):
 *   - Round 1: the `paralyze` Unmaking is now TELEGRAPHED — it withdraws its
 *     attention from the fact of you and winds up a full turn before the reality-
 *     erase lands, giving one round to race it or shut it down (hard control
 *     cancels the charge).
 *   - A `summon` sets an ANCHOR: a single fixed mote (reuses the `witness-mote`)
 *     that pins the never-made thing into a made world. While it lives, a `gate`
 *     wards off most incoming damage — the Unmade takes only a fifth, because it
 *     is not, quite, here to be ended. Shatter the anchor-mote to make it mortal.
 *     (The full flower of Hargan-Vor's heart-gate, five chapters early.)
 *   - `multiattack`: it turns the wheel both ways at once, two strokes a turn.
 *   - At half HP a `phase`: refused at last, it turns the wheel faster (+2 damage).
 *     This folds the old `battle-rage` into the new phase system at equal weight.
 *
 * Highest stat block of the lower delve by design — true endgame, a clear notch
 * above Chapter 5. Ch6 stays single-action; the twice-a-turn bosses begin at Ch9.
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
  actions: [
    {
      kind: 'paralyze',
      name: 'Unmaking',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      telegraph: {
        chargeText:
          'The Unmade withdraws its attention from the fact of you — slowly, deliberately, the way a hand draws back before it lets a held thing fall. For this turn you can still feel the floor under you. Next turn it intends for you to have forgotten there was one.',
        windUpRounds: 1,
      },
      description:
        'It does not raise a hand. It simply withdraws its attention from the fact of you for a moment — and in that moment you feel how little holds you together, how recently you were nothing and how willing the nothing still is to have you back. The body forgets the argument for moving.',
    },
    {
      kind: 'summon',
      name: 'Set the Anchor',
      summonDefId: 'witness-mote',
      once: true,
      description:
        'It cannot be here — a thing never made has no place in a made world — and so it makes one: a single mote of fixed attention, hung in the air at its side, the one nail that pins the wheel to the floor of the world. While the mote holds, the Unmade cannot be ended, because it is not, quite, here to end.',
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
  gate: {
    damageTakenPct: 0.2,
    whileAddAlive: 'witness-mote',
    wardLabel: 'shatter the anchor-mote',
  },
  phases: [
    {
      atHpPctBelow: 50,
      name: 'Refused',
      enterText:
        'You have hurt a thing that was never born. It regards the wound with what might, in something with a face, have been wonder. "So," it says, with the whole weight of the first silence behind the word. "You will not become me. You will refuse me." And it turns the wheel faster.',
      bonusDamage: 2,
    },
  ],
  flavorText:
    "It has no throne, because a throne is a thing made and it was never made. Past the corpse of the false god — the one the surface called the Godwake, the one that ruled the cycle and was, all along, terrified of what set it turning — there is only the wheel, and at the still centre of the wheel, a shape that resolves into attention the longer you fail to look away. It is the axle every soul has turned upon since the first death. It is not your enemy. It is the reason there were ever enemies, and lives, and you. Break it, and the wheel stops for everyone, forever. Become it, and the wheel turns on, with your hand at the centre. There is no third road off this floor.",
});
