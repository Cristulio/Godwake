import { MonsterSchema, type Monster } from '../../schemas/monster';

/**
 * Warden Lictor — Ch3 ELITE leader, the senior Veiled Court warden who runs the
 * gallery patrols (with a slayer-hound at heel) and walks the graded prisoners.
 * Where the apprentice just dispels, the lictor SUPPRESSES: a Suppression Brand
 * that `debuff`s (weakened — a flat bite out of the player's weapon damage while
 * it holds) on DC 13, so the slayer-hound or the mad-mage beside her does its
 * work against a player whose blows have gone soft. Distinct from the chapter's
 * sage (paralyze) / fleshwright (summon) / sphere (ward); below the Director boss
 * (no phase, no execution). Conservative magnitudes pending the sim pass.
 */
export const WARDEN_LICTOR: Monster = MonsterSchema.parse({
  id: 'warden-lictor',
  name: 'Warden Lictor',
  cr: '4',
  size: 'medium',
  creatureType: 'humanoid (human)',
  ac: 18,
  maxHp: 72,
  speed: 30,
  abilityScores: { str: 11, dex: 14, con: 14, int: 16, wis: 15, cha: 13 },
  passivePerception: 13,
  actions: [
    {
      kind: 'debuff',
      name: 'Suppression Brand',
      condition: 'weakened',
      saveDC: 13,
      saveAbility: 'con',
      durationRounds: 2,
      amount: 3,
      description:
        'She sets a thumb of grey light against your sternum like a clerk stamping a docket, and the strength goes out of the stamp and into the floor — your next blows arrive already apologising.',
    },
    {
      kind: 'attack',
      name: 'Dispelling Lance',
      attackBonus: 7,
      damage: '2d8+5',
      damageType: 'force',
      range: [60, 120],
      description:
        'A flat grey lance of unmaking, the wand-work the wardens use to strip a prisoner of whatever they smuggled in — turned, with no change of expression, on you.',
    },
  ],
  resistances: ['psychic'],
  flavorText:
    'The lictors carry the Veiled Court\' authority into the cell-blocks, and the authority is mostly this: the certainty that whatever you are, they can make you less of it. She has unmade braver things than you in this gallery and crossed their names off a page already open to the next one.',
});
