import { describe, it, expect } from 'vitest';
import {
  selectSoulVoiceLine,
  progressionTier,
  ARC_QUOTES,
  CHAPTER_CLEAR,
  type VoiceProgression,
} from './IrenicusTaunt';

const base: VoiceProgression = {
  chaptersCleared: 0,
  deathCount: 0,
  hasReincarnated: false,
  seed: 0,
};

describe('progressionTier', () => {
  it('maps chapters cleared to early / mid / late', () => {
    expect(progressionTier(0)).toBe('early');
    expect(progressionTier(1)).toBe('mid');
    expect(progressionTier(2)).toBe('mid');
    expect(progressionTier(3)).toBe('late');
    expect(progressionTier(4)).toBe('late');
  });
});

describe('selectSoulVoiceLine — arc contexts evolve with progress', () => {
  it('early and late draw from different (disjoint) pools', () => {
    // Every seed in the early pool lands in early; every seed in late lands in late.
    for (const speaker of ['irenicus', 'imoen'] as const) {
      for (const context of ['idle', 'death', 'rest', 'victory', 'low-hp'] as const) {
        const earlyPool = ARC_QUOTES[speaker][context].early;
        const latePool = ARC_QUOTES[speaker][context].late;
        // Pools must be disjoint so the tiers are actually distinguishable.
        expect(earlyPool.some((l) => latePool.includes(l))).toBe(false);

        for (let seed = 0; seed < 12; seed++) {
          const early = selectSoulVoiceLine(speaker, context, {
            ...base,
            chaptersCleared: 0,
            seed,
          });
          const late = selectSoulVoiceLine(speaker, context, {
            ...base,
            chaptersCleared: 4,
            seed,
          });
          expect(earlyPool).toContain(early);
          expect(latePool).toContain(late);
          expect(early).not.toBe(late);
        }
      }
    }
  });

  it('mid sits between early and late', () => {
    const line = selectSoulVoiceLine('imoen', 'idle', { ...base, chaptersCleared: 2, seed: 1 });
    expect(ARC_QUOTES.imoen.idle.mid).toContain(line);
  });

  it('is deterministic for a fixed seed and progression', () => {
    const a = selectSoulVoiceLine('irenicus', 'death', { ...base, chaptersCleared: 1, seed: 7 });
    const b = selectSoulVoiceLine('irenicus', 'death', { ...base, chaptersCleared: 1, seed: 7 });
    expect(a).toBe(b);
  });
});

describe('selectSoulVoiceLine — chapter-clear matches the cleared chapter', () => {
  it('returns a line from the chapter actually cleared', () => {
    for (const speaker of ['irenicus', 'imoen'] as const) {
      for (const chapter of [1, 2, 3, 4]) {
        for (let seed = 0; seed < 8; seed++) {
          const line = selectSoulVoiceLine(speaker, 'chapter-clear', {
            ...base,
            clearedChapter: chapter,
            // Stale high-water mark must NOT override the chapter just cleared.
            chaptersCleared: 4,
            seed,
          });
          expect(CHAPTER_CLEAR[speaker][chapter]).toContain(line);
        }
      }
    }
  });

  it('Velnaris names the right chapter (Athkatla for ch2, Ust Natha for ch4)', () => {
    const ch2 = selectSoulVoiceLine('irenicus', 'chapter-clear', {
      ...base,
      clearedChapter: 2,
      seed: 0,
    });
    expect(ch2).toContain('Athkatla');
    const ch4 = selectSoulVoiceLine('irenicus', 'chapter-clear', {
      ...base,
      clearedChapter: 4,
      seed: 0,
    });
    expect(ch4).toContain('Ust Natha');
  });

  it('clamps out-of-range chapters and falls back to chaptersCleared', () => {
    const high = selectSoulVoiceLine('irenicus', 'chapter-clear', {
      ...base,
      clearedChapter: 99,
      seed: 0,
    });
    expect(CHAPTER_CLEAR.irenicus[4]).toContain(high);

    // No clearedChapter threaded → fall back to the high-water mark.
    const fallback = selectSoulVoiceLine('imoen', 'chapter-clear', {
      ...base,
      chaptersCleared: 3,
      seed: 0,
    });
    expect(CHAPTER_CLEAR.imoen[3]).toContain(fallback);
  });
});
