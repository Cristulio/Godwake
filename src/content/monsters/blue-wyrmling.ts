import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Blue Wyrmling — Chapter 13 early-mid. Korvazel's own get, the half-dragon's
 * brood still small enough to call young, nested in the warm crackling dark of
 * the lair's upper vaults. They are lightning down to the blood, immune to it,
 * and they fight the way their sire taught: bite first, bite again, the jaws
 * already charged. A `multiattack` that resolves the storm-charged bite twice.
 */
export const BLUE_WYRMLING: Monster = MonsterSchema.parse({
  id: 'blue-wyrmling',
  name: 'Blue Wyrmling',
  cr: '12',
  size: 'medium',
  creatureType: 'dragon',
  ac: 20,
  maxHp: 186,
  speed: 30,
  abilityScores: { str: 17, dex: 14, con: 17, int: 12, wis: 11, cha: 15 },
  passivePerception: 13,
  immunities: ['lightning'],
  actions: [
    {
      kind: 'attack',
      name: 'Storm-Charged Bite',
      attackBonus: 13,
      damage: '2d8+7',
      damageType: 'lightning',
      reach: 5,
      description:
        'The jaws come down trailing a blue thread of static that finds the gap in armour before the teeth do, so the bite arrives already burning — the brood-mark of every thing Korvazel has sired into the dark.',
    },
    {
      kind: 'multiattack',
      name: 'Snapping Frenzy',
      attacks: 2,
      description:
        'Young and quick and not yet grown into patience, the wyrmling worries at you with both jaws in a flurry, snapping a second time before the first wound has closed.',
    },
  ],
  flavorText:
    "Korvazel has been at this a long time — siring on dragons and drakes and stranger things, breeding the storm in his blood back into a brood that fills the warm dark of his lair end to end. These are the young of it, still small enough to be called wyrmlings, their scales the deep electric blue of their sire's and the air around them already crackling faintly when they wake. They are not yet cunning. They do not have to be. They are lightning with teeth, and there are a great many of them between you and their father.",
});
