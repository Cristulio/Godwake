import { describe, it, expect } from 'vitest';
import { BlessingGodSchema, BLESSING_GOD_GLYPH, BLESSING_GOD_LABEL } from './blessing';
import { listBlessings } from '../content/blessings';

const GODS = BlessingGodSchema.options;

describe('BLESSING_GOD_GLYPH', () => {
  it('maps every god to a single-character glyph', () => {
    for (const god of GODS) {
      const glyph = BLESSING_GOD_GLYPH[god];
      expect(glyph, `glyph for ${god}`).toBeTruthy();
      expect([...glyph], `glyph for ${god} is one symbol`).toHaveLength(1);
    }
  });

  it('gives each god a distinct mark so blessings are tellable apart', () => {
    const glyphs = GODS.map((g) => BLESSING_GOD_GLYPH[g]);
    expect(new Set(glyphs).size).toBe(GODS.length);
  });

  it('covers every god that appears in the live blessing pool', () => {
    for (const b of listBlessings()) {
      expect(BLESSING_GOD_GLYPH[b.god], `glyph for ${b.god} (${b.id})`).toBeTruthy();
      expect(BLESSING_GOD_LABEL[b.god], `label for ${b.god} (${b.id})`).toBeTruthy();
    }
  });
});
