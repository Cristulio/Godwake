import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Bone Stalker — undead patchwork from the Athkatlan paupers' ditch.
 * Bigger than a skeleton, slower, but it remembers the rope it died on
 * and keeps a length of it knotted at the wrist as a cudgel.
 */
export const BONE_STALKER: Monster = MonsterSchema.parse({
  id: 'bone-stalker',
  name: 'Bone Stalker',
  cr: '1',
  size: 'medium',
  creatureType: 'undead',
  ac: 12,
  maxHp: 19,
  speed: 25,
  abilityScores: { str: 14, dex: 10, con: 13, int: 5, wis: 8, cha: 5 },
  passivePerception: 9,
  actions: [
    {
      kind: 'attack',
      name: 'Knotted Cudgel',
      attackBonus: 4,
      damage: '1d10+2',
      damageType: 'bludgeoning',
      reach: 5,
      description:
        'It swings the rope-and-bone club in a slow arc you can read, then accelerates it through the last foot the way a hangman would. The wrist remembers its old work.',
    },
  ],
  vulnerabilities: ['bludgeoning'],
  immunities: ['poison'],
  flavorText:
    'It is two paupers stacked into one corpse. The lower jaw belongs to neither of them, and the rope at the wrist is older than either rib-cage.',
});
