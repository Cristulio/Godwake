import { describe, it } from 'vitest';
import { runAudit, renderReport, writeReport } from './sim-events';

describe('event mechanic audit', () => {
  it('runs the matrix and writes the report', () => {
    const rep = runAudit();
    const md = renderReport(rep);
    const path = writeReport(md);
    // eslint-disable-next-line no-console
    console.log(`\nWrote ${path}\n${md}`);
  });
});
