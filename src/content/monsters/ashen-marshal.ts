import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Dravok, the Ashen Marshal — Chapter 8 boss, the burnt warlord who will not
 * accept the war ended. He kept the field after the fire took everything on it,
 * and he keeps it still, marshalling the dead of both sides into one endless
 * march down toward the captor — a general with no enemy left, who has decided
 * that anything still walking is therefore the enemy.
 *
 * Kit (the proven apex pattern, scaled a clear notch above Chapter 6): a round-1
 * `paralyze` opener — a dead commander's order your body obeys before your mind
 * can refuse — then `multiattack` every round thereafter (the picker falls to
 * multiattack once the opener is spent), swinging his cinder-edged blade.
 * `battle-rage` at half HP: the old war reignites in him and the back half of
 * the fight becomes a race.
 */
export const ASHEN_MARSHAL: Monster = MonsterSchema.parse({
  id: 'ashen-marshal',
  name: 'Dravok, the Ashen Marshal',
  cr: '11',
  size: 'medium',
  creatureType: 'undead (warlord)',
  ac: 20,
  maxHp: 212,
  speed: 30,
  abilityScores: { str: 20, dex: 14, con: 19, int: 13, wis: 16, cha: 18 },
  passivePerception: 16,
  resistances: ['fire', 'necrotic', 'bludgeoning'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'Hold the Line',
      saveDC: 19,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'He does not shout it. He says it the way a man says a thing that has always been obeyed — hold the line — and some drilled, buried part of you that was never a soldier snaps to it anyway, locks your heels and your spine, and will not let you break ranks even to save your life.',
    },
    {
      kind: 'multiattack',
      name: 'Old Campaign',
      attacks: 2,
      description:
        'He fights the way he fought the war that made him: economically, without anger yet, two strokes of a long and practised drill that has cut down better than you on better days than this.',
    },
    {
      kind: 'attack',
      name: "Cinder-Marshal's Blade",
      attackBonus: 12,
      damage: '2d10+8',
      damageType: 'fire',
      reach: 10,
      description:
        'The blade took the fire and kept it — a long bar of dull, banked heat that lights to orange on the swing. Where it lands it opens the wound and cauterises it in the same stroke, so you bleed heat instead of blood and the field smells of you.',
    },
  ],
  flavorText:
    "There is no throne on the ashfields — a throne is for a war that has somewhere to end. He stands where the line stood, in the centre of a march that goes nowhere and never halts, a tall burnt shape in the ruin of a marshal's harness with the rank still legible under the char. He turned the whole dead host into a column the day the fire ended everything but him, and he has marched it down the world ever since, looking for the enemy that did this. He has decided you are it. \"The order was to hold,\" he says, almost kindly, as the ranks close at your back. \"No one stood the army down. So the army stands. Fall in, or fall.\"",
});
