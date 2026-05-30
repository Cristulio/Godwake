import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Fate-Spinner — Ch6 early-mid controller. A hand of the Loom that weaves the
 * thread binding a soul back to the wheel. Opens by snaring the player in
 * fate-thread (`debuff` → restrained, DC 16; the picker re-spins it whenever it
 * lapses, so it locks you down on a roughly two-round cadence) then flays from
 * reach with a lash of the same thread. Cut the spinner or fight the whole
 * chapter at disadvantage.
 */
export const FATE_SPINNER: Monster = MonsterSchema.parse({
  id: 'fate-spinner',
  name: 'Fate-Spinner',
  cr: '7',
  size: 'medium',
  creatureType: 'aberration',
  ac: 17,
  maxHp: 98,
  speed: 30,
  abilityScores: { str: 12, dex: 17, con: 14, int: 16, wis: 16, cha: 14 },
  passivePerception: 15,
  resistances: ['force', 'psychic'],
  actions: [
    {
      kind: 'debuff',
      name: 'Binding Skein',
      condition: 'restrained',
      saveDC: 16,
      saveAbility: 'dex',
      durationRounds: 2,
      description:
        'It draws a length of your own thread out of the air — the bright line that runs from this life to the next — and winds it round your arms. The wheel wants you fixed in place while it decides what you will be.',
    },
    {
      kind: 'attack',
      name: 'Thread-Lash',
      attackBonus: 9,
      damage: '2d8+5',
      damageType: 'force',
      reach: 10,
      description:
        'A single strand of fate, drawn taut and struck across you like a wire. It cuts not the flesh but the line the flesh hangs on.',
    },
  ],
  flavorText:
    "Many-handed and patient, it sits at the edge of the Loom where the threads come in, sorting lives the way a fisherwoman sorts net. It has spun your thread before — every time you died, it was here that you were measured and sent back. It does not understand why you are walking the wrong way up the line, only that the weave must be kept, and you are a dropped stitch.",
});
