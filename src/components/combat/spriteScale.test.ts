import { describe, it, expect } from 'vitest';
import { spriteSizeScale } from './spriteScale';
import { getMonster } from '../../content/monsters';

describe('spriteSizeScale', () => {
  it('scales bigger creatures up: huge > medium > small', () => {
    expect(spriteSizeScale('huge')).toBeGreaterThan(spriteSizeScale('medium'));
    expect(spriteSizeScale('medium')).toBeGreaterThan(spriteSizeScale('small'));
  });

  it('is monotonic across the full size ladder', () => {
    const ladder = (['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const).map(
      spriteSizeScale,
    );
    const ascending = [...ladder].sort((a, b) => a - b);
    expect(ladder).toEqual(ascending);
    // and strictly increasing (no two sizes share a scale)
    expect(new Set(ladder).size).toBe(ladder.length);
  });

  it('uses medium as the 1.0 baseline', () => {
    expect(spriteSizeScale('medium')).toBe(1);
  });

  it('falls back to the medium baseline for an absent size', () => {
    expect(spriteSizeScale(undefined)).toBe(1);
  });

  it('renders the huge Fire-Giant Warlord taller than a medium creature', () => {
    const warlord = getMonster('fire-giant-warlord');
    expect(warlord.size).toBe('huge');
    expect(spriteSizeScale(warlord.size)).toBeGreaterThan(spriteSizeScale('medium'));
  });
});
