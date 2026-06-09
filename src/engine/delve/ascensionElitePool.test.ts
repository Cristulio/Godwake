import { describe, it, expect } from 'vitest';
import { ASCENDANT_ELITE_POOL, ascendantChapterScale } from './ascensionElitePool';
import { getMonster } from '../../content/monsters';

describe('ascendantChapterScale — chapter normalization', () => {
  it('is exactly 1.0 at the anchor chapter (10)', () => {
    expect(ascendantChapterScale(10)).toBeCloseTo(1, 5);
  });

  it('scales down below the anchor and up above it', () => {
    expect(ascendantChapterScale(1)).toBeLessThan(1);
    expect(ascendantChapterScale(14)).toBeGreaterThan(1);
  });

  it('increases monotonically across the chapter range', () => {
    for (let ch = 1; ch < 14; ch++) {
      expect(ascendantChapterScale(ch + 1)).toBeGreaterThan(ascendantChapterScale(ch));
    }
  });

  it('keeps the Ch1 slayer a clear step above Ch1 elites, never the raw CR-15 wall', () => {
    const base = getMonster('ascendant-slayer').maxHp; // ~208
    const ch1Hp = Math.round(base * ascendantChapterScale(1));
    // A normal Ch1 elite (bugbear-headsman) is ~44 HP; the scaled slayer sits a
    // step above that, not 5x it.
    expect(ch1Hp).toBeGreaterThan(getMonster('bugbear-headsman').maxHp);
    expect(ch1Hp).toBeLessThan(base / 2);
  });

  it('clamps to a sane band for stray chapter indices', () => {
    expect(ascendantChapterScale(-5)).toBeGreaterThanOrEqual(0.2);
    expect(ascendantChapterScale(99)).toBeLessThanOrEqual(2);
  });
});

describe('ASCENDANT_ELITE_POOL', () => {
  it('every entry opts into chapter scaling and stands the room alone', () => {
    expect(ASCENDANT_ELITE_POOL.length).toBeGreaterThan(0);
    for (const e of ASCENDANT_ELITE_POOL) {
      expect(e.scaleToChapter).toBe(true);
      const total = e.monsters.reduce((n, m) => n + m.count, 0);
      expect(total).toBe(1);
      // defId resolves to a real monster.
      expect(() => getMonster(e.monsters[0].defId)).not.toThrow();
    }
  });
});
