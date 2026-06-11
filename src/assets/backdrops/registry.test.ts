import { describe, expect, it } from 'vitest';
import { backdropFor } from './registry';

describe('backdropFor', () => {
  it('resolves every authored chapter 1-2 scene', () => {
    for (const chapter of [1, 2]) {
      for (const kind of ['combat', 'elite', 'boss', 'event'] as const) {
        expect(backdropFor(chapter, kind), `ch${chapter}-${kind}`).toMatch(/\.svg$/);
      }
    }
  });

  it('maps rest rooms onto the chapter event scene', () => {
    expect(backdropFor(1, 'rest')).toBe(backdropFor(1, 'event'));
  });

  it('falls back to undefined for unauthored chapters and missing chapter tags', () => {
    expect(backdropFor(3, 'combat')).toBeUndefined();
    expect(backdropFor(14, 'boss')).toBeUndefined();
    expect(backdropFor(undefined, 'combat')).toBeUndefined();
    expect(backdropFor(0, 'combat')).toBeUndefined();
  });
});
