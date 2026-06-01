import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Avatar of Wrath — Chapter 11 early-mid bruiser, the guardian-manifestation of
 * the Trial of Wrath. The pit asks whether you will strike down the helpless thing
 * before you for the power it offers, and the rage you would do it in stands up to
 * meet you wearing your father's fire. A `multiattack` striker (it falls on you in
 * a flurry once the picker spends the opener) that carries `battle-rage`: wound it
 * past half and the Bhaal-fire in it catches properly, +2 a hit until one of you is
 * done. It does not control or feed. It only escalates, which is the whole sin.
 */
export const AVATAR_OF_WRATH: Monster = MonsterSchema.parse({
  id: 'avatar-of-wrath',
  name: 'Avatar of Wrath',
  cr: '11',
  size: 'large',
  creatureType: 'fiend (sin-manifestation)',
  ac: 18,
  maxHp: 174,
  speed: 40,
  abilityScores: { str: 20, dex: 15, con: 19, int: 10, wis: 11, cha: 16 },
  passivePerception: 11,
  resistances: ['fire', 'bludgeoning', 'slashing'],
  bossMechanic: 'battle-rage',
  actions: [
    {
      kind: 'multiattack',
      name: 'Flurry of the Murder',
      attacks: 2,
      description:
        'There is no guard in it and no plan — it simply comes apart into blows, both fists, the whole weight of the thing thrown forward twice before it has finished landing once, the way a killing rage spends itself with no thought for after.',
    },
    {
      kind: 'attack',
      name: 'Fist of Bhaal-Fire',
      attackBonus: 11,
      damage: '2d10+7',
      damageType: 'fire',
      reach: 10,
      description:
        'A fist sheathed in the dark-red fire that is your inheritance comes down with the particular joy of a thing that has wanted, its whole short life, to hit something and has finally been given a reason it does not have to justify.',
    },
  ],
  flavorText:
    "The third of the five trials is Wrath, and its question is the cruelest because it offers the most: there is a helpless thing here, and striking it down will make you stronger, and the only cost is doing it in anger and calling the anger justice. The avatar is that anger given a body — broad, burning, joyfully stupid, your father's worst gift standing up out of the floor of Hell wearing your own readiness to lash out. It fights the way wrath fights: all forward, no economy, harder the more it bleeds, because rage does not have a plan for losing. Put it down cold, without joining it, and you have passed. Match its fire with your own and you have only shown the pit you are exactly what it hoped.",
});
