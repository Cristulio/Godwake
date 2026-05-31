import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Pyre-Chaplain — Chapter 8 support caster. The army's chaplain, who tended the
 * burning of the dead and never stopped — it re-kindles fallen soldiers mid-
 * fight, mending and warding the host's other servants (`sustain`, target ally:
 * 3d6 heal plus an 18-point ward of banked coals, cooldown 2) and scourges with
 * a coal-censer when there is no one left to raise. Pairs viciously with any Ch8
 * front-liner; drop the chaplain first or the ranks reforge faster than you fell
 * them.
 */
export const PYRE_CHAPLAIN: Monster = MonsterSchema.parse({
  id: 'pyre-chaplain',
  name: 'Pyre-Chaplain',
  cr: '9',
  size: 'medium',
  creatureType: 'undead',
  ac: 18,
  maxHp: 110,
  speed: 30,
  abilityScores: { str: 12, dex: 13, con: 16, int: 13, wis: 18, cha: 16 },
  passivePerception: 14,
  resistances: ['fire', 'radiant'],
  actions: [
    {
      kind: 'sustain',
      name: 'Rekindle the Fallen',
      target: 'ally',
      heal: '3d6',
      wardTempHp: 18,
      cooldownRounds: 2,
      description:
        'It lays a smoking thumb on a guttering soldier and breathes the old rite over it, and the embers in the thing flare back up — the wound sealing under a crust of fresh-banked coal that has to be cracked through again.',
    },
    {
      kind: 'attack',
      name: 'Coal-Censer',
      attackBonus: 8,
      damage: '2d6+5',
      damageType: 'fire',
      reach: 5,
      description:
        'It swings the censer it once swung over the pyres, trailing a fan of live coals. The blessing it mutters is for its own dead; for you there is only the heat at the end of the chain.',
    },
  ],
  flavorText:
    "It tended the burnings — said the words over each pyre, kept the fires honest, sent the army's dead off clean. When the firestorm took the whole march at once there was no one left to burn and no end to the burning, and the chaplain simply went on with its office, kindling the fallen back to their feet for a war that will not finish. It does not fight so much as keep the congregation. The censer is an afterthought. The rite is the weapon.",
});
