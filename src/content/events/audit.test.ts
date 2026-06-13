import { describe, it, expect } from 'vitest';
import { listEvents } from './index';
import { riskFreeGambles } from './audit';

describe('events — no risk-free gambles (events-overhaul gate)', () => {
  it('every skill-check / chance option carries a real cost on failure', () => {
    const offenders = listEvents()
      .map((ev) => ({ id: ev.id, bad: riskFreeGambles(ev).map((c) => c.label) }))
      .filter((e) => e.bad.length > 0);
    // A gated option that costs nothing on failure is a free shot at the reward —
    // the Slay-the-Spire "?" room never gives that. Every gamble must bite when lost.
    expect(offenders, `risk-free gambles found:\n${JSON.stringify(offenders, null, 2)}`).toEqual([]);
  });
});
