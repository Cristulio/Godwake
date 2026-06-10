import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Jon Velnaris — Chapter 11 boss, the captor, the climax of the whole soul-theft
 * arc. The Voice that has narrated your descent since the first cell; the elf who
 * tore your soul out at the Tree of Life and dragged you both into his pocket of
 * Hell to finish the work. Here he stands gorged on the Tree's stolen power and the
 * god-essence he has pried loose from you, his stolen divinity guttering under
 * his skin like a swallowed sun.
 *
 * boss-framework kit (apex, Ch11 multi-action): he acts TWICE a turn — the
 * spellblade-work doubled — and his round-one Binding Word is now TELEGRAPHED:
 * the Voice gathers the old word of holding for a turn (flashed on him + the
 * header) before it lands, a window to brace the save, burst him, or choke the
 * word off with hard control. A draining Leeching Word saps the strength from the
 * soul he half-owns (weakened). And at HALF HP the marquee fires: wound him past
 * the point his stolen power can paper over and god-taint he tore out of you
 * takes him instead — a TRANSFORM PHASE that cracks him into the Slayer's shape,
 * his guard forgotten, a third action a turn, his disciplined kit REPLACED by the
 * frenzied, life-drinking rending of your father's gift turned in his hands. (The
 * `transformed` flag is a hook the content/UI lane reads for the sprite/name swap;
 * this layering replaces the legacy `battle-rage`.)
 */
export const IRENICUS: Monster = MonsterSchema.parse({
  id: 'irenicus',
  name: 'Jon Velnaris',
  cr: '16',
  size: 'large',
  creatureType: 'humanoid (soulless elf)',
  ac: 22,
  maxHp: 360,
  speed: 30,
  abilityScores: { str: 18, dex: 18, con: 20, int: 22, wis: 17, cha: 21 },
  passivePerception: 17,
  resistances: ['fire', 'necrotic', 'psychic', 'force'],
  actionsPerTurn: 2,
  actions: [
    {
      kind: 'paralyze',
      name: 'The Binding Word',
      saveDC: 22,
      saveAbility: 'wis',
      durationRounds: 2,
      telegraph: {
        chargeText:
          'He stops, and tilts his head, and begins to speak — slowly, fondly, the way he always opened a session on the slab. It is the Voice, gathering the single word it has been saying to you for a hundred lifetimes, and you can feel the old lesson rising in your own body to meet it. The word completes on his next turn. Until then there is still a little of you that could move, or silence him, or be ready to refuse it.',
      },
      description:
        'He speaks, and it is the Voice — the one that has been in your skull since the cage, patient, fond, certain of you. It says a single word it has been saying to you for a hundred lifetimes, the word that taught you to be still on the slab while he worked, and your body remembers the lesson before your mind can refuse it, and you stop, held in the warm dreadful attention of the man who made you his subject.',
    },
    {
      kind: 'debuff',
      name: 'The Leeching Word',
      condition: 'weakened',
      amount: 4,
      saveDC: 21,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'He does not strike for this one. He simply draws — a small, almost absent gesture, a man calling on an account he holds — and the soul he pried half out of you answers him over your own claim to it. The strength goes out of your arms toward him, the way warmth leaves a room through an opened door, and for a while your every blow lands as though swung by someone smaller and further away.',
    },
    {
      kind: 'multiattack',
      name: 'The Work of Both Hands',
      attacks: 2,
      description:
        'He fights the way he experimented — without haste, without waste, every motion already studied a thousand times on a thousand of you. The spellblade in one hand and the cold light in the other arrive together, a scholar finishing a procedure he has long since perfected, and there is nothing in it of anger, which is the worst of it.',
    },
    {
      kind: 'attack',
      name: 'The Stolen Sun',
      attackBonus: 15,
      damage: '2d12+10',
      damageType: 'force',
      reach: 10,
      description:
        'He opens a hand and lets out a measure of what he took at the Tree — your soul, the god in your blood, the Tree of Life\'s own stolen fire, all of it run together into a single white weight he presses into you the way a man presses a seal into wax: this is mine now, and so, very nearly, are you.',
    },
  ],
  phases: [
    {
      atHpPctBelow: 50,
      name: 'The Slayer',
      transform: true,
      replaceActions: true,
      actionsPerTurn: 3,
      bonusDamage: 3,
      acDelta: -2,
      enterText:
        "The white light under his skin tears. For one moment the scholar's face is honestly afraid — of you, of the thing rising out of the wound — and then god-taint he carved out of you decides it would rather wear him, and Jon Velnaris comes apart into the shape your father left in the blood. The Slayer stands where the captor stood: no more procedure, no more fond patience, only the appetite he stole from you given hands. It forgets to guard. It does not forget to feed.",
      addActions: [
        {
          kind: 'debuff',
          name: "The Slayer's Dread",
          condition: 'frightened',
          saveDC: 21,
          saveAbility: 'wis',
          durationRounds: 1,
          description:
            'The Slayer turns the ruin of Velnaris\'s face on you, and what looks out of it is older than him and older than you and is the single oldest thing in your blood — the murder that made you. Some animal floor of you that the soul-theft never reached recognises its maker and tries to run, and for a breath you cannot make yourself close with the thing wearing your father\'s purpose.',
        },
        {
          kind: 'attack',
          name: 'Murderous Rending',
          attackBonus: 16,
          damage: '2d8+10',
          damageType: 'slashing',
          reach: 10,
          lifeDrain: 0.2,
          description:
            'There is no spellblade now, no measured light — only the Slayer reaching into you with both opened hands and pulling, taking meat and warmth and the thin remaining thread of the soul he never finished stealing, and what it tears loose closes its own wounds as it goes. It is the procedure abandoned for the hunger that was always under it.',
        },
      ],
    },
  ],
  flavorText:
    "You have heard him the whole way down. The Voice in the cell, in the asylum, at every turning — patient, cultured, almost tender, the voice of the man who took your soul out of you with the unhurried care of someone repotting a flower. Now there is a face to put to it at last: Jon Velnaris, the exiled elf who burned his own soul away chasing godhood and decided yours would do instead. He stands at the centre of his pocket of Hell with the Tree of Life's stolen power lit under his skin and your divinity gripped in him like a swallowed coal, and he greets you the way he always has — as a subject, a specimen, a thing he is fond of in the way one is fond of good work. \"You came all this way down,\" he says, and the old Voice fits the face exactly. \"After everything I took, you climbed back up to me. I am almost moved. But you have always misunderstood what you are — you are not the one who survives this story. You are the soil. And I have such things to grow.\"",
});
