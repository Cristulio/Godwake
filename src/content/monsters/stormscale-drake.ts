import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Stormscale Drake — Chapter 13 mid. The grown brood of Abazigal's lair: not
 * the cunning half-dragons but the big dumb storm-blooded drakes he keeps as
 * hounds, scaled blue-black and humming with charge. They lash with a forked,
 * electrified tongue at reach and answer a wound with a thunderclap roar that
 * scatters the nerve. A reach `multiattack` (the lashing tongue twice) and a
 * `debuff` (frightened) off the roar.
 */
export const STORMSCALE_DRAKE: Monster = MonsterSchema.parse({
  id: 'stormscale-drake',
  name: 'Stormscale Drake',
  cr: '13',
  size: 'large',
  creatureType: 'dragon',
  ac: 19,
  maxHp: 178,
  speed: 40,
  abilityScores: { str: 19, dex: 13, con: 18, int: 6, wis: 12, cha: 9 },
  passivePerception: 12,
  immunities: ['lightning'],
  resistances: ['thunder'],
  actions: [
    {
      kind: 'attack',
      name: 'Forked-Tongue Lash',
      attackBonus: 11,
      damage: '2d10+5',
      damageType: 'lightning',
      reach: 10,
      description:
        'The tongue flicks out longer than any tongue should, split and crackling, and where it touches it does not lick so much as discharge — a whip of raw current that arcs to the nearest metal you wear.',
    },
    {
      kind: 'multiattack',
      name: 'Lashing Pair',
      attacks: 2,
      description:
        'It lashes twice in the time it takes to flinch from the first, the second tongue already out before the first has finished cracking against your guard.',
    },
    {
      kind: 'debuff',
      name: 'Thunderclap Roar',
      condition: 'frightened',
      saveDC: 16,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It throws its head back and lets out a roar that arrives as a physical pressure, a clap of charged air that rattles the teeth in your head and tells the oldest part of you, past argument, to run.',
    },
  ],
  flavorText:
    "Among the half-dragons and the wyrmlings Abazigal keeps things simpler too — the stormscale drakes, big as warhorses and not a tenth as bright, bred for nothing but the lightning in them and let to roam the middle galleries like guard-hounds. They have none of their sire's cunning and none of his pride; they are appetite and charge and a tongue that arcs, and they will chase a fleeing thing to exhaustion out of pure dim instinct. He does not love them. He does not have to. They keep the deep roads loud and lethal, and that is the whole of what he asks.",
});
