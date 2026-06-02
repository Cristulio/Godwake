import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Reknitting Horror — Ch3 self-sustaining bruiser. A mass of Sphere-warped
 * tissue that closes its own wounds. Demonstrates `sustain` (target: self):
 * once it drops below half HP it knits 2d6 back each turn (cooldown 1), so
 * chip damage never sticks. Vulnerable to fire — burn it past the regen or it
 * outlasts you.
 */
export const SPHERE_ABERRATION: Monster = MonsterSchema.parse({
  id: 'sphere-aberration',
  name: 'Reknitting Horror',
  cr: '4',
  size: 'medium',
  creatureType: 'aberration',
  ac: 15,
  maxHp: 76,
  speed: 20,
  abilityScores: { str: 17, dex: 9, con: 16, int: 4, wis: 10, cha: 6 },
  passivePerception: 10,
  vulnerabilities: ['fire'],
  resistances: ['necrotic'],
  actions: [
    {
      kind: 'attack',
      name: 'Lashing Pseudopod',
      attackBonus: 8,
      damage: '2d8+5',
      damageType: 'bludgeoning',
      reach: 10,
      description:
        'A limb that was not there a moment ago whips out, hardens at the instant of impact, and is reabsorbed.',
    },
    {
      kind: 'sustain',
      name: 'Reknit',
      target: 'self',
      heal: '2d6',
      cooldownRounds: 1,
      description:
        'The wounds you opened seal themselves with a sound like wet cloth tearing in reverse. It does not seem to notice it is doing it.',
    },
  ],
  flavorText:
    'The asylum wardens stopped recording what this used to be. It is a slow grey hill of fused flesh that drags itself toward warmth and forgets, between one moment and the next, that it has ever been hurt. Only fire makes the lesson stay.',
});
