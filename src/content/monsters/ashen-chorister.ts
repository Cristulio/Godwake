import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Ashen Chorister — Ch5 warmup/early-mid fear-controller. One voice of the dead
 * god's choir, still singing the hymn that wakes it. Opens with the death-hymn
 * (`debuff` → frightened, WIS save: the player attacks at disadvantage) then
 * burns at reach with hymn-fire. Drop it fast or fight the rest of the room
 * half-blind with dread.
 */
export const ASHEN_CHORISTER: Monster = MonsterSchema.parse({
  id: 'ashen-chorister',
  name: 'Ashen Chorister',
  cr: '4',
  size: 'medium',
  creatureType: 'celestial',
  ac: 14,
  maxHp: 54,
  speed: 30,
  abilityScores: { str: 11, dex: 14, con: 14, int: 12, wis: 16, cha: 17 },
  passivePerception: 13,
  resistances: ['radiant'],
  actions: [
    {
      kind: 'debuff',
      name: 'The Waking Hymn',
      condition: 'frightened',
      saveDC: 14,
      saveAbility: 'wis',
      durationRounds: 2,
      description:
        'It opens a mouth full of grey ash and sings one sustained note, and the note is the sound a thing makes when it is glad to be dying. Something very old in you wants to lie down and let it finish.',
    },
    {
      kind: 'attack',
      name: 'Hymn-Fire',
      attackBonus: 8,
      damage: '2d8+3',
      damageType: 'radiant',
      range: [40, 80],
      description:
        'It lifts a hand and the air in front of you takes light — not warm, the wrong colour for warmth — and the light lands on you like a verdict.',
    },
  ],
  flavorText:
    "A robed celestial burnt to the colour of cooled ash, the halo above it gone to a ring of soot. It was beautiful once, in the way the words on a tomb are beautiful. It does not see you as an enemy. It sees you as a latecomer to a song that has been going a very long time, and it is making room in the verse.",
});
