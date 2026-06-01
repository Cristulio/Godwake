import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Jon Irenicus — Chapter 11 boss, the captor, the climax of the whole soul-theft
 * arc. The Voice that has narrated your descent since the first cell; the elf who
 * tore your soul out at the Tree of Life and dragged you both into his pocket of
 * Hell to finish the work. Here he stands gorged on the Tree's stolen power and the
 * Bhaal-essence he has pried loose from you, his stolen divinity guttering under
 * his skin like a swallowed sun.
 *
 * Kit (apex, a clear notch above Chapter 9): a round-1 `paralyze` opener — the old
 * binding word he has used to hold you since the asylum, now backed by a god's worth
 * of theft (DC 21) — then `multiattack` every round after, his spellblade-work
 * doubled, plus a heavy `attack` of raw stolen essence. `battle-rage` at half HP:
 * wound him past the point his stolen power can paper over, and the Bhaal-taint he
 * tore out of you takes him instead — he cracks into the Slayer's shape, your
 * father's gift turning in his hands, and the captor finishes the fight as the very
 * thing he stole from you.
 */
export const IRENICUS: Monster = MonsterSchema.parse({
  id: 'irenicus',
  name: 'Jon Irenicus',
  cr: '16',
  size: 'large',
  creatureType: 'humanoid (soulless elf)',
  ac: 22,
  maxHp: 320,
  speed: 30,
  abilityScores: { str: 18, dex: 18, con: 20, int: 22, wis: 17, cha: 21 },
  passivePerception: 17,
  resistances: ['fire', 'necrotic', 'psychic', 'force'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'The Binding Word',
      saveDC: 21,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'He speaks, and it is the Voice — the one that has been in your skull since the cage, patient, fond, certain of you. It says a single word it has been saying to you for a hundred lifetimes, the word that taught you to be still on the slab while he worked, and your body remembers the lesson before your mind can refuse it, and you stop, held in the warm dreadful attention of the man who made you his subject.',
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
      attackBonus: 14,
      damage: '2d12+9',
      damageType: 'force',
      reach: 10,
      description:
        'He opens a hand and lets out a measure of what he took at the Tree — your soul, the god in your blood, the Tree of Life\'s own stolen fire, all of it run together into a single white weight he presses into you the way a man presses a seal into wax: this is mine now, and so, very nearly, are you.',
    },
  ],
  flavorText:
    "You have heard him the whole way down. The Voice in the cell, in the asylum, at every turning — patient, cultured, almost tender, the voice of the man who took your soul out of you with the unhurried care of someone repotting a flower. Now there is a face to put to it at last: Jon Irenicus, the exiled elf who burned his own soul away chasing godhood and decided yours would do instead. He stands at the centre of his pocket of Hell with the Tree of Life's stolen power lit under his skin and your divinity gripped in him like a swallowed coal, and he greets you the way he always has — as a subject, a specimen, a thing he is fond of in the way one is fond of good work. \"You came all this way down,\" he says, and the old Voice fits the face exactly. \"After everything I took, you climbed back up to me. I am almost moved. But you have always misunderstood what you are — you are not the one who survives this story. You are the soil. And I have such things to grow.\"",
});
