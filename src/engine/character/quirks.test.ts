import { describe, it, expect } from 'vitest';
import { createCharacter, STANDARD_ARRAY } from './initialize';
import {
  baneQuirkCount,
  baneSoulMarkWeight,
  renownSoulMarkMultiplier,
  soulMarkMultiplier,
  SOUL_MARK_PER_BANE,
} from './quirks';
import type { Character } from '../../types/character';

function make(quirks: string[]): Character {
  return {
    ...createCharacter({
      id: 'test',
      name: 'Tester',
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
    quirks,
  };
}

describe('soul-mark — bane quirks scale delve rewards', () => {
  it('no banes → 1.0x multiplier', () => {
    expect(soulMarkMultiplier(make([]))).toBe(1);
    expect(soulMarkMultiplier(make(['tymoras-eye']))).toBe(1); // boon
    expect(soulMarkMultiplier(make(['iron-stomach']))).toBe(1); // odd
  });

  it('one bane → 1 + SOUL_MARK_PER_BANE', () => {
    expect(soulMarkMultiplier(make(['glassbone']))).toBeCloseTo(1 + SOUL_MARK_PER_BANE);
  });

  it('two banes stack', () => {
    expect(soulMarkMultiplier(make(['glassbone', 'late-sleeper']))).toBeCloseTo(
      1 + 2 * SOUL_MARK_PER_BANE,
    );
  });

  it('mixed quirks — only banes count', () => {
    // hangry (boon), pinchpurse (bane), sun-touched (odd), late-sleeper (bane)
    expect(baneQuirkCount(make(['hangry', 'pinchpurse', 'sun-touched', 'late-sleeper']))).toBe(2);
  });

  it('weighted banes: limping (weight 1.5) → ×1.30 soul-mark, not ×1.20', () => {
    expect(baneSoulMarkWeight(make(['limping']))).toBeCloseTo(1.5);
    expect(soulMarkMultiplier(make(['limping']))).toBeCloseTo(1.3);
    // Default-weight bane sanity check.
    expect(baneSoulMarkWeight(make(['glassbone']))).toBeCloseTo(1.0);
    expect(soulMarkMultiplier(make(['glassbone']))).toBeCloseTo(1.2);
  });

  it('weighted banes stack: limping (1.5) + glassbone (1.0) → 1 + 0.2*2.5 = 1.50', () => {
    expect(baneSoulMarkWeight(make(['limping', 'glassbone']))).toBeCloseTo(2.5);
    expect(soulMarkMultiplier(make(['limping', 'glassbone']))).toBeCloseTo(1.5);
  });

  it('renownSoulMarkMultiplier uses weighted banes too', () => {
    // limping alone, no Grove upgrade → 1 + 0.2 * 1.5 = 1.30
    expect(renownSoulMarkMultiplier(make(['limping']))).toBeCloseTo(1.3);
  });
});
