import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bonebound Test-Subject — what the Cowled Wizards do to a corpse when they
 * want one more answer out of it. A stitched undead with bone reinforcing the
 * weak places. Standard undead profile, bludgeoning-vulnerable like the
 * Skeleton and Bone Stalker before it.
 */
export const BONEBOUND_TEST_SUBJECT: Monster = MonsterSchema.parse({
  id: 'bonebound-test-subject',
  name: 'Bonebound Test-Subject',
  cr: '2',
  size: 'medium',
  creatureType: 'undead',
  ac: 13,
  maxHp: 30,
  speed: 25,
  abilityScores: { str: 14, dex: 10, con: 14, int: 4, wis: 8, cha: 5 },
  passivePerception: 9,
  actions: [
    {
      kind: 'attack',
      name: 'Stitched Claw',
      attackBonus: 5,
      damage: '1d8+2',
      damageType: 'slashing',
      reach: 5,
      description:
        'The fingers have been rebuilt around fragments of someone else\'s scapula. They open and close as one piece, raking down across the chest.',
    },
  ],
  resistances: ['necrotic'],
  vulnerabilities: ['bludgeoning'],
  immunities: ['poison'],
  flavorText:
    "A body the Cowled Wizards saved from the slab and rewired with bone. The seams along its arms and ribs are healed in too straight a line — someone wanted them to hold under stress. The eyes are open and the mouth is sewn shut.",
});
