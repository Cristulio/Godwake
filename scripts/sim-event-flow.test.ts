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
    // bluff-the-cowl is now a deception skill check: pass odds must rise with
    // CHA, never invert, and stay a real gamble at both ends (nat-20 / nat-1).
    const cha8 = rep.cha.find((r) => r.cha === 8);
    const cha18 = rep.cha.find((r) => r.cha === 18);
    expect(cha8, 'CHA 8 row present').toBeDefined();
    expect(cha18, 'CHA 18 row present').toBeDefined();
    expect(cha18!.bonus, 'higher CHA → higher deception bonus').toBeGreaterThan(cha8!.bonus);
    expect(cha18!.passPct, 'higher CHA → better odds').toBeGreaterThan(cha8!.passPct);
    expect(cha8!.passPct, 'even a weak build can crit through (nat-20)').toBeGreaterThan(0);
    expect(cha18!.passPct, 'even a strong build can flop (nat-1)').toBeLessThan(1);
    for (let i = 1; i < rep.cha.length; i++) {
      expect(rep.cha[i].bonus, 'deception bonus is monotonic in CHA').toBeGreaterThanOrEqual(
        rep.cha[i - 1].bonus,
      );
    }
    const wizard = rep.bluffByPreset.find((r) => /Wizard/i.test(r.preset));
    expect(wizard?.bonus, 'default tiefling Wizard brings a positive deception bonus').toBeGreaterThan(0);
    const waukeenLeaks = rep.delveCells.reduce((s, c) => s + c.waukeenLeakCount, 0);
    expect(waukeenLeaks, 'no Waukeen-in-non-Waukeen-event surfacings').toBe(0);
  });
});
