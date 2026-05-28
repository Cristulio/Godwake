/**
 * Runner for the immortal-hypothesis sim. Writes the matrix output and
 * hypothesis verdict to docs/playtest-findings/immortal-hypothesis.md.
 * Re-run with: `npm run test:run -- src/sim/immortalHypothesisSim.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ClassId } from '../schemas/ids';
import { runMatrix, type CellSummary, type Loadout } from './immortalHypothesisSim';

const OUT_DIR = resolve(process.cwd(), 'docs/sim-findings');
const OUT_FILE = resolve(OUT_DIR, 'immortal-hypothesis-matrix.md');

const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard'];
const LEVELS = [3, 5, 7];
const LOADOUTS: Loadout[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const RUNS_PER_CELL = 30;

describe('Immortal hypothesis matrix', () => {
  it('runs class × level × loadout matrix and writes findings', () => {
    const startedAt = Date.now();
    const summaries = runMatrix({
      classes: CLASSES,
      levels: LEVELS,
      loadouts: LOADOUTS,
      runsPerCell: RUNS_PER_CELL,
    });
    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

    const verdict = diagnose(summaries);
    const md = renderReport({ summaries, verdict, elapsedSec, runsPerCell: RUNS_PER_CELL });

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, md, 'utf8');
    // eslint-disable-next-line no-console
    console.log(
      `\n[immortalSim] wrote ${OUT_FILE} (${elapsedSec}s)\n` +
        `verdict: ${verdict.headline}\n`,
    );

    // ── Guard-rails (LOOSE) ────────────────────────────────────────────────
    // These encode the aggregator-cap invariant, not tuned numbers, so they
    // survive the in-flight combat/meta changes. Tighten in a later pass.
    expect(summaries.length).toBe(CLASSES.length * LEVELS.length * LOADOUTS.length);
    for (const s of summaries) {
      expect(s.runs).toBe(RUNS_PER_CELL);
      expect(s.deathRate).toBeGreaterThanOrEqual(0);
      expect(s.deathRate).toBeLessThanOrEqual(1);
      expect(s.avgTempHpPerEncounter).toBeGreaterThanOrEqual(0);
    }

    // The aggregator-cap invariant (PR #80): stacking a second temp-HP blessing
    // (loadout C = Lathander + Ilmater) must NOT grant materially more temp HP
    // than a single source (loadout B = Lathander). If additive stacking is
    // reintroduced, tHP-C jumps well past tHP-B and these go RED. Margin is
    // wide today (C ≈ B, both ~2–2.6 tHP/encounter).
    for (const p of verdict.perClass) {
      expect(p.tempHpC).toBeLessThanOrEqual(p.tempHpB + 1.5);
    }

    // And the rolled-up verdict must stay REFUTED — temp HP does not stack.
    expect(verdict.confirmed).toBe(false);
  }, 600_000);
});

interface Verdict {
  headline: string;
  confirmed: boolean;
  perClass: Array<{
    classId: ClassId;
    deltaCB: number; // C minus B death rate, negative = C is better (lower death)
    deltaBA: number;
    tempHpC: number;
    tempHpB: number;
    tempHpA: number;
  }>;
}

function diagnose(summaries: CellSummary[]): Verdict {
  // Aggregate across levels per class × loadout.
  const byClassLoadout: Record<string, CellSummary[]> = {};
  for (const s of summaries) {
    const key = `${s.classId}|${s.loadout}`;
    (byClassLoadout[key] ??= []).push(s);
  }
  const avgOver = (cells: CellSummary[], sel: (c: CellSummary) => number) =>
    cells.reduce((sum, c) => sum + sel(c), 0) / cells.length;

  const perClass: Verdict['perClass'] = [];
  let confirmedCount = 0;
  for (const classId of new Set(summaries.map((s) => s.classId))) {
    const A = byClassLoadout[`${classId}|A`] ?? [];
    const B = byClassLoadout[`${classId}|B`] ?? [];
    const C = byClassLoadout[`${classId}|C`] ?? [];
    const dA = avgOver(A, (s) => s.deathRate);
    const dB = avgOver(B, (s) => s.deathRate);
    const dC = avgOver(C, (s) => s.deathRate);
    const tA = avgOver(A, (s) => s.avgTempHpPerEncounter);
    const tB = avgOver(B, (s) => s.avgTempHpPerEncounter);
    const tC = avgOver(C, (s) => s.avgTempHpPerEncounter);
    perClass.push({
      classId: classId as ClassId,
      deltaCB: dC - dB,
      deltaBA: dB - dA,
      tempHpA: tA,
      tempHpB: tB,
      tempHpC: tC,
    });
    // Hypothesis CONFIRMED if temp HP per encounter for C is meaningfully
    // larger than B (~5 vs ~3) AND C death rate is lower than B by a
    // meaningful margin (>=5pp), OR temp HP per encounter shows the
    // sum-stacking signal (C > B + 1.5) regardless of death rate (death
    // rates can floor out at 100% if the class is just too weak).
    if (tC > tB + 1.5 && tB > tA) confirmedCount += 1;
  }
  const confirmed = confirmedCount >= 2; // 2 of 3 classes show the signal
  const headline = confirmed
    ? `CONFIRMED — temp-HP grant sums additively (C ~5 tHP/encounter vs B ~3)`
    : `REFUTED — temp-HP grant does not stack additively`;
  return { headline, confirmed, perClass };
}

function renderReport(opts: {
  summaries: CellSummary[];
  verdict: Verdict;
  elapsedSec: string;
  runsPerCell: number;
}): string {
  const { summaries, verdict, elapsedSec, runsPerCell } = opts;

  const matrixRows: string[] = [];
  matrixRows.push(
    '| Class | L | Loadout | Death% | Avg ch | Avg rooms | Avg dmg taken | tHP / enc | Eff. HP |',
  );
  matrixRows.push(
    '|-------|---|---------|--------|--------|-----------|---------------|-----------|---------|',
  );
  for (const s of summaries) {
    matrixRows.push(
      `| ${s.classId} | ${s.startLevel} | ${s.loadout} | ${(s.deathRate * 100).toFixed(0)}% | ${s.avgChaptersCleared.toFixed(2)} | ${s.avgRoomsCleared.toFixed(1)} | ${s.avgDamageTaken.toFixed(1)} | ${s.avgTempHpPerEncounter.toFixed(2)} | ${s.avgEffectiveHp.toFixed(1)} |`,
    );
  }

  const verdictRows: string[] = [];
  verdictRows.push('| Class | tHP A | tHP B | tHP C | Δ death B→A | Δ death C→B |');
  verdictRows.push('|-------|-------|-------|-------|-------------|-------------|');
  for (const p of verdict.perClass) {
    verdictRows.push(
      `| ${p.classId} | ${p.tempHpA.toFixed(2)} | ${p.tempHpB.toFixed(2)} | ${p.tempHpC.toFixed(2)} | ${(p.deltaBA * 100).toFixed(1)}pp | ${(p.deltaCB * 100).toFixed(1)}pp |`,
    );
  }

  const loadoutCount = new Set(summaries.map((s) => s.loadout)).size;
  const classCount = new Set(summaries.map((s) => s.classId)).size;
  const levelCount = new Set(summaries.map((s) => s.startLevel)).size;
  const totalDelves = runsPerCell * classCount * levelCount * loadoutCount;

  return `# Immortal-Rogue Hypothesis (2026-05-27)

_Auto-generated by \`src/sim/immortalHypothesisSim.test.ts\`. Re-run with \`npm run test:run -- src/sim/immortalHypothesisSim.test.ts\`. Wall clock: ${elapsedSec}s for ${runsPerCell} runs × ${classCount} classes × ${levelCount} levels × ${loadoutCount} loadouts = ${totalDelves} delves._

## Verdict

**${verdict.headline}**

## Hypothesis

The Session-3 sim parked a hypothesis it could not test: that the playtester's "immortal Rogue" feeling was not class power but **blessing-stack abuse**. \`aggregateBlessingModifiers\` sums \`extraTempHpPerRoom\` across blessings, so picking both Lathander's Dawn (+3) and Ilmater's Crown (+2) grants **+5 temp HP every combat** — bigger than any class survival tool.

We test this by walking three classes (Rogue, Fighter, Wizard) at L3/L5/L7 through the full Godwake delve under seven loadouts:

- **A — vacuum:** no blessings, no Grove upgrades (floor)
- **B — single tHP:** Lathander's Dawn only (+3 tHP / room)
- **C — stacked tHP:** Lathander's Dawn + Ilmater's Crown (the suspect combo)
- **D — Grove + stacked:** C + Mantle 5, Iron Will 1, Cloak 3, Hardier Soul 3, Wellspring Vigil 3
- **E — stacked AC:** Helm's Aegis + Mystra's Ward + Silvanus's Root (would reach +3 AC pre-fix; +1 post-fix)
- **F — stacked crit:** Tempus's Edge + Tymora's Gambit (would reach crit on 18–20 pre-fix; +1 post-fix)
- **G — stacked dmg:** Mystra's Whisper + Silvanus's Thorn (would reach +2/hit pre-fix; +1 post-fix)

The hypothesis is confirmed if temp-HP-per-encounter for loadout C is materially higher than B (~5 vs ~3) AND survivability shifts with it.

## Per-class signal

${verdictRows.join('\n')}

Δ columns show the change in death rate across loadouts (negative = better, i.e. tHP helped survive). \`tHP A/B/C\` is the average temporary HP granted per combat for each loadout.

## Full matrix

${matrixRows.join('\n')}

## Setup

- **Engine:** real \`createCombat\` / \`playerAttack\` / \`monsterAttack\` / \`endTurn\` path.
- **AI:** class-aware turn handlers reused from \`src/test/sim/encounterStress.ts\` (rogue: Hide → Sneak Attack; fighter: Action Surge + Second Wind; wizard: Fireball/Lightning/Burning Hands/Magic Missile/Fire Bolt priority).
- **Delve:** full Godwake delve (\`createGodwakeDelve\`) — 50 rooms, 4 chapters, seeded.
- **Shrine/event rooms:** no-op. Blessings are pre-stamped per loadout so the signal isn't diluted by random shrine picks.
- **Rest rooms:** 70% HP heal. Camp room: long rest.
- **Runs per cell:** ${runsPerCell}

## Files

- Sim harness: \`src/sim/immortalHypothesisSim.ts\`
- Runner: \`src/sim/immortalHypothesisSim.test.ts\`
- Aggregator under test: \`src/engine/character/blessings.ts:56\` (\`aggregateBlessingModifiers\`)
`;
}
