import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Warden of the Pools — Chapter 14 mid controller / anchor. A priest-warden of
 * the harvest whose whole office is the upkeep of the pools and the things that
 * rise from them. A `sustain` core (it sluices fresh essence over a failing fiend,
 * healing it and laying a thick ward of congealed blood — `ally` heal 3d8 + a
 * 24-point ward, cooldown 2) plus a `debuff` (blinded — a spray of ichor across
 * the eyes) and a heavy gavel at reach. Leave it standing and nothing you down
 * stays down.
 */
export const ESSENCE_WARDEN: Monster = MonsterSchema.parse({
  id: 'essence-warden',
  name: 'Warden of the Pools',
  cr: '14',
  size: 'medium',
  creatureType: 'fiend (cultist)',
  ac: 21,
  maxHp: 250,
  speed: 30,
  abilityScores: { str: 17, dex: 14, con: 18, int: 14, wis: 18, cha: 16 },
  passivePerception: 16,
  resistances: ['necrotic', 'poison', 'radiant'],
  actions: [
    {
      kind: 'sustain',
      name: 'Sluice the Pools',
      target: 'ally',
      heal: '3d8',
      wardTempHp: 24,
      cooldownRounds: 2,
      description:
        'It tips a failing fiend back toward the nearest pool and opens a sluice in the lip of it with a turn of its staff, and the essence runs out over the thing in a thick red sheet — closing the wounds you spent so long opening and setting over them in a glaze of congealed murder you will have to break through all over again.',
    },
    {
      kind: 'debuff',
      name: 'Spray of Ichor',
      condition: 'blinded',
      saveDC: 20,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'It cracks its staff against the surface of a pool and brings up a fanned sheet of the dead god\'s blood, flung wide across your face — and the ichor sets fast and dark over your eyes, and the hall goes to a red blindness while everything in it that can see keeps coming.',
    },
    {
      kind: 'attack',
      name: "Warden's Gavel",
      attackBonus: 15,
      damage: '2d12+9',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'The head of its staff is a gavel of fused altar-stone, and it brings the thing down on you with the flat authority of a priest closing an argument — the argument being that you do not belong at this Throne, and that the matter is not open.',
    },
  ],
  flavorText:
    "Every harvest needs its keeper of vessels — the one who tends the vats, skims the scum, tops up what evaporates, and makes certain nothing precious is spilled or wasted. At the Throne of Bhaal the vessels are pools of a god rendered down, and the warden tends them with a sacristan's terrible care: not cruel, exactly, only methodical, only unwilling to see good essence go to ruin when it could be sluiced back into something useful. To it the fiends are stock to be kept, the pools are a charge to be husbanded, and you are a leak. It will see you stopped the way it stops any leak — without heat, without haste, and without the smallest doubt that the floor will be clean again once you are done dripping.",
});
