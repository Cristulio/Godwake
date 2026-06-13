import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Fire-Giant Warlord — Chapter 12 elite. One of Hargan-Vor's captains, the
 * giant set over a wing of the siege, bigger and older and harder to kill than
 * the line it commands. A `multiattack` apex with a great fire-blade at long
 * reach and a hurled wall-stone at range, and a `sustain` that banks its own
 * heat back into its wounds — every gash you open it closes with a breath of
 * its own fire, so the fight grinds long unless you can outpace the forge.
 */
export const FIRE_GIANT_WARLORD: Monster = MonsterSchema.parse({
  id: 'fire-giant-warlord',
  name: 'Fire-Giant Warlord',
  cr: '14',
  size: 'huge',
  creatureType: 'giant',
  ac: 21,
  maxHp: 300,
  speed: 30,
  abilityScores: { str: 25, dex: 12, con: 22, int: 13, wis: 16, cha: 15 },
  passivePerception: 16,
  resistances: ['fire', 'bludgeoning'],
  immunities: ['fire'],
  actions: [
    {
      kind: 'multiattack',
      name: 'Captain\'s Cadence',
      attacks: 2,
      description:
        'It fights with the discipline the line lacks — two measured, crushing strokes of the great blade, each placed where the last one drove you, herding you toward the reach where it wants you.',
    },
    {
      kind: 'attack',
      name: 'Warlord\'s Greatblade',
      attackBonus: 14,
      damage: '2d12+9',
      damageType: 'fire',
      reach: 15,
      description:
        'A two-handed bar of forge-black iron longer than the giants of the line carry, kept at a working orange the whole fight. Its reach is its own; you are inside the kill before you are inside the swing.',
    },
    {
      kind: 'attack',
      name: 'Hurled Wall-Stone',
      attackBonus: 14,
      damage: '3d10+9',
      damageType: 'bludgeoning',
      range: [60, 240],
      description:
        'When you give it ground it takes a course of Karthen\'s broken wall in one hand and sends it back down the street at you, trailing fire, a piece of the city it is here to unmake.',
    },
    {
      kind: 'sustain',
      name: 'Bank the Forge',
      target: 'self',
      heal: '4d8',
      cooldownRounds: 2,
      description:
        'It breathes in over the heat coming off its own skin and the worst of the gashes you have opened seal to black scar — the giant is its own forge, and it will re-temper itself for as long as you let it.',
    },
  ],
  flavorText:
    "Hargan-Vor does not command the siege stroke by stroke; he keeps captains for that, and this is one of them — a fire giant grown old and huge in the mountain-wars, set over a whole wing of the ring around Karthen. It is everything the line is, made worse: it hits from further, it does not tire, and what you do to it, it undoes with a breath, banking its own heat back into the wound. Beat it, and you have broken a finger of the siege. There are more fingers. And there is the hand.",
});
