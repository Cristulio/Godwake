import { describe, it, expect } from 'vitest';
import {
  chapterGoldRamp,
  chapterHpRamp,
  eventGoldScale,
  eventHpScale,
  scaleGold,
  EVENT_GOLD_CH14_MULTIPLE,
  EVENT_HP_CH14_MULTIPLE,
} from './eventGoldScale';

describe('chapterGoldRamp', () => {
  it('is ×1 at Ch1 and the configured multiple at Ch14', () => {
    expect(chapterGoldRamp(1)).toBe(1);
    expect(chapterGoldRamp(14)).toBeCloseTo(EVENT_GOLD_CH14_MULTIPLE, 6);
  });

  it('climbs monotonically across the chain', () => {
    for (let ch = 1; ch < 14; ch++) {
      expect(chapterGoldRamp(ch + 1)).toBeGreaterThan(chapterGoldRamp(ch));
    }
  });

  it('clamps out-of-range chapters to the Ch1..Ch14 endpoints', () => {
    expect(chapterGoldRamp(0)).toBe(1);
    expect(chapterGoldRamp(-5)).toBe(1);
    expect(chapterGoldRamp(20)).toBeCloseTo(EVENT_GOLD_CH14_MULTIPLE, 6);
  });
});

describe('chapterGoldRamp — early slope flattened, Ch5-14 kept on the linear ramp', () => {
  const linear = (ch: number) => 1 + (ch - 1) * ((EVENT_GOLD_CH14_MULTIPLE - 1) / 13);

  it('keeps Ch5..Ch14 exactly on the original linear ramp', () => {
    for (let ch = 5; ch <= 14; ch++) {
      expect(chapterGoldRamp(ch)).toBeCloseTo(linear(ch), 6);
    }
  });

  it('bows Ch2..Ch4 below the linear ramp so early events do not out-earn a fight', () => {
    for (let ch = 2; ch <= 4; ch++) {
      expect(chapterGoldRamp(ch)).toBeLessThan(linear(ch));
    }
  });

  it('cools the hot Ch3 spot: a Ch1-authored event seen at Ch3 scales well under the old ~1.77×', () => {
    expect(eventGoldScale(3, 1)).toBeLessThan(1.5);
  });
});

describe('eventGoldScale — anchored at the event floor', () => {
  it('is exactly 1 when an event fires at its own minChapter', () => {
    expect(eventGoldScale(1, 1)).toBe(1);
    expect(eventGoldScale(7, 7)).toBe(1);
    expect(eventGoldScale(11, 11)).toBe(1);
  });

  it('a Ch1-authored event grows the full ramp by the endgame', () => {
    expect(eventGoldScale(14, 1)).toBeCloseTo(EVENT_GOLD_CH14_MULTIPLE, 6);
  });

  it('yields meaningfully more in a deep chapter than a shallow one (same Ch1 template)', () => {
    const deep = eventGoldScale(12, 1);
    const shallow = eventGoldScale(2, 1);
    expect(deep).toBeGreaterThan(shallow);
    // Several-fold richer — a flat +25 stops being pocket lint at depth.
    expect(deep / shallow).toBeGreaterThan(3);
  });

  it('a deep-authored event barely moves — no double-counting into a jackpot', () => {
    // A Ch11 beat already hands out big numbers by hand; appearing at Ch11..14
    // it scales only modestly, never multiplied off a phantom Ch1 baseline.
    expect(eventGoldScale(11, 11)).toBe(1);
    expect(eventGoldScale(14, 11)).toBeLessThan(1.35);
    // Contrast: scaling it from Ch1 would be the ~6x jackpot we avoid.
    expect(eventGoldScale(14, 1)).toBeGreaterThan(5);
  });

  it('is never below 1 for any valid placement (chapter >= baseChapter)', () => {
    for (let base = 1; base <= 14; base++) {
      for (let ch = base; ch <= 14; ch++) {
        expect(eventGoldScale(ch, base)).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('chapterHpRamp / eventHpScale — HP rides the same shape, a hotter height', () => {
  it('is ×1 at Ch1 and the HP multiple at Ch14', () => {
    expect(chapterHpRamp(1)).toBe(1);
    expect(chapterHpRamp(14)).toBeCloseTo(EVENT_HP_CH14_MULTIPLE, 6);
  });

  it('climbs monotonically and hotter than gold (HP pools climb harder)', () => {
    for (let ch = 1; ch < 14; ch++) {
      expect(chapterHpRamp(ch + 1)).toBeGreaterThan(chapterHpRamp(ch));
    }
    expect(EVENT_HP_CH14_MULTIPLE).toBeGreaterThan(EVENT_GOLD_CH14_MULTIPLE);
    expect(chapterHpRamp(14)).toBeGreaterThan(chapterGoldRamp(14));
  });

  it('anchors at the event floor exactly like gold (no double-count for deep events)', () => {
    expect(eventHpScale(1, 1)).toBe(1);
    expect(eventHpScale(11, 11)).toBe(1);
    expect(eventHpScale(14, 1)).toBeCloseTo(EVENT_HP_CH14_MULTIPLE, 6);
    expect(eventHpScale(14, 11)).toBeLessThan(1.5);
  });

  it('keeps a Ch1 heal a meaningful slice deep instead of going stale', () => {
    // A flat +5 Ch1 heal grows several-fold by the endgame rather than staying +5.
    expect(eventHpScale(12, 1)).toBeGreaterThan(3);
    expect(eventHpScale(12, 1)).toBeGreaterThan(eventHpScale(2, 1));
  });
});

describe('scaleGold', () => {
  it('rounds to whole gold and preserves sign', () => {
    expect(scaleGold(30, 6)).toBe(180);
    expect(scaleGold(-40, 2)).toBe(-80);
    expect(scaleGold(0, 5)).toBe(0);
  });

  it('scales a reward and its matching cost by the same factor (pay-X-for-Y unit)', () => {
    const scale = eventGoldScale(8, 3); // a Ch3 gamble seen at Ch8
    expect(scaleGold(-40, scale)).toBe(-scaleGold(40, scale));
  });

  it('is identity at scale 1', () => {
    expect(scaleGold(25, 1)).toBe(25);
    expect(scaleGold(-15, 1)).toBe(-15);
  });
});
