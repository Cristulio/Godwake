import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Dravok, the Ashen Marshal — Chapter 8 boss, the burnt warlord who will not
 * accept the war ended. He kept the field after the fire took everything on it,
 * and he keeps it still, marshalling the dead of both sides into one endless
 * march down toward the captor — a general with no enemy left, who has decided
 * that anything still walking is therefore the enemy.
 *
 * boss-framework kit (the marshal COMMANDS — he acts TWICE a turn, command and
 * blade in the same breath, joining the endgame cadence a chapter early because
 * a war-marshal's whole fantasy is action economy): a paralyze opener, a
 * multiattack drill, battle-rage past half. His signature is `The Marshal's
 * Horn` — a telegraphed war-call (`frightened`: your attacks roll at
 * disadvantage while it echoes) that winds up one turn at his lips, giving you
 * a beat to race it, brace for it, or put him down to cut it off. At half HP
 * the war he would not let end REIGNITES (the `phase`): the discipline burns
 * off, he drops his guard to attack, the blade stops cauterising and simply
 * BURNS (`Cauterising Brand` — `weakened`), and he does what a marshal does
 * when the centre is pressed: calls the line. ONE wave of two Slagbound
 * Legionaries answers (`The Line Answers`, summon, once) — the reserve
 * committed at last. The phase re-lists the kit (`replaceActions`) so the call
 * outranks a horn re-charge on the picker walk and the wave lands at the beat.
 *
 * Numbers are PROVISIONAL (horn DC/duration, summon count, the 2-act cadence)
 * — the orchestrator runs the boss gauntlet post-merge and tunes from the sim,
 * never by hand here.
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
  actionsPerTurn: 2,
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
      name: "The Marshal's Horn",
      condition: 'frightened',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      telegraph: {
        chargeText:
          'He unslings the cracked war-horn from his harness and sets it to what is left of his mouth — and down the whole line ten thousand dead stop marching at once to listen, because the last time this horn sounded, everything that heard it obeyed.',
      },
      description:
        'The horn-call rolls down the field the way it rolled the day the line held and died holding — an order older than your courage, pitched not at your mind but at your marrow, and your marrow answers: it wants to fall in, or fall back, anything but stand against the man who is still giving orders to the dead.',
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
      name: 'The Marshal Calls the Line',
      enterText:
        'Dravok stops fighting economically. Somewhere under the char a furnace he had banked for a hundred years takes the air again — the war he would not let end reignites in him — and the discipline burns off like dross, leaving only the burning, and a guard he no longer bothers to keep. And he does what a marshal does when the centre is pressed: he calls the line.',
      acDelta: -2,
      transform: true,
      // replaceActions re-lists the whole kit so the picker walk meets the
      // once-only summon BEFORE the horn — appended actions sit after the base
      // list, where a horn re-charge would preempt the call indefinitely.
      replaceActions: true,
      addActions: [
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
          kind: 'summon',
          name: 'The Line Answers',
          summonDefId: 'slagbound-legionary',
          count: 2,
          once: true,
          description:
            'He does not look to see whether he is obeyed; he has never once had to. Two of the slagbound heavy companies wheel out of the endless march and close on you in step — the reserve he has held back for a hundred years, committed at last, because you have finally made yourself worth it.',
        },
        {
          kind: 'debuff',
          name: "The Marshal's Horn",
          condition: 'frightened',
          saveDC: 18,
          saveAbility: 'wis',
          durationRounds: 2,
          telegraph: {
            chargeText:
              'He unslings the cracked war-horn from his harness and sets it to what is left of his mouth — and down the whole line ten thousand dead stop marching at once to listen, because the last time this horn sounded, everything that heard it obeyed.',
          },
          description:
            'The horn-call rolls down the field the way it rolled the day the line held and died holding — an order older than your courage, pitched not at your mind but at your marrow, and your marrow answers: it wants to fall in, or fall back, anything but stand against the man who is still giving orders to the dead.',
        },
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
    },
  ],
  flavorText:
    "There is no throne on the ashfields — a throne is for a war that has somewhere to end. He stands where the line stood, in the centre of a march that goes nowhere and never halts, a tall burnt shape in the ruin of a marshal's harness with the rank still legible under the char. He turned the whole dead host into a column the day the fire ended everything but him, and he has marched it down the world ever since, looking for the enemy that did this. He has decided you are it. \"The order was to hold,\" he says, almost kindly, as the ranks close at your back. \"No one stood the army down. So the army stands. Fall in, or fall.\"",
});
