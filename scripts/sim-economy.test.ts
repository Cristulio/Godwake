import { describe, test, expect } from 'vitest';

import {
  runMatrix,
  summarizeMatrix,
  renderFindings,
  writeFindings,
  runOnce,
} from './sim-economy';

const RUN_SIM = process.env.RUN_SIM === '1';

describe('Gold economy validation — Rogue / Fighter / Wizard × L1/L3/L5', () => {
  test.runIf(RUN_SIM)('runs 30 × 9 cells and writes findings', () => {
    const matrix = runMatrix(['rogue', 'fighter', 'wizard'], [1, 3, 5], 30);
    expect(matrix.cells).toHaveLength(9);
    for (const cell of matrix.cells) {
      expect(cell.runs.length).toBe(30);
    }
    const label = process.env.SIM_LABEL ?? 'baseline (2.5× drop)';
    const filename =
      process.env.SIM_OUT ?? 'docs/playtest-findings/economy-validation.md';
    const content = renderFindings(label, matrix);
    const path = writeFindings(content, filename);

    const agg = summarizeMatrix(matrix);
    // eslint-disable-next-line no-console
    console.log(`[sim-economy] wrote ${path}`);
    for (const a of agg) {
      // eslint-disable-next-line no-console
      console.log(
        `[sim-economy] ${a.classId} L${a.startLevel}: deaths=${(a.deathRate * 100).toFixed(0)}% chapters=${a.meanChapters.toFixed(1)} gold=${Math.round(a.meanGoldEarned)} ch1End=${Math.round(a.meanGoldAtCh1End)} endGold=${Math.round(a.meanEndGold)} bossGold=${Math.round(a.meanBossGold)}`,
      );
    }
  }, 600_000);

  test('runOnce is callable (smoke — 1 fighter L1 run)', () => {
    const m = runOnce('fighter', 1, 12345);
    expect(m.classId).toBe('fighter');
    expect(m.roomsCleared).toBeGreaterThanOrEqual(0);
    // Should not crash even if the player dies.
    expect(m.goldByRoom.length).toBe(37);
  }, 60_000);
});
