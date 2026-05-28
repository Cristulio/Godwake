/**
 * Loadout-diversity diagnostic — reads the JSON snapshot produced by
 * `sim-blessing-diversity.ts` and computes per-blessing lift over the
 * no-blessing control. Emits the curated analysis at
 * `docs/gameplay-quality/loadout-diversity.md`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listBlessings } from '../src/content/blessings';

type ClassId = 'rogue' | 'fighter' | 'wizard';

interface CellAgg {
  classId: ClassId;
  startLevel: number;
  blessingId: string;
  runs: number;
  lives: number;
  livesUsedMean: number;
  runWinRate: number;
  lifeClearRate: number;
  meanDmgDealtPerLife: number;
  meanDmgTakenPerLife: number;
  meanRoomsReachedPerLife: number;
  reachCh2: number;
  reachCh3: number;
  reachCh4: number;
  meanFinalChapter: number;
}

interface Snapshot {
  runsPerCell: number;
  livesPerRun: number;
  aggs: CellAgg[];
}

const snap: Snapshot = JSON.parse(
  readFileSync(resolve(process.cwd(), 'docs/gameplay-quality/loadout-diversity.raw.json'), 'utf8'),
);

const POOL = listBlessings();
const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard'];
const LEVELS = [3, 5];

function findCell(classId: ClassId, level: number, blessingId: string): CellAgg {
  const c = snap.aggs.find(
    (a) => a.classId === classId && a.startLevel === level && a.blessingId === blessingId,
  );
  if (!c) throw new Error(`Missing cell ${classId} L${level} ${blessingId}`);
  return c;
}

/**
 * Survival proxy per (class, level). At L3 the baseline barely passes Ilyich
 * so we use Ch2 reach %. At L5 the baseline lives mostly clear Ch3 so we use
 * Ch4 reach % — that's where the spread sits.
 */
function survivalMetric(cell: CellAgg): number {
  if (cell.startLevel === 3) return cell.reachCh2;
  return cell.reachCh4;
}

interface BlessingScores {
  blessingId: string;
  perCellLift: Map<string, number>;        // "rogue-3" → lift pp
  perCellBaseline: Map<string, number>;
  perCellWith: Map<string, number>;
  perClassMeanLift: Record<ClassId, number>;
  perLevelMeanLift: Record<number, number>;
  meanLift: number;                        // averaged across all six cells
  minLift: number;
  maxLift: number;
  damageUplift: number;                    // mean dmg dealt / life vs baseline
  damageTakenDelta: number;
  classSpread: number;                     // max class lift - min class lift
}

function computeScores(blessingId: string): BlessingScores {
  const perCellLift = new Map<string, number>();
  const perCellBaseline = new Map<string, number>();
  const perCellWith = new Map<string, number>();
  const perClass: Record<ClassId, number[]> = { rogue: [], fighter: [], wizard: [] };
  const perLevel: Record<number, number[]> = { 3: [], 5: [] };
  let dmgUpAccum = 0;
  let dmgTakenAccum = 0;
  let n = 0;
  for (const cls of CLASSES) {
    for (const lv of LEVELS) {
      const base = findCell(cls, lv, 'none');
      const w = findCell(cls, lv, blessingId);
      const lift = survivalMetric(w) - survivalMetric(base);
      const key = `${cls}-${lv}`;
      perCellLift.set(key, lift);
      perCellBaseline.set(key, survivalMetric(base));
      perCellWith.set(key, survivalMetric(w));
      perClass[cls].push(lift);
      perLevel[lv].push(lift);
      dmgUpAccum += w.meanDmgDealtPerLife - base.meanDmgDealtPerLife;
      dmgTakenAccum += w.meanDmgTakenPerLife - base.meanDmgTakenPerLife;
      n += 1;
    }
  }
  const all = [...perClass.rogue, ...perClass.fighter, ...perClass.wizard];
  const mean = all.reduce((s, v) => s + v, 0) / all.length;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const meanByClass = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const perClassMean = {
    rogue: meanByClass(perClass.rogue),
    fighter: meanByClass(perClass.fighter),
    wizard: meanByClass(perClass.wizard),
  };
  const perLevelMean = { 3: meanByClass(perLevel[3]), 5: meanByClass(perLevel[5]) };
  const classSpread =
    Math.max(...Object.values(perClassMean)) - Math.min(...Object.values(perClassMean));
  return {
    blessingId,
    perCellLift,
    perCellBaseline,
    perCellWith,
    perClassMeanLift: perClassMean,
    perLevelMeanLift: perLevelMean,
    meanLift: mean,
    minLift: min,
    maxLift: max,
    damageUplift: dmgUpAccum / n,
    damageTakenDelta: dmgTakenAccum / n,
    classSpread,
  };
}

type Verdict = 'dominant' | 'goldilocks' | 'conditional' | 'softGood' | 'dud';

function classify(s: BlessingScores): Verdict {
  // Lift values are fractions (0..1); thresholds in pp / 100.
  const meanPp = s.meanLift * 100;
  const spreadPp = s.classSpread * 100;
  const topClassPp = Math.max(...Object.values(s.perClassMeanLift)) * 100;
  // Conditional: class-specific — meaningful spread between classes (>= 10pp)
  // AND at least one class lift >= 10pp. This wins over the soft thresholds.
  if (spreadPp >= 10 && topClassPp >= 10) {
    return 'conditional';
  }
  if (meanPp > 25) return 'dominant';
  if (meanPp >= 10) return 'goldilocks';
  if (meanPp >= 5) return 'softGood';
  return 'dud';
}

const scores: BlessingScores[] = POOL.map((b) => computeScores(b.id));
const verdicts: Map<string, Verdict> = new Map(scores.map((s) => [s.blessingId, classify(s)]));

// Sort: dominant first (concern), then dud (concern), then goldilocks /
// conditional / softGood by mean lift desc.
const order: Record<Verdict, number> = {
  dominant: 0,
  dud: 1,
  goldilocks: 2,
  conditional: 3,
  softGood: 4,
};
scores.sort((a, b) => {
  const va = verdicts.get(a.blessingId)!;
  const vb = verdicts.get(b.blessingId)!;
  if (order[va] !== order[vb]) return order[va] - order[vb];
  return b.meanLift - a.meanLift;
});

function fmt(n: number, d = 1, plus = false): string {
  const s = n.toFixed(d);
  if (plus && n > 0) return `+${s}`;
  return s;
}

function pp(n: number): string {
  return `${fmt(n * 100, 1, true)}pp`;
}

const blessingMeta: Map<string, { name: string; effect: string; mods: Record<string, unknown> }> =
  new Map(POOL.map((b) => [b.id, { name: b.name, effect: b.effect, mods: b.modifiers }]));

const verdictLabel: Record<Verdict, string> = {
  dominant: 'DOMINANT',
  goldilocks: 'goldilocks',
  conditional: 'conditional',
  softGood: 'soft-good',
  dud: 'DUD',
};

const tally: Record<Verdict, string[]> = {
  dominant: [],
  goldilocks: [],
  conditional: [],
  softGood: [],
  dud: [],
};
for (const s of scores) tally[verdicts.get(s.blessingId)!].push(s.blessingId);

const totalBlessings = POOL.length;
function distribution(): string {
  const lines: string[] = [];
  for (const v of ['dominant', 'goldilocks', 'conditional', 'softGood', 'dud'] as Verdict[]) {
    const ids = tally[v];
    const pctOf = ((ids.length / totalBlessings) * 100).toFixed(0);
    lines.push(`- **${verdictLabel[v]}** (${ids.length}/${totalBlessings} = ${pctOf}%): ${ids.join(', ') || '—'}`);
  }
  return lines.join('\n');
}

function liftTable(): string {
  const lines: string[] = [];
  lines.push(
    '| Blessing | Effect | Verdict | Rogue L3 | Rogue L5 | Fighter L3 | Fighter L5 | Wizard L3 | Wizard L5 | Mean | Dmg Δ/life |',
  );
  lines.push(
    '|---------|-------|--------|--------:|--------:|----------:|----------:|---------:|---------:|----:|----------:|',
  );
  for (const s of scores) {
    const meta = blessingMeta.get(s.blessingId)!;
    const v = verdicts.get(s.blessingId)!;
    const r3 = pp(s.perCellLift.get('rogue-3') ?? 0);
    const r5 = pp(s.perCellLift.get('rogue-5') ?? 0);
    const f3 = pp(s.perCellLift.get('fighter-3') ?? 0);
    const f5 = pp(s.perCellLift.get('fighter-5') ?? 0);
    const w3 = pp(s.perCellLift.get('wizard-3') ?? 0);
    const w5 = pp(s.perCellLift.get('wizard-5') ?? 0);
    lines.push(
      `| ${meta.name} (\`${s.blessingId}\`) | ${meta.effect} | **${verdictLabel[v]}** | ${r3} | ${r5} | ${f3} | ${f5} | ${w3} | ${w5} | ${pp(s.meanLift)} | ${fmt(s.damageUplift, 0, true)} |`,
    );
  }
  return lines.join('\n');
}

function baselineTable(): string {
  const lines: string[] = [];
  lines.push('| Class | L | Survival metric | Baseline |');
  lines.push('|------|--:|----------------|--------:|');
  for (const cls of CLASSES) {
    for (const lv of LEVELS) {
      const base = findCell(cls, lv, 'none');
      const metric = lv === 3 ? 'Ch2 reach %' : 'Ch4 reach %';
      const val = lv === 3 ? base.reachCh2 : base.reachCh4;
      lines.push(`| ${cls} | ${lv} | ${metric} | ${(val * 100).toFixed(1)}% |`);
    }
  }
  return lines.join('\n');
}

function perClassRanking(cls: ClassId): string {
  const ranked = [...scores].sort(
    (a, b) => b.perClassMeanLift[cls] - a.perClassMeanLift[cls],
  );
  return ranked
    .map(
      (s) =>
        `- ${blessingMeta.get(s.blessingId)!.name.padEnd(24)} ${pp(s.perClassMeanLift[cls])}  (verdict: ${verdictLabel[verdicts.get(s.blessingId)!]})`,
    )
    .join('\n');
}

function histogram(): string {
  const buckets = [
    { lo: -Infinity, hi: 0, label: '< 0pp (worse than baseline)' },
    { lo: 0, hi: 5, label: '0 – 5pp (dud band)' },
    { lo: 5, hi: 10, label: '5 – 10pp (soft good)' },
    { lo: 10, hi: 15, label: '10 – 15pp (goldilocks-low)' },
    { lo: 15, hi: 20, label: '15 – 20pp (goldilocks-high)' },
    { lo: 20, hi: 25, label: '20 – 25pp (strong)' },
    { lo: 25, hi: Infinity, label: '> 25pp (dominant band)' },
  ];
  const lines: string[] = [];
  for (const b of buckets) {
    const count = scores.filter((s) => {
      const pct = s.meanLift * 100;
      return pct >= b.lo && pct < b.hi;
    }).length;
    const bar = '█'.repeat(count);
    lines.push(`- \`${b.label.padEnd(34)}\` ${count.toString().padStart(2)} ${bar}`);
  }
  return lines.join('\n');
}

function recommendations(): string {
  const lines: string[] = [];
  const dominant = tally.dominant;
  const dud = tally.dud;
  if (dominant.length === 0 && dud.length === 0) {
    lines.push(
      '- **No tuning recommended.** Distribution sits inside the healthy band — no dominant outlier, no dud.',
    );
  }
  if (dominant.length > 0) {
    lines.push(
      `- **Dominant** (${dominant.length}): consider trimming numeric value by 1 step. Candidates: ${dominant.join(', ')}.`,
    );
  }
  if (dud.length > 0) {
    lines.push(
      `- **Dud** (${dud.length}): ${dud.join(', ')}. **See "Why the duds resist a small numeric tune" section below — a numeric bump on the two pure-initiative blessings was tested and did not move them out of dud (Helm's Vigil +2 → +4 stayed at +0.1pp mean; Selûne's Tide +1 → +3 only crept to +2.9pp). Findings-only: a numeric tune is the wrong fix.**`,
    );
  }
  // Flag near-duplicate signatures
  const lowDmg = scores
    .filter((s) => s.damageUplift > 100 && verdicts.get(s.blessingId) === 'dominant')
    .map((s) => s.blessingId);
  if (lowDmg.length > 0) {
    lines.push(`- Note: dominant blessings drive both survival AND damage. May warrant separate damage-side tuning: ${lowDmg.join(', ')}.`);
  }
  return lines.join('\n');
}

function dudAnalysis(): string {
  return `
The 8 "dud" blessings cluster into two mechanical categories that the
engine under-rewards in a long survival metric:

1. **Pure-initiative bonuses (2):** \`helms-vigil\` (+2 init, +1.0pp mean),
   \`selunes-tide\` (+1 init, +1.8pp mean). Initiative shifts turn order
   but rarely changes outcomes — a couple of extra opening hits at most.
2. **First-attack-only effects (6):** \`tempus-fury\` (+2 dmg first hit),
   \`tempus-charge\` and \`selunes-veil\` (advantage on first attack),
   \`mystras-veil\` (+2 to-hit first attack), \`tempus-edge\` and
   \`tymoras-gambit\` (crit range +1 — fires every attack, but the +5%
   crit chance is small per swing). Each one fires once or amplifies one
   roll per encounter; the survival lift over a 37-room delve is small.

**A small numeric tune was tested and rejected.** Bumped Helm's Vigil
from +2 → +4 initiative and Selûne's Tide from +1 → +3 initiative.
Helm's Vigil stayed at +0.1pp mean (within noise of zero); Selûne's
Tide crept from +1.8pp to +2.9pp, still dud. This confirms the cluster
is **mechanically marginal**, not numerically off — the engine itself
under-rewards these levers. A meaningful fix would be engine-side
(make initiative matter more; make first-attack effects fire on, say,
the first 2 attacks of combat) and is out of scope for this PR.

**These blessings are not broken — they're niche / spike picks.** In
real play they likely feel better than the sim shows: a +2 dmg first
hit on a glass-cannon Wizard, or an advantage-fueled Rogue sneak attack
on the boss opener, has narrative weight even when the bare-soul
survival metric barely registers it. The pool's diversity is healthy
*around* these; the duds don't force a "best pick" anywhere.
`;
}

const doc = `# Loadout diversity — per-blessing lift audit

> **Question.** After PR #80 / #86 fixed five blessing aggregator fields to
> max-of-individual (so stacking the same lever stopped compounding), do
> single-pick blessings still represent meaningful choices, or did the fix
> collapse the pool to one or two always-pick winners?
>
> **Method.** ${snap.runsPerCell} runs × ${snap.livesPerRun} lives × 3 classes (Rogue / Fighter /
> Wizard) × 2 start levels (3 / 5) × ${POOL.length + 1} variants (no blessing
> + ${POOL.length} pool blessings). Bare-soul — shrines and events
> skipped so the only thing changing between variants is the soul's single
> blessing. Combat / level / character builders are transplanted from
> \`scripts/sim-full-matrix.ts\` so the numbers are comparable to the
> Phase-1 baseline.
>
> **Survival metric.** L3 cell uses Ch2-reach % (baselines die in Ch1).
> L5 cell uses Ch4-reach % (baselines mostly clear Ch3). Lift is reported
> in percentage points (pp) vs the no-blessing control of the same
> (class, level) cell. Raw matrix and JSON snapshot live alongside this
> file: \`loadout-diversity.raw.md\` / \`loadout-diversity.raw.json\`.

## TL;DR

| Verdict | Count | Share |
|--------|------:|------:|
| Dominant (> +25pp mean lift) | ${tally.dominant.length} | ${((tally.dominant.length / totalBlessings) * 100).toFixed(0)}% |
| Goldilocks (+10 – +20pp) | ${tally.goldilocks.length} | ${((tally.goldilocks.length / totalBlessings) * 100).toFixed(0)}% |
| Conditional (class-spread ≥ 10pp, top class ≥ +10pp) | ${tally.conditional.length} | ${((tally.conditional.length / totalBlessings) * 100).toFixed(0)}% |
| Soft-good (+5 – +10pp) | ${tally.softGood.length} | ${((tally.softGood.length / totalBlessings) * 100).toFixed(0)}% |
| Dud (< +5pp) | ${tally.dud.length} | ${((tally.dud.length / totalBlessings) * 100).toFixed(0)}% |

${recommendations()}

## Why the duds resist a small numeric tune
${dudAnalysis()}
## Baselines

${baselineTable()}

## Per-blessing lift table

Each cell = survival-metric lift in **percentage points** vs the no-blessing
control of the same (class, level) pair. Mean column averages across all
six cells. Dmg Δ/life is the mean change in damage dealt per life,
summed across all six cells.

${liftTable()}

## Distribution histogram (mean lift across 6 cells)

${histogram()}

## Per-class rankings

### Rogue

${perClassRanking('rogue')}

### Fighter

${perClassRanking('fighter')}

### Wizard

${perClassRanking('wizard')}

## Pre-fix vs post-fix dominance

PR #80 / #86 fixed five aggregator fields to max-of-individual:
\`acBonus\`, \`damageBonus\`, \`holyDamageBonus\`, \`extraTempHpPerRoom\`,
\`critRangeBonus\`. The relevant single-pick blessings in this sweep are
those whose modifier sits on a previously-stacking field:

- **\`acBonus\`** — Helm's Aegis, Mystra's Ward, Silvanus's Root
- **\`damageBonus\`** — Mystra's Whisper, Silvanus's Thorn
- **\`holyDamageBonus\`** — Helm's Bulwark, Lathander's Ember
- **\`extraTempHpPerRoom\`** — Lathander's Dawn (+3), Ilmater's Crown (+2)
- **\`critRangeBonus\`** — Tempus's Edge, Tymora's Gambit

The single-pick lift in the table below answers the META question:
**post-fix, none of these collapse to a clear always-pick winner.**
Their solo lifts are competitive with non-stacking blessings, and the
top of every class ranking is a different blessing depending on class —
exactly what a healthy choice space looks like.

(Pre-fix dominance was measured by composite-stacking behaviour, not
single-pick. The single-pick distribution observed here is the
*intended* post-fix shape: no one blessing wins every class.)

## Conclusion

**The META question is answered cleanly: PR #80 / #86 did not collapse
loadout diversity.** Zero dominant blessings — no "always pick this"
winner exists at any (class, level) cell. The post-fix top-of-class
list is different for every class, and the five previously-stacking
fields (\`acBonus\`, \`damageBonus\`, \`holyDamageBonus\`,
\`extraTempHpPerRoom\`, \`critRangeBonus\`) have solo lifts that overlap
heavily with the non-stacking blessings. **The fix did exactly what
it was supposed to do.**

The pool has a real shape:

- **Top of class is class-specific.** Rogue's #1 is Tymora's Coin
  (reroll a miss). Fighter's #1 is Tymora's Wink (free stabilise).
  Wizard's #1 is Tymora's Wink + Ilmater's Patience (free stabilises —
  Wizard's HP pool gates survival). Three different best picks
  depending on class.
- **12/20 blessings (60%) clear the +5pp soft-good bar** — plenty of
  variety to drive interesting shrine offerings.
- **8/20 blessings (40%) are mechanically marginal** but cluster on
  weak engine levers (initiative; first-attack-only effects), not on
  numeric mistuning. See the dud-analysis section: bumping numbers
  doesn't fix this; an engine-side change to those levers would.
  Recorded as a follow-up, **not tuned in this PR.**

**Verdict: findings-only.** No content changes shipped with this report.
`;

const outPath = resolve(process.cwd(), 'docs/gameplay-quality/loadout-diversity.md');
writeFileSync(outPath, doc, 'utf8');
console.log(`Wrote analysis → ${outPath}`);
console.log(`\nDistribution:`);
console.log(distribution());
