import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import { rogueCunningActionMax } from './actions';
import type { Character } from '../../types/character';

function makeRogue(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-rogue',
      name: 'Shiv',
      raceId: 'human',
      classId: 'rogue',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5],
        dex: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
      },
      skillProficiencies: ['stealth', 'sleight-of-hand'],
    }),
    ...extra,
  };
}

describe('rogueCunningActionMax — Shadowstep bonus', () => {
  it('returns 1 for a base rogue (no subclass, no upgrade)', () => {
    expect(rogueCunningActionMax(makeRogue())).toBe(1);
  });

  it('adds permanentBonuses.cunningAction on top of the base 1', () => {
    expect(
      rogueCunningActionMax(makeRogue({ permanentBonuses: { cunningAction: 2 } })),
    ).toBe(3);
  });

  it('stacks with the Thief subclass second-use at L3', () => {
    const r = makeRogue({
      subclassId: 'thief',
      level: 3,
      permanentBonuses: { cunningAction: 1 },
    });
    expect(rogueCunningActionMax(r)).toBe(3);
  });

  it('does not apply to non-rogues', () => {
    const fighter = {
      ...createCharacter({
        id: 'test-fighter',
        name: 'Brick',
        raceId: 'human',
        classId: 'fighter',
        baseAbilityScores: {
          str: STANDARD_ARRAY[0],
          dex: STANDARD_ARRAY[2],
          con: STANDARD_ARRAY[1],
          int: STANDARD_ARRAY[5],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
        },
        skillProficiencies: ['athletics', 'perception'],
      }),
      permanentBonuses: { cunningAction: 2 },
    };
    expect(rogueCunningActionMax(fighter)).toBe(0);
  });
});

