import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Cycle-Shepherd — Ch5 mid summoner. The psychopomp that runs the death-and-
 * rebirth engine the soul has been caught in: it keeps pulling the dead back.
 * `summon` raises a `reborn-husk` (maxActive 2, cooldown 3) while striking with
 * the soul-hook. A grinder — race the husk-cap or the room never empties.
 */
export const CYCLE_SHEPHERD: Monster = MonsterSchema.parse({
  id: 'cycle-shepherd',
  name: 'Cycle-Shepherd',
  cr: '5',
  size: 'medium',
  creatureType: 'celestial',
  ac: 14,
  maxHp: 68,
  speed: 30,
  abilityScores: { str: 12, dex: 14, con: 15, int: 15, wis: 18, cha: 14 },
  passivePerception: 14,
  resistances: ['necrotic', 'radiant'],
  actions: [
    {
      kind: 'summon',
      name: 'Call the Cycle',
      summonDefId: 'reborn-husk',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'It lowers the crook toward the floor and draws upward, slow, and a seam of pale light opens where it pulls — and something that was finished stands up out of it, reluctant, reborn.',
    },
    {
      kind: 'attack',
      name: 'Soul-Hook',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'necrotic',
      reach: 10,
      description:
        'The crook is not for herding sheep. It catches under the ribs and pulls, and what it pulls at is not the body.',
    },
  ],
  flavorText:
    "Tall and stooped, a hooded thing with a shepherd's crook of grey bone, it walks the dead back to the gate and the gate back into the dead. It does not hate you. It simply cannot conceive of letting anything stay finished — that is the one cruelty it was built without the capacity to recognise. Every soul it has ever shepherded has begged it, eventually, to stop.",
});
