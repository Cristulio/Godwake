import { describe, it, expect } from 'vitest';
import { LORE_BEATS, nextLoreBeat, type LoreBeatMeta } from './loreBeats';

function meta(over: Partial<LoreBeatMeta> = {}): LoreBeatMeta {
  return {
    delveCount: 0,
    chaptersCleared: 0,
    seenDialogueBeats: [],
    knownNpcs: [],
    ...over,
  };
}

/**
 * Walk the arc the way the descent trigger does: each step plays the next beat
 * and marks it seen. `maxedOut` lets a veteran see every gate satisfied.
 */
function walk(m: LoreBeatMeta, steps = 100): string[] {
  const seen = [...m.seenDialogueBeats];
  const played: string[] = [];
  for (let i = 0; i < steps; i++) {
    const beat = nextLoreBeat({ ...m, seenDialogueBeats: seen });
    if (!beat) break;
    played.push(beat.id);
    seen.push(beat.id);
  }
  return played;
}

describe('LORE_BEATS registry invariants', () => {
  it('has a sane size and unique, stable ids', () => {
    expect(LORE_BEATS.length).toBeGreaterThanOrEqual(28);
    expect(LORE_BEATS.length).toBeLessThanOrEqual(36);
    const ids = LORE_BEATS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every beat is short and non-empty', () => {
    for (const b of LORE_BEATS) {
      expect(b.text.trim().length).toBeGreaterThan(0);
      expect(b.text.length).toBeLessThan(360);
    }
  });

  it('reveals exactly one name per soul-bond NPC, Imoen before Irenicus', () => {
    const reveals = LORE_BEATS.filter((b) => b.reveals);
    const imoenIdx = LORE_BEATS.findIndex((b) => b.reveals === 'imoen');
    const irenicusIdx = LORE_BEATS.findIndex((b) => b.reveals === 'irenicus');
    expect(reveals.filter((b) => b.reveals === 'imoen')).toHaveLength(1);
    expect(reveals.filter((b) => b.reveals === 'irenicus')).toHaveLength(1);
    expect(imoenIdx).toBeGreaterThanOrEqual(0);
    expect(irenicusIdx).toBeGreaterThan(imoenIdx);
  });

  it('the Irenicus reveal lands just before the Ch11 confrontation (after clearing Ch10)', () => {
    const reveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;
    // Withheld until Suldanessellar (Ch10) is cleared — one descent shy of the
    // Chapter 11 fight where the boss puts a face to the name.
    expect(reveal.minChapters).toBe(10);
    // ...and Imoen delivers it (his name learned through her, not from him).
    expect(reveal.speaker).toBe('imoen');
    // The reveal line actually states the name — that IS the reveal moment.
    expect(reveal.text).toContain('Irenicus');
  });

  it('no beat before the Irenicus reveal states his name', () => {
    const irenicusIdx = LORE_BEATS.findIndex((b) => b.reveals === 'irenicus');
    for (let i = 0; i < irenicusIdx; i++) {
      expect(LORE_BEATS[i].text).not.toContain('Irenicus');
    }
  });
});

describe('nextLoreBeat — strict in-order, one at a time', () => {
  it('returns null when no beat is eligible yet', () => {
    expect(nextLoreBeat(meta())).toBeNull();
  });

  it('returns the first unseen beat once eligible, and advances one at a time', () => {
    const m = meta({ delveCount: 1 });
    const first = nextLoreBeat(m);
    expect(first?.id).toBe(LORE_BEATS[0].id);
    // Marking it seen yields the next eligible beat, not the same one.
    const second = nextLoreBeat({ ...m, seenDialogueBeats: [first!.id] });
    expect(second?.id).not.toBe(first?.id);
  });

  it('does NOT leapfrog an unseen-but-ineligible predecessor', () => {
    // Far enough into chapters that deep beats are eligible, but the early
    // delve-gated beats are unseen and (delveCount 1) ineligible past beat 1.
    const m = meta({ delveCount: 1, chaptersCleared: 4 });
    const played = walk(m);
    // Only the delveCount-1 beats can play; the moment an unseen beat needs
    // more delves, the arc stops — later chapter-eligible beats do not jump it.
    const firstBlocked = LORE_BEATS.find((b) => (b.minDelves ?? 0) > 1);
    expect(played).not.toContain(firstBlocked!.id);
    expect(played[0]).toBe(LORE_BEATS[0].id);
  });
});

describe('nextLoreBeat — name reveal gating', () => {
  it('does not surface the Irenicus reveal before Suldanessellar (Chapter 10) is cleared', () => {
    // Maxed delves, nine chapters cleared: the arc advances deep into his machine
    // but never reaches the pre-confrontation reveal beat.
    const played = walk(meta({ delveCount: 999, chaptersCleared: 9 }));
    const irenicusReveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;
    expect(played).not.toContain(irenicusReveal.id);
  });

  it('surfaces the Imoen reveal early (delve-gated, no chapter clear needed)', () => {
    const played = walk(meta({ delveCount: 999, chaptersCleared: 0 }));
    const imoenReveal = LORE_BEATS.find((b) => b.reveals === 'imoen')!;
    expect(played).toContain(imoenReveal.id);
  });

  it('reveals Irenicus once the arc is walked into the endgame (Ch10+)', () => {
    const played = walk(meta({ delveCount: 999, chaptersCleared: 14 }));
    const irenicusReveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;
    expect(played).toContain(irenicusReveal.id);
    // Fully maxed → the whole arc eventually plays, in registry order.
    expect(played).toEqual(LORE_BEATS.map((b) => b.id));
  });
});

describe('LORE_BEATS — the arc spans the whole chapter chain (1→14)', () => {
  it('chapter gates are non-decreasing in registry order (strict in-order holds)', () => {
    let prev = 0;
    for (const b of LORE_BEATS) {
      const gate = b.minChapters ?? 0;
      expect(gate).toBeGreaterThanOrEqual(prev);
      prev = gate;
    }
  });

  it('every chapter band 1→14 has at least one beat gated to it (no narrative gaps)', () => {
    const gates = new Set(LORE_BEATS.map((b) => b.minChapters ?? 0));
    for (let c = 1; c <= 14; c++) {
      expect(gates.has(c)).toBe(true);
    }
  });

  it('the through-line reaches the finale (a beat gated to clearing Chapter 14)', () => {
    const finale = LORE_BEATS.filter((b) => (b.minChapters ?? 0) === 14);
    expect(finale.length).toBeGreaterThanOrEqual(1);
    // It is the last beat in the arc — it hands off to the ending, nothing after.
    const lastGate = LORE_BEATS[LORE_BEATS.length - 1].minChapters ?? 0;
    expect(lastGate).toBe(14);
  });

  it('clearing the whole chain unfolds the full back half, one beat per descent', () => {
    // A veteran who has cleared all 14 chapters walks every beat, in order, and
    // each call hands back exactly one (the trigger marks it seen to advance).
    const played = walk(meta({ delveCount: 999, chaptersCleared: 14 }));
    expect(played).toEqual(LORE_BEATS.map((b) => b.id));
    // A run that has only cleared Chapter 9 sees the Godwake bridge but never the
    // Suldanessellar reveal or anything past it.
    const mid = walk(meta({ delveCount: 999, chaptersCleared: 9 }));
    expect(mid).toContain('lore-22-no-seam');
    expect(mid).not.toContain('lore-24-the-vein-named');
    expect(mid).not.toContain('lore-30-choose-it-as-yourself');
  });
});

describe('nextLoreBeat — veterans get one beat per descent, never a wall', () => {
  it('a maxed veteran is handed exactly one beat per call', () => {
    const m = meta({ delveCount: 999, chaptersCleared: 14 });
    const a = nextLoreBeat(m)!;
    expect(a.id).toBe(LORE_BEATS[0].id);
    // The selector itself never returns more than one; the trigger must mark
    // seen to advance. Re-calling without marking returns the SAME head.
    const again = nextLoreBeat(m)!;
    expect(again.id).toBe(a.id);
  });

  it('once every beat is seen, returns null', () => {
    const all = LORE_BEATS.map((b) => b.id);
    expect(nextLoreBeat(meta({ delveCount: 999, chaptersCleared: 14, seenDialogueBeats: all }))).toBeNull();
  });
});
