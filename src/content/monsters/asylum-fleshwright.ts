import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Asylum Fleshwright — Ch3 ELITE summoner. The Cowled surgeon who built the
 * Spellhold test-subjects, and still does, mid-fight. Demonstrates `summon`
 * raising a `bonebound-test-subject` (maxActive 2, cooldown 3) while carving
 * with the bone-saw. A grinder: the longer it lives, the more stitched bodies
 * stand between you and it.
 */
export const ASYLUM_FLESHWRIGHT: Monster = MonsterSchema.parse({
  id: 'asylum-fleshwright',
  name: 'Asylum Fleshwright',
  cr: '4',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 15,
  maxHp: 76,
  speed: 30,
  abilityScores: { str: 12, dex: 14, con: 14, int: 16, wis: 13, cha: 10 },
  passivePerception: 12,
  actions: [
    {
      kind: 'attack',
      name: 'Bone-Saw',
      attackBonus: 8,
      damage: '2d8+4',
      damageType: 'slashing',
      reach: 5,
      description:
        'A surgical saw the length of a forearm, run back and forth with the unhurried patience of a man who has all the time and all the bodies he needs.',
    },
    {
      kind: 'summon',
      name: 'Raise Subject',
      summonDefId: 'bonebound-test-subject',
      count: 1,
      maxActive: 2,
      cooldownRounds: 3,
      description:
        'He claps the dust from his gloves and gestures at the slab behind him. Something sewn together sits up and swings its legs over the edge.',
    },
  ],
  flavorText:
    'Aprons stiff with old work, spectacles pushed up on a high pale forehead. He regards you the way he regards everything in Spellhold: as raw material that has not yet been told what it is for.',
});
