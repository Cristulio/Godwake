/**
 * Encounter-stress matrix runner. Skipped by default — runs only when
 * RUN_SIM=1 is set in env. Writes findings to docs/sim-findings/ and prints
 * outlier summary to stdout.
 *
 * Invoke directly:
 *   RUN_SIM=1 npx vitest run src/test/sim/encounterStress.sim.test.ts
 */
import { describe, it, expect } from 'vitest';
import { runMatrix, findOutliers, renderReport, writeReport } from './encounterStress.matrix';

const ENABLED = process.env.RUN_SIM === '1';
const RUNS_PER_CELL = Number.parseInt(process.env.SIM_RUNS ?? '30', 10);

describe('encounter stress matrix', () => {
  it.skipIf(!ENABLED)('runs the matrix and writes findings', () => {
    const start = Date.now();
    const rows = runMatrix(RUNS_PER_CELL);
    const outliers = findOutliers(rows);
    const report = renderReport(rows, outliers);
    const filePath = writeReport('encounter-stress.md', report);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`\nSim wrote ${rows.length} rows × 3 classes × ${RUNS_PER_CELL} runs in ${elapsed}s`);
    console.log(`Report: ${filePath}`);
    console.log('\nTop outliers:');
    for (const o of outliers.slice(0, 12)) {
      console.log(`  [${o.kind}] Ch${o.row.chapter} ${o.row.slot} — ${o.row.encounterTitle} (${o.row.monsters}) — ${o.detail}`);
    }

    expect(rows.length).toBeGreaterThan(0);
  }, 240_000);
});
