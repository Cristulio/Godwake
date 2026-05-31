import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Masquerade-Warden — Chapter 9 mid controller, the chapter's illusion core. It
 * was the master of the revels, the one who kept the ball turning, and it keeps
 * it turning still in an empty hall — flooding the air with a swirl of false
 * faces so you cannot tell which dancer is the real one (`debuff` → blinded,
 * DC 18; re-cast on a roughly two-round cadence so you swing at phantoms while
 * the true blade comes from somewhere you are not looking). Then it cuts from
 * reach, out of the crowd that is not there.
 */
export const MASQUERADE_WARDEN: Monster = MonsterSchema.parse({
  id: 'masquerade-warden',
  name: 'Masquerade-Warden',
  cr: '10',
  size: 'medium',
  creatureType: 'undead',
  ac: 18,
  maxHp: 124,
  speed: 30,
  abilityScores: { str: 13, dex: 17, con: 16, int: 16, wis: 17, cha: 18 },
  passivePerception: 15,
  resistances: ['psychic', 'radiant'],
  actions: [
    {
      kind: 'debuff',
      name: 'Call the Revel',
      condition: 'blinded',
      saveDC: 18,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It claps its gloved hands once, calling a ball to order that ended an age ago, and the dead air fills with a whirling crowd of borrowed faces — laughing, bowing, sweeping past you on every side — until you cannot say which of the swirl is a thing that can be cut and which is only a face.',
    },
    {
      kind: 'attack',
      name: 'Revelmaster Cane',
      attackBonus: 9,
      damage: '2d8+6',
      damageType: 'psychic',
      reach: 10,
      description:
        'Somewhere in the crowd that is not there, a long lacquered cane lashes out of a gap between two laughing masks — from a quarter you were not watching, because you were watching all the others.',
    },
  ],
  flavorText:
    "It announced the guests and called the dances and made certain no face at the ball was ever quite the face beneath — and when the Court fell it simply kept the revel going, because a master of revels without a revel is nothing, and it cannot afford to be nothing. The crowd it conjures is every guest it ever announced, all of them false, all of them in the way. It hides in its own party. You will spend the fight learning that almost everything in the room is a lie, and that the one thing that isn't has a very long reach.",
});
