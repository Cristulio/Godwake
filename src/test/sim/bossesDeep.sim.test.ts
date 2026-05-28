/**
 * Boss-deep validation runner. Skipped by default; runs only when RUN_SIM=1
 * is set in env. Writes the markdown report to
 * `docs/validation-findings/bosses-deep.md` and prints a short top-line.
 *
 * Invoke:
 *   RUN_SIM=1 SIM_RUNS=500 npx vitest run src/test/sim/bossesDeep.sim.test.ts
 */
import { describe, it, expect } from 'vitest';
import { runBossDeepMatrix, renderReport, writeReport } from './bossesDeep.matrix';

const ENABLED = process.env.RUN_SIM === '1';
const RUNS_PER_CELL = Number.parseInt(process.env.SIM_RUNS ?? '500', 10);

describe('boss deep matrix', () => {
  it.skipIf(!ENABLED)('runs 4 bosses × 3 classes × 2 levels × 2 loadouts', () => {
    const start = Date.now();
    const rows = runBossDeepMatrix(RUNS_PER_CELL);
    const report = renderReport(rows, RUNS_PER_CELL);
    const out = writeReport('bosses-deep.md', report);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`\nBoss-deep matrix: ${rows.length} cells × ${RUNS_PER_CELL} runs in ${elapsed}s`);
    console.log(`Report: ${out}`);
    expect(rows.length).toBeGreaterThan(0);
  }, 240_000);
});
