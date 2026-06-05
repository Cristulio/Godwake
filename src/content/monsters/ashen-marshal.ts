import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Dravok, the Ashen Marshal — Chapter 8 boss, the burnt warlord who will not
 * accept the war ended. He kept the field after the fire took everything on it,
 * and he keeps it still, marshalling the dead of both sides into one endless
 * march down toward the captor — a general with no enemy left, who has decided
 * that anything still walking is therefore the enemy.
 *
 * boss-framework kit (layered on the apex pattern — paralyze opener, multiattack
 * filler, battle-rage past half): early he fights economically, but on the order
 * he raises the marshalled dead in a massed `Marshalled Volley` — a telegraphed
 * `frightened` that winds up one turn (the ranks levelling their bows) before the
 * sky goes dark with cinder-shafts and your nerve breaks. At half HP the war he
 * would not let end REIGNITES (an enrage `phase`): the discipline burns off, he
 * drops his guard to attack, and the blade stops cauterising and simply BURNS —
 * a `Cauterising Brand` that cooks the strength out of your arm (`weakened`) so
 * your blows fall soft while the heat works inward. The back half is a race.
 */
export const ASHEN_MARSHAL: Monster = MonsterSchema.parse({
  id: 'ashen-marshal',
  name: 'Dravok, the Ashen Marshal',
  cr: '12',
  size: 'medium',
  creatureType: 'undead (warlord)',
  ac: 21,
  maxHp: 264,
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
      kind: 'debuff',
      name: 'Marshalled Volley',
      condition: 'frightened',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      telegraph: {
        chargeText:
          'He lifts the marshal\'s baton and the ranks at your back go still, then level — a hundred char-black arms drawing as one, the old massed volley, the air filling with the dry creak of dead bows bending toward you.',
      },
      description:
        'The volley comes the way it came on the day the field died: not aimed, simply loosed, a sky going dark with cinder-shafts all at once — and something older than courage in you breaks and wants only to be small, and behind cover, and not here.',
    },
    {
      kind: 'multiattack',
      name: 'Old Campaign',
      attacks: 3,
      description:
        'He fights the way he fought the war that made him: economically, without anger yet, three strokes of a long and practised drill that has cut down better than you on better days than this.',
    },
    {
      kind: 'attack',
      name: "Cinder-Marshal's Blade",
      attackBonus: 14,
      damage: '3d12+12',
      damageType: 'fire',
      reach: 10,
      description:
        'The blade took the fire and kept it — a long bar of dull, banked heat that lights to orange on the swing. Where it lands it opens the wound and cauterises it in the same stroke, so you bleed heat instead of blood and the field smells of you.',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The War Reignites',
      enterText:
        'Dravok stops fighting economically. Somewhere under the char a furnace he had banked for a hundred years takes the air again — the war he would not let end reignites in him — and the discipline burns off like dross, leaving only the burning, and a guard he no longer bothers to keep.',
      acDelta: -2,
      transform: true,
      addActions: [
        {
          kind: 'debuff',
          name: 'Cauterising Brand',
          condition: 'weakened',
          saveDC: 18,
          saveAbility: 'con',
          durationRounds: 3,
          amount: 4,
          description:
            'The blade is all open furnace now, and where it grazes you it no longer cuts and cauterises in one clean stroke — it simply burns, a brand that keeps burning, cooking the strength out of the arm so your own blows fall soft and slow while the heat works its way in.',
        },
      ],
    },
  ],
  flavorText:
    "There is no throne on the ashfields — a throne is for a war that has somewhere to end. He stands where the line stood, in the centre of a march that goes nowhere and never halts, a tall burnt shape in the ruin of a marshal's harness with the rank still legible under the char. He turned the whole dead host into a column the day the fire ended everything but him, and he has marched it down the world ever since, looking for the enemy that did this. He has decided you are it. \"The order was to hold,\" he says, almost kindly, as the ranks close at your back. \"No one stood the army down. So the army stands. Fall in, or fall.\"",
});
