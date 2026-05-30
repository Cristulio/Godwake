import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Deathless Penitent — Ch5 mid self-sustainer. A worshipper the cycle will not
 * let die: every wound it earns kneeling, it heals kneeling. `sustain` (self,
 * 2d6, cooldown 1) once it drops below half, so chip damage slides off. Resists
 * necrotic, but the stitching is force-bound — `force` damage cuts the thread
 * and the healing stops. Burn it down in one push or it outlasts you.
 */
export const DEATHLESS_PENITENT: Monster = MonsterSchema.parse({
  id: 'deathless-penitent',
  name: 'Deathless Penitent',
  cr: '5',
  size: 'medium',
  creatureType: 'undead',
  ac: 15,
  maxHp: 54,
  speed: 30,
  abilityScores: { str: 16, dex: 12, con: 17, int: 7, wis: 14, cha: 8 },
  passivePerception: 12,
  resistances: ['necrotic'],
  vulnerabilities: ['force'],
  actions: [
    {
      kind: 'attack',
      name: 'Penitent\'s Flail',
      attackBonus: 7,
      damage: '2d8+3',
      damageType: 'necrotic',
      reach: 5,
      description:
        'It scourges you the way it scourges itself, head bowed, no anger in it — a devotion that happens to land on your body instead of its own.',
    },
    {
      kind: 'sustain',
      name: 'The Cycle Reknits',
      target: 'self',
      heal: '2d6',
      cooldownRounds: 1,
      description:
        'The wounds you opened seal in seams of cold light, and it sinks a little lower in its kneel, grateful, as the cycle takes back what you tried to give it.',
    },
  ],
  flavorText:
    "It has knelt here long enough that the floor has worn to fit its knees. Every time a pilgrim before you cut it down, it rose again, thanked them, and resumed the prayer. The scars do not accumulate; the cycle keeps it new. It is the most pious thing in the Godwake and the most damned, and it cannot tell the two apart anymore.",
});
