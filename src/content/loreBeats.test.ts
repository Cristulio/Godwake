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

  it('reveals exactly one name per soul-bond NPC, Inara before Velnaris', () => {
    const reveals = LORE_BEATS.filter((b) => b.reveals);
    const imoenIdx = LORE_BEATS.findIndex((b) => b.reveals === 'imoen');
    const irenicusIdx = LORE_BEATS.findIndex((b) => b.reveals === 'irenicus');
    expect(reveals.filter((b) => b.reveals === 'imoen')).toHaveLength(1);
    expect(reveals.filter((b) => b.reveals === 'irenicus')).toHaveLength(1);
    expect(imoenIdx).toBeGreaterThanOrEqual(0);
    expect(irenicusIdx).toBeGreaterThan(imoenIdx);
  });

  it('the Velnaris reveal lands just before the Ch11 confrontation (after clearing Ch10)', () => {
    const reveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;
    // Withheld until Tor Maladin (Ch10) is cleared — one descent shy of the
    // Chapter 11 fight where the boss puts a face to the name.
    expect(reveal.minChapters).toBe(10);
    // ...and Inara delivers it (his name learned through her, not from him).
    expect(reveal.speaker).toBe('imoen');
    // The reveal line actually states the name — that IS the reveal moment.
    expect(reveal.text).toContain('Velnaris');
  });

  it('no beat before the Velnaris reveal states his name', () => {
    const irenicusIdx = LORE_BEATS.findIndex((b) => b.reveals === 'irenicus');
    for (let i = 0; i < irenicusIdx; i++) {
      expect(LORE_BEATS[i].text).not.toContain('Velnaris');
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
  it('does not surface the Velnaris reveal before Tor Maladin (Chapter 10) is cleared', () => {
    // Maxed delves, nine chapters cleared: the arc advances deep into his machine
    // but never reaches the pre-confrontation reveal beat.
    const played = walk(meta({ delveCount: 999, chaptersCleared: 9 }));
    const irenicusReveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;
    expect(played).not.toContain(irenicusReveal.id);
  });

  it('surfaces the Inara reveal early (delve-gated, no chapter clear needed)', () => {
    const played = walk(meta({ delveCount: 999, chaptersCleared: 0 }));
    const imoenReveal = LORE_BEATS.find((b) => b.reveals === 'imoen')!;
    expect(played).toContain(imoenReveal.id);
  });

  it('reveals Velnaris once the arc is walked into the endgame (Ch10+)', () => {
    const played = walk(meta({ delveCount: 999, chaptersCleared: 14 }));
    const irenicusReveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;
    // The reveal is Inara-spoken, so it still surfaces past Velnaris's death.
    expect(irenicusReveal.speaker).toBe('imoen');
    expect(played).toContain(irenicusReveal.id);
    // Past his chapter the dead antagonist is silent: only the surviving voice
    // (Inara) plays, every beat of hers, in registry order.
    expect(played).toEqual(
      LORE_BEATS.filter((b) => b.speaker !== 'irenicus').map((b) => b.id),
    );
  });
});

describe('nextLoreBeat — the antagonist falls silent after his death (Ch12+)', () => {
  it('plays no Velnaris beat once the soul has climbed past his chapter', () => {
    const played = walk(meta({ delveCount: 999, chaptersCleared: 12 }));
    const irenicusBeats = played
      .map((id) => LORE_BEATS.find((b) => b.id === id)!)
      .filter((b) => b.speaker === 'irenicus');
    expect(irenicusBeats).toHaveLength(0);
  });

  it('still lets Inara carry the Throne-of-the Slain God arc to its finale', () => {
    // A veteran one chapter into the Throne with NONE of the arc seen still gets
    // Inara's ToB beats — the silenced antagonist beats are skipped, not blocking.
    const played = walk(meta({ delveCount: 999, chaptersCleared: 14 }));
    expect(played).toContain('lore-28-child-of-bhaal');
    expect(played).toContain('lore-30-choose-it-as-yourself');
  });

  it('does NOT silence Velnaris through his own arc — clearing Ch11 is the boundary', () => {
    // chaptersCleared === 11 is his death moment, where a final line is still his.
    const played = walk(meta({ delveCount: 999, chaptersCleared: 11 }));
    const irenicusBeats = played
      .map((id) => LORE_BEATS.find((b) => b.id === id)!)
      .filter((b) => b.speaker === 'irenicus');
    expect(irenicusBeats.length).toBeGreaterThan(0);
    // His last arc beat (the Ch11 confrontation) still plays at the boundary.
    expect(played).toContain('lore-26-end-what-the-cage-began');
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
    // A veteran who has cleared all 14 chapters walks every surviving beat, in
    // order, one per call. Past Ch11 the dead antagonist is silent, so the walk
    // is every Inara beat (his stranded beats are skipped, never blocking).
    const played = walk(meta({ delveCount: 999, chaptersCleared: 14 }));
    expect(played).toEqual(
      LORE_BEATS.filter((b) => b.speaker !== 'irenicus').map((b) => b.id),
    );
    // A run that has only cleared Chapter 9 sees the Godwake bridge but never the
    // Tor Maladin reveal or anything past it.
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
    // Past Ch11 the head is the first SURVIVING beat — the dead antagonist's
    // opening line (LORE_BEATS[0]) is silenced and skipped over.
    const firstSurviving = LORE_BEATS.find((b) => b.speaker !== 'irenicus')!;
    expect(a.id).toBe(firstSurviving.id);
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
