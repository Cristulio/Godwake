import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Melissan — Amelyssan the Blackhearted, the true final villain of the game and
 * the apex of the bestiary. Once Bhaal's highest priestess, she engineered the
 * whole Bhaalspawn crisis to harvest the Children's divine essence and seize the
 * empty Throne of Bhaal, to rise as the new God of Murder. At the Throne she
 * draws on the pools of rendered essence and ascends as she is worn down.
 *
 * Apex boss-framework kit (the biggest statblock in the game — CR 18, ~440 HP):
 *  - A round-1 `paralyze` opener (the murder that stops the heart mid-beat).
 *  - A `summon` (Draw on the Pools): blood-fiends hauled out of the essence to
 *    devour you — every wound they open runs the wrong way and feeds her cause.
 *  - A `sustain` (Drink the Harvest): she pulls the gathered divinity back into
 *    herself and knits her wounds — a self-heal you must out-race once she is low.
 *  - A telegraphed `attack` (Scepter of the Unspoken God): the harvest made into
 *    a tool, wound up a full turn before it falls — race it, brace it, or break
 *    her focus to drop it uncast.
 *  - `actionsPerTurn: 2`, rising to 3 in her half-HP ASCENDED `phase`: worn past
 *    the mortal half of her she transforms, takes a third action, and — with the
 *    legacy `battle-rage` — fights like the god she is becoming rather than the
 *    priestess she was.
 */
export const MELISSAN: Monster = MonsterSchema.parse({
  id: 'melissan',
  name: 'Melissan',
  cr: '18',
  size: 'medium',
  creatureType: 'fiend (ascending demigod)',
  ac: 24,
  maxHp: 480,
  speed: 30,
  abilityScores: { str: 20, dex: 20, con: 22, int: 20, wis: 22, cha: 24 },
  passivePerception: 19,
  resistances: ['necrotic', 'psychic', 'fire', 'cold', 'radiant'],
  bossMechanic: 'battle-rage',
  actionsPerTurn: 2,
  phases: [
    {
      atHpPctBelow: 50,
      name: 'Ascendant',
      enterText:
        'You wear away the last of the mortal half of her, and what is underneath stops pretending to wear a body at all. The pools at her feet stand up into her; the kind face is gone past even contempt now; and Amelyssan the Blackhearted takes her third stride into godhood mid-fight — faster than a thing with limbs should be, and no longer bothering to stay inside the shape that has limbs.',
      actionsPerTurn: 3,
      transform: true,
    },
  ],
  actions: [
    {
      kind: 'paralyze',
      name: 'The Murder That Stops the Heart',
      saveDC: 22,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        "She lifts one open hand toward you, almost gently, the way she must once have lifted it over a thousand offerings on a thousand altars, and speaks the oldest of the dead god's portfolio into the muscle of you — not a wound, a verdict — and your heart simply holds, mid-beat, while she watches it with a priestess's mild, professional interest to see whether it will be permitted to start again.",
    },
    {
      kind: 'summon',
      name: 'Draw on the Pools',
      summonDefId: 'blood-fiend',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'She trails her fingers in the nearest pool of essence without looking down, the way a queen reaches for a thing she has never once had to find, and the murder comes up the wrong way to her summons — a blood-fiend hauling itself out of the surface at her shoulder, already four-armed, already reaching, hers for as long as she keeps her hand in the god she is draining.',
    },
    {
      kind: 'sustain',
      name: 'Drink the Harvest',
      target: 'self',
      heal: '3d10+6',
      cooldownRounds: 2,
      description:
        'When you finally cost her something, she simply takes it back from the pools — closes a hand in the rendered essence of a hundred dead Children and draws a measure of it up into the wound, where it sets and seals and is hers. Every drop you have made her spend, she means to refill from the same harvest she came here to reap; out-spend the reaping, or she closes faster than you can open her.',
    },
    {
      kind: 'attack',
      name: 'Scepter of the Unspoken God',
      attackBonus: 16,
      damage: '3d10+12',
      damageType: 'necrotic',
      reach: 10,
      telegraph: {
        chargeText:
          'She raises the black scepter without hurry and holds it up, and the gathered essence of every death you ever died begins to run down its length and pool at the head of it — she is winding the whole harvest into one falling stroke, and you have a single breath to close, to brace, or to break her attention before it comes down.',
      },
      description:
        "The scepter is the harvest made into a tool — every drop of essence she has gathered fused into a single length of black regalia, and where it touches you it presses the dead god's whole portfolio through the contact at once: that everything dies, that she will be the one who decides it, and that your death in particular is a foregone administrative matter she is merely seeing to in person.",
    },
  ],
  flavorText:
    "She was the kindest face of the whole long nightmare. Through every chapter of the crisis there was a woman called Melissan at the edge of the worst of it — counselling, sheltering, gathering the orphaned Children of Bhaal under her wing and weeping with them over what the inheritance had done — and you trusted her, because she was the one person in all of it who seemed to want nothing from you but your safety. That was the masterwork. Amelyssan the Blackhearted was Bhaal's highest priestess before he died, and she did not mourn her god so much as inventory him: a divinity rendered down into a hundred-odd mortal vessels and scattered across the world to be reaped at leisure. The whole crisis was her harvest. Every death you died was a measure taken. And now, at the foot of the empty Throne, with the last of the essence steaming in pools around her and the kind mask finally set aside, she turns to you with no anger at all — only the serene, terrible patience of a priestess at the final rite. \"You were always the largest of the offerings,\" she says, and the Throne behind her begins, faintly, to fill. \"Thank you for carrying yourself all this way to the altar. Be still now. There is a god to make of all of you, and I have waited so very long to be Him.\"",
});
