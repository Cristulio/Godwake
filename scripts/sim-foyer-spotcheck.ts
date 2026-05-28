/**
 * Spot-check the Counting House Foyer fix at the per-encounter level
 * (the class-tour aggregate is too noisy because Foyer fires in only ~1/6
 * of L3 delves). Each cell is 100 runs of one encounter, fresh L3 char.
 *
 * Run:  npx tsx scripts/sim-foyer-spotcheck.ts
 */
import { simulateCell } from '../src/test/sim/encounterStress';
import { EARLY_MID_POOL } from '../src/engine/delve/chapter2Pools';

const FOYER = EARLY_MID_POOL.find((e) => e.title === 'The Counting House Foyer');
if (!FOYER) throw new Error('Foyer not found in CH2 EARLY_MID_POOL');

const RUNS = 100;
const LEVEL = 3;
const SEED = 0xf01ef01e;

const classes = ['rogue', 'fighter', 'wizard'] as const;
console.log(`\nCounting House Foyer — ${FOYER.monsters.map((m) => `${m.count}× ${m.defId}`).join(', ')}`);
console.log(`L${LEVEL} · ${RUNS} runs each\n`);
for (const cls of classes) {
  const r = simulateCell(FOYER, cls, LEVEL, RUNS, SEED);
  console.log(`  ${cls.padEnd(8)}  win ${((r.wins / r.runs) * 100).toFixed(0)}%  avgRounds ${r.avgRounds.toFixed(1)}  HP-on-win ${r.avgHpPctOnWin.toFixed(0)}%`);
}
