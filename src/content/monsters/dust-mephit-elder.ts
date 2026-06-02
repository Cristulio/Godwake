import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Dust Mephit Elder — the bell-jar dust didn't all blow off when the seal
 * broke. The eldest of the pack has been thickening in the dark of the
 * lower lab for years; its breath has weight now, and a name.
 */
export const DUST_MEPHIT_ELDER: Monster = MonsterSchema.parse({
  id: 'dust-mephit-elder',
  name: 'Dust Mephit Elder',
  cr: '1/2',
  size: 'small',
  creatureType: 'elemental',
  ac: 13,
  maxHp: 20,
  speed: 30,
  abilityScores: { str: 7, dex: 15, con: 11, int: 10, wis: 11, cha: 11 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Choking Breath',
      attackBonus: 5,
      damage: '2d6+2',
      damageType: 'poison',
      reach: 5,
      description:
        'It draws a long breath through teeth that aren\'t there and exhales a cone of chalk-grey dust. The air in your lungs goes powdery and refuses to come back out.',
    },
    {
      kind: 'debuff',
      name: 'Settling Dust',
      condition: 'poisoned',
      saveDC: 11,
      saveAbility: 'con',
      durationRounds: 2,
      description:
        'The grey dust hangs and settles where you stand, and every breath drawn through it comes back thinner. The room swims at the edges.',
    },
  ],
  immunities: ['poison'],
  flavorText:
    'Three times the size of its kin, with longer claws and slower wings. Its skin is the colour of old ledger paper and its eyes are two coin-slots of yellow light.',
});
