import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * The Hollow Pretender — Chapter 9 boss, the usurper on the empty throne. It
 * wears the mask of every ruler this Court ever had, one over the next, and
 * there has never been a face beneath the last of them — only the readiness to
 * wear another. It took the throne by being whatever the room needed to believe,
 * and it rules a hall of no one by the same lie, forever.
 *
 * Kit (the proven apex pattern, scaled a clear notch above Chapter 8): a round-1
 * `paralyze` opener — it lifts the mask and shows you the nothing behind it, and
 * the nothing fixes you where you stand — then `multiattack` every round after
 * (the picker falls to it once the opener is spent), fighting with the borrowed
 * skill of a hundred dead duellists. `battle-rage` at half HP: crack the mask
 * expecting the kill and find no face under it, and the nothing redoubles — the
 * Court lying even in how it dies.
 */
export const THE_HOLLOW_PRETENDER: Monster = MonsterSchema.parse({
  id: 'the-hollow-pretender',
  name: 'The Hollow Pretender',
  cr: '13',
  size: 'medium',
  creatureType: 'undead (usurper)',
  ac: 21,
  maxHp: 240,
  speed: 30,
  abilityScores: { str: 18, dex: 20, con: 19, int: 17, wis: 16, cha: 22 },
  passivePerception: 16,
  resistances: ['psychic', 'force', 'necrotic'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'paralyze',
      name: 'The Face Beneath',
      saveDC: 20,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It raises a gloved hand to the edge of the mask, courteous, almost shy, and lifts it — and there is nothing there. Not a wound, not a skull: a held, perfect absence, the shape of a face with no face in it, and looking into the nothing your body stops, the way a thing stops at the lip of a height, certain that to move is to fall in.',
    },
    {
      kind: 'multiattack',
      name: 'A Hundred Borrowed Hands',
      attacks: 2,
      description:
        'It fights with everyone it has ever been — the duellist, the assassin-courtier, the king who learned the blade for show — each stroke in a different dead hand\'s style, so there is no rhythm to read because there is no one fighting you, only a sequence of borrowings.',
    },
    {
      kind: 'attack',
      name: 'Sceptre of a Hundred Reigns',
      attackBonus: 13,
      damage: '2d12+8',
      damageType: 'psychic',
      reach: 10,
      description:
        'The sceptre is a rod of fused regalia, every ruler\'s crown and rod and seal-ring melted into one length of cold gold. Where it touches you it does not break the skin so much as press a verdict through it — you are not of this court, and the court does not keep what is not of it.',
    },
  ],
  flavorText:
    "There is a throne in the last hall and it is empty, and the thing that rules from it has never once sat down — a slender, courtly shape in layered finery, masked, that bows to you as you enter with the exact warmth of a host who has been expecting you a long time. It wears the face of the Court's first king, and beneath that the face of the second, and beneath that every face that ever held this hall, all the way down to nothing, because it took the throne not by blood but by being, perfectly, whatever each room needed to crown. It is the captor's oldest trick worn as a creature: rule by becoming the thing they wish were true. \"Welcome back,\" it says, in a voice you almost trust. \"You have worn so many faces climbing down to me. Surely you can spare the last one. Take off yours — I will keep it safe — and there will be a place for you here, where no one ever has to be anyone at all.\"",
});
