import { describe, test, expect } from 'vitest';

import {
  runMatrix,
  summarizeMatrix,
  renderFindings,
  writeFindings,
} from './sim-fighter';

const RUN_SIM = process.env.RUN_SIM === '1';

describe('Fighter sim — Champion across L1/L3/L5/L7', () => {
  test.runIf(RUN_SIM)('runs 50 × 4 cells and writes findings', () => {
    const matrix = runMatrix([1, 3, 5, 7], 50);
    expect(matrix.cells).toHaveLength(4);
    for (const cell of matrix.cells) {
      expect(cell.runs.length).toBe(50);
    }
    const label = process.env.SIM_LABEL ?? 'baseline';
    const filename = process.env.SIM_OUT ?? 'fighter-balance.md';
    const content = renderFindings(label, matrix);
    const path = writeFindings(content, filename);
    // Surface a console line so we can read the headline numbers without
    // re-opening the markdown.
    const agg = summarizeMatrix(matrix);
    // eslint-disable-next-line no-console
    console.log(`[sim-fighter] wrote ${path}`);
    for (const a of agg) {
      // eslint-disable-next-line no-console
      console.log(
        `[sim-fighter] L${a.startLevel}: deaths=${(a.deathRate * 100).toFixed(0)}% chapters=${a.meanChapters.toFixed(2)} rounds/combat=${a.meanRoundsPerCombat.toFixed(2)} hit=${(a.hitRate * 100).toFixed(0)}% crit=${(a.critRate * 100).toFixed(0)}% SW=${a.meanSecondWind.toFixed(2)} AS=${a.meanActionSurge.toFixed(2)}`,
      );
    }
  }, 600_000);

  test('runMatrix is callable (smoke — 1 run)', () => {
    const matrix = runMatrix([1], 1);
    expect(matrix.cells[0].runs[0].startLevel).toBe(1);
    expect(matrix.cells[0].runs[0].roomsCleared).toBeGreaterThanOrEqual(0);
  }, 60_000);
});
