import { describe, it, expect } from 'vitest';
import { runFlowAudit, renderReport, writeReport } from './sim-event-flow';

describe('event-flow validation (PR #84 follow-up)', () => {
  it('runs the matrix and writes the findings doc', () => {
    const rep = runFlowAudit();
    const md = renderReport(rep);
    const path = writeReport(md);
    // eslint-disable-next-line no-console
    console.log(`\nWrote ${path}`);

    // Hard assertions — fail the test loudly if any of the three PR #84
    // changes regress.
    for (const f of rep.fallback) {
      expect(f.matchedExpected, `${f.eventId}.${f.choiceId} fallback wording`).toBe(true);
      expect(f.waukeenInWrongContext, `${f.eventId} Waukeen leak`).toBe(false);
    }
    for (const g of rep.grant) {
      expect(g.goldDeltaConsistent, `${g.eventId} +5g consistency`).toBe(true);
      expect(g.fallbackFiredCount).toBe(g.trials);
    }
    const cha12 = rep.cha.find((r) => r.cha === 12);
    expect(cha12?.bluffAllowed, 'CHA 12 should clear bluff gate').toBe(true);
    const cha10 = rep.cha.find((r) => r.cha === 10);
    expect(cha10?.bluffAllowed, 'CHA 10 should still be blocked').toBe(false);
    const wizard = rep.bluffByPreset.find((r) => /Wizard/i.test(r.preset));
    expect(wizard?.bluffAllowed, 'default tiefling Wizard should clear').toBe(true);
    const waukeenLeaks = rep.delveCells.reduce((s, c) => s + c.waukeenLeakCount, 0);
    expect(waukeenLeaks, 'no Waukeen-in-non-Waukeen-event surfacings').toBe(0);
  });
});
