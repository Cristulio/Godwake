import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Godsblood Welter — Ch5 mid strength-sapper. A welling mass of the dead god's
 * ichor that has learned, dimly, to move toward warmth. `debuff` → weakened
 * (CON save: the ichor leaches the strength out of your blows, -4 weapon damage)
 * then dissolves at you with an acid pseudopod. The longer it has you weakened,
 * the less the fight is worth swinging. Resists acid; it is acid.
 */
export const GODSBLOOD_WELTER: Monster = MonsterSchema.parse({
  id: 'godsblood-welter',
  name: 'Godsblood Welter',
  cr: '5',
  size: 'large',
  creatureType: 'ooze',
  ac: 14,
  maxHp: 62,
  speed: 20,
  abilityScores: { str: 16, dex: 8, con: 18, int: 3, wis: 10, cha: 5 },
  passivePerception: 10,
  resistances: ['acid', 'necrotic'],
  actions: [
    {
      kind: 'debuff',
      name: 'Leaching Ichor',
      condition: 'weakened',
      saveDC: 14,
      saveAbility: 'con',
      durationRounds: 2,
      amount: 4,
      description:
        'A film of luminous blood climbs your arms before you can step back, and where it touches, the strength runs out of the muscle like water out of a cracked jar.',
    },
    {
      kind: 'attack',
      name: 'Dissolving Pseudopod',
      attackBonus: 7,
      damage: '2d8+3',
      damageType: 'acid',
      reach: 10,
      description:
        'A limb of bright fluid lifts, arcs, and comes down across you, and it keeps eating after it lands.',
    },
  ],
  flavorText:
    "When a god dies, the blood does not stop being divine — it only stops being commanded. This is a poolful of it, gone slow and hungry and faintly, horribly radiant, dragging itself across the floor of the Godwake toward anything still warm. It remembers being part of something vast. It is trying, in the only way left to it, to put you inside that memory.",
});
