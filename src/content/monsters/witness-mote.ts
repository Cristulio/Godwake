import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Witness-Mote — Chapter 3 swarm minion, the lesser "gazer" the Hollow Gaze
 * sheds from its crown of stalks (and that the Sphere pools spawn 2-3 at a time
 * to read as a drifting swarm without a per-monster swarm rule). A single
 * floating eye, paper-thin HP, one weak psychic glimmer-ray. Burst them before
 * the tyrant tops the cap back up.
 */
export const WITNESS_MOTE: Monster = MonsterSchema.parse({
  id: 'witness-mote',
  name: 'Witness-Mote',
  cr: '1',
  size: 'small',
  creatureType: 'aberration',
  ac: 15,
  maxHp: 28,
  speed: 0,
  abilityScores: { str: 6, dex: 15, con: 12, int: 6, wis: 12, cha: 7 },
  passivePerception: 11,
  actions: [
    {
      kind: 'attack',
      name: 'Glimmer-Ray',
      attackBonus: 5,
      damage: '1d8+3',
      damageType: 'psychic',
      range: [30, 60],
      description:
        'The little eye fixes on you, its pinprick pupil flaring, and spits a thread of cold light that lands somewhere behind your forehead.',
    },
  ],
  flavorText:
    'No bigger than a fist, all pupil and a wet rim of lashes, it drifts the asylum corridors on no errand but to see. It cannot hurt you much. It is only here to make sure the thing in the dark below knows exactly where you are.',
});
