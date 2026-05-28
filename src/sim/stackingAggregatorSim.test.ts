/**
 * Validation sim for PR #80 (extraTempHpPerRoom) + PR #86 (acBonus,
 * critRangeBonus, damageBonus, holyDamageBonus). Both PRs added a
 * max-of-individual carve-out to aggregateBlessingModifiers; this sim
 * confirms the engine actually CONSUMES that aggregated value at the
 * downstream sites (derived.computeAC, derived.critRange, playerAttack
 * damage/holy bonuses).
 *
 * Two layers of test:
 *   1. Static field check — build a character with single vs stacked
 *      blessing sources, read effective AC, crit range, blessing damage
 *      bonus, blessing holy bonus. Stacked must == single, deterministically.
 *   2. Sim corroboration — run 50 delves/cell across 3 classes × 3 levels
 *      for the stacked + reference loadouts. Stacked must show no
 *      meaningful survivability / damage edge over the single-source
 *      reference. (Static is the load-bearing test; the sim is the
 *      engine-path integration smoke.)
 *
 * Writes findings to docs/validation-findings/stacking-aggregators.md.
 *
 * Re-run with: `npm run test:run -- src/sim/stackingAggregatorSim.test.ts`
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ClassId } from '../schemas/ids';
import { computeAC, critRange } from '../engine/character/derived';
import { characterBlessingMods } from '../engine/character/blessings';
import {
  makeCharacterFromBlessings,
  runDelveCustom,
  type RunStats,
} from './immortalHypothesisSim';

const OUT_DIR = resolve(process.cwd(), 'docs/validation-findings');
const OUT_FILE = resolve(OUT_DIR, 'stacking-aggregators.md');

const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard'];
const LEVELS = [3, 5, 7];
const RUNS_PER_CELL = 200;

interface LoadoutDef {
  key: string;
  label: string;
  field: 'ac' | 'crit' | 'dmg' | 'holy' | 'all4' | 'none';
  blessings: string[];
  variant: 'ref' | 'stacked' | 'none';
}

const LOADOUTS: LoadoutDef[] = [
  { key: 'NONE', label: 'no blessings (floor)', field: 'none', blessings: [], variant: 'none' },

  { key: 'E_ref', label: 'E_ref: single AC (helms-aegis)',
    field: 'ac', blessings: ['helms-aegis'], variant: 'ref' },
  { key: 'E',     label: 'E: stacked AC (helms-aegis + mystras-ward + silvanus-root)',
    field: 'ac', blessings: ['helms-aegis', 'mystras-ward', 'silvanus-root'], variant: 'stacked' },

  { key: 'F_ref', label: 'F_ref: single crit (tempus-edge)',
    field: 'crit', blessings: ['tempus-edge'], variant: 'ref' },
  { key: 'F',     label: 'F: stacked crit (tempus-edge + tymoras-gambit)',
    field: 'crit', blessings: ['tempus-edge', 'tymoras-gambit'], variant: 'stacked' },

  { key: 'G_ref', label: 'G_ref: single damage (mystras-whisper)',
    field: 'dmg', blessings: ['mystras-whisper'], variant: 'ref' },
  { key: 'G',     label: 'G: stacked damage (mystras-whisper + silvanus-thorn)',
    field: 'dmg', blessings: ['mystras-whisper', 'silvanus-thorn'], variant: 'stacked' },

  { key: 'H_ref', label: 'H_ref: single holy (helms-bulwark)',
    field: 'holy', blessings: ['helms-bulwark'], variant: 'ref' },
  { key: 'H',     label: 'H: stacked holy (helms-bulwark + lathanders-ember)',
    field: 'holy', blessings: ['helms-bulwark', 'lathanders-ember'], variant: 'stacked' },

  { key: 'I_ref', label: 'I_ref: one of each (helms-aegis + tempus-edge + mystras-whisper + helms-bulwark)',
    field: 'all4', blessings: ['helms-aegis', 'tempus-edge', 'mystras-whisper', 'helms-bulwark'],
    variant: 'ref' },
  { key: 'I',     label: 'I: all four stacked (3 AC + 2 crit + 2 dmg + 2 holy = 9 blessings)',
    field: 'all4',
    blessings: [
      'helms-aegis', 'mystras-ward', 'silvanus-root',
      'tempus-edge', 'tymoras-gambit',
      'mystras-whisper', 'silvanus-thorn',
      'helms-bulwark', 'lathanders-ember',
    ],
    variant: 'stacked' },
];

interface StaticReading {
  classId: ClassId;
  level: number;
  loadoutKey: string;
  ac: number;
  critRangeSize: number;
  blessingDamageBonus: number;
  blessingHolyBonus: number;
}

function staticReadings(): StaticReading[] {
  const readings: StaticReading[] = [];
  for (const classId of CLASSES) {
    for (const level of LEVELS) {
      for (const lo of LOADOUTS) {
        const c = makeCharacterFromBlessings(classId, level, lo.blessings);
        const mods = characterBlessingMods(c);
        readings.push({
          classId, level, loadoutKey: lo.key,
          ac: computeAC(c),
          critRangeSize: critRange(c).length,
          blessingDamageBonus: mods.damageBonus ?? 0,
          blessingHolyBonus: mods.holyDamageBonus ?? 0,
        });
      }
    }
  }
  return readings;
}

type Field = 'ac' | 'crit' | 'dmg' | 'holy';

interface StaticVerdict {
  field: Field;
  refKey: string;
  stackedKey: string;
  pass: boolean;
  failureDetail?: string;
}

function pickField(r: StaticReading, field: Field): number {
  switch (field) {
    case 'ac':   return r.ac;
    case 'crit': return r.critRangeSize;
    case 'dmg':  return r.blessingDamageBonus;
    case 'holy': return r.blessingHolyBonus;
  }
}

function verifyStatic(readings: StaticReading[]): StaticVerdict[] {
  const byCell = new Map<string, StaticReading>();
  for (const r of readings) byCell.set(`${r.classId}|${r.level}|${r.loadoutKey}`, r);

  const pairs: Array<{ field: Field; refKey: string; stackedKey: string }> = [
    { field: 'ac',   refKey: 'E_ref', stackedKey: 'E' },
    { field: 'crit', refKey: 'F_ref', stackedKey: 'F' },
    { field: 'dmg',  refKey: 'G_ref', stackedKey: 'G' },
    { field: 'holy', refKey: 'H_ref', stackedKey: 'H' },
    { field: 'ac',   refKey: 'I_ref', stackedKey: 'I' },
    { field: 'crit', refKey: 'I_ref', stackedKey: 'I' },
    { field: 'dmg',  refKey: 'I_ref', stackedKey: 'I' },
    { field: 'holy', refKey: 'I_ref', stackedKey: 'I' },
  ];

  const verdicts: StaticVerdict[] = [];
  for (const p of pairs) {
    let pass = true;
    let detail: string | undefined;
    outer: for (const classId of CLASSES) {
      for (const level of LEVELS) {
        const ref = byCell.get(`${classId}|${level}|${p.refKey}`)!;
        const stk = byCell.get(`${classId}|${level}|${p.stackedKey}`)!;
        const refVal = pickField(ref, p.field);
        const stkVal = pickField(stk, p.field);
        if (refVal !== stkVal) {
          pass = false;
          detail = `${classId} L${level}: ref=${refVal}, stacked=${stkVal}`;
          break outer;
        }
      }
    }
    verdicts.push({ field: p.field, refKey: p.refKey, stackedKey: p.stackedKey, pass, failureDetail: detail });
  }
  return verdicts;
}

interface SimCell {
  classId: ClassId;
  level: number;
  loadoutKey: string;
  runs: number;
  deathRate: number;
  avgRoomsCleared: number;
  avgDamageTaken: number;
  avgDamageDealt: number;
}

function seedFor(baseSeed: number, classId: ClassId, level: number, loadoutKey: string, i: number): number {
  let s = baseSeed >>> 0;
  for (const ch of loadoutKey) s = (s ^ (ch.charCodeAt(0) * 31337)) >>> 0;
  return (s ^ (classId.length * 7919) ^ (level * 1009) ^ (i * 104729)) >>> 0;
}

function runSimMatrix(): SimCell[] {
  const baseSeed = 0x5743A66 >>> 0;
  const cells: SimCell[] = [];
  for (const classId of CLASSES) {
    for (const level of LEVELS) {
      for (const lo of LOADOUTS) {
        const runs: RunStats[] = [];
        for (let i = 0; i < RUNS_PER_CELL; i++) {
          const seed = seedFor(baseSeed, classId, level, lo.key, i);
          runs.push(
            runDelveCustom({
              classId,
              startLevel: level,
              blessings: lo.blessings,
              seed,
              loadoutLabel: 'A', // proxy; we track via loadoutKey below
            }),
          );
        }
        const n = runs.length;
        const avg = (sel: (r: RunStats) => number) => runs.reduce((s, r) => s + sel(r), 0) / n;
        cells.push({
          classId, level, loadoutKey: lo.key, runs: n,
          deathRate: runs.filter((r) => r.died).length / n,
          avgRoomsCleared: avg((r) => r.roomsCleared),
          avgDamageTaken: avg((r) => r.damageTaken),
          avgDamageDealt: avg((r) => r.damageDealt),
        });
      }
    }
  }
  return cells;
}

interface SimVerdict {
  field: Field | 'all4';
  refKey: string;
  stackedKey: string;
  refDamageTaken: number;
  stackedDamageTaken: number;
  refDamageDealt: number;
  stackedDamageDealt: number;
  damageTakenDeltaPct: number;
  damageDealtDeltaPct: number;
  verdict: 'stacking-neutralized' | 'still-stacks' | 'inconclusive';
}

function avgAcross(byCell: Map<string, SimCell>, key: string, sel: (c: SimCell) => number): number {
  let sum = 0;
  let n = 0;
  for (const classId of CLASSES) {
    for (const level of LEVELS) {
      const c = byCell.get(`${classId}|${level}|${key}`);
      if (c) { sum += sel(c); n += 1; }
    }
  }
  return n > 0 ? sum / n : 0;
}

function verifySim(cells: SimCell[]): SimVerdict[] {
  const byCell = new Map<string, SimCell>();
  for (const c of cells) byCell.set(`${c.classId}|${c.level}|${c.loadoutKey}`, c);

  const pairs: Array<{ field: SimVerdict['field']; refKey: string; stackedKey: string }> = [
    { field: 'ac',   refKey: 'E_ref', stackedKey: 'E' },
    { field: 'crit', refKey: 'F_ref', stackedKey: 'F' },
    { field: 'dmg',  refKey: 'G_ref', stackedKey: 'G' },
    { field: 'holy', refKey: 'H_ref', stackedKey: 'H' },
    { field: 'all4', refKey: 'I_ref', stackedKey: 'I' },
  ];

  // A broken aggregator would push damage taken −25% (AC stacking) or
  // damage dealt +8–20% (crit/dmg/holy stacking) for the stacked variant.
  // Anything inside ±NOISE is "neutralized".
  const NOISE = 0.08;

  return pairs.map((p) => {
    const refDmgTaken = avgAcross(byCell, p.refKey, (c) => c.avgDamageTaken);
    const stkDmgTaken = avgAcross(byCell, p.stackedKey, (c) => c.avgDamageTaken);
    const refDmgDealt = avgAcross(byCell, p.refKey, (c) => c.avgDamageDealt);
    const stkDmgDealt = avgAcross(byCell, p.stackedKey, (c) => c.avgDamageDealt);
    const dtDelta = refDmgTaken > 0 ? (stkDmgTaken - refDmgTaken) / refDmgTaken : 0;
    const ddDelta = refDmgDealt > 0 ? (stkDmgDealt - refDmgDealt) / refDmgDealt : 0;

    let verdict: SimVerdict['verdict'];
    if (p.field === 'ac' || p.field === 'holy') {
      // Defensive: stacked-pre-fix would reduce damage taken (negative delta).
      verdict = Math.abs(dtDelta) < NOISE ? 'stacking-neutralized'
              : (dtDelta < -NOISE ? 'still-stacks' : 'inconclusive');
    } else if (p.field === 'crit' || p.field === 'dmg') {
      // Offensive: stacked-pre-fix would increase damage dealt (positive delta).
      verdict = Math.abs(ddDelta) < NOISE ? 'stacking-neutralized'
              : (ddDelta > NOISE ? 'still-stacks' : 'inconclusive');
    } else {
      verdict = (Math.abs(dtDelta) < NOISE && Math.abs(ddDelta) < NOISE)
        ? 'stacking-neutralized' : 'still-stacks';
    }

    return {
      field: p.field, refKey: p.refKey, stackedKey: p.stackedKey,
      refDamageTaken: refDmgTaken, stackedDamageTaken: stkDmgTaken,
      refDamageDealt: refDmgDealt, stackedDamageDealt: stkDmgDealt,
      damageTakenDeltaPct: dtDelta, damageDealtDeltaPct: ddDelta,
      verdict,
    };
  });
}

describe('Stacking-aggregator validation (PR #80 + #86)', () => {
  it('confirms aggregator fixes hold at engine consumption sites', () => {
    const startedAt = Date.now();
    const sReadings = staticReadings();
    const sVerdicts = verifyStatic(sReadings);

    const simCells = runSimMatrix();
    const simVerdicts = verifySim(simCells);

    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

    const md = renderReport({ sReadings, sVerdicts, simCells, simVerdicts, elapsedSec });
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, md, 'utf8');

    for (const v of sVerdicts) {
      expect(
        v.pass,
        `static check ${v.field} ${v.refKey} vs ${v.stackedKey} failed: ${v.failureDetail}`,
      ).toBe(true);
    }
    for (const v of simVerdicts) {
      expect(
        v.verdict,
        `sim verdict for ${v.field} (${v.refKey} vs ${v.stackedKey}) was ${v.verdict}`,
      ).not.toBe('still-stacks');
    }

    // eslint-disable-next-line no-console
    console.log(`\n[stackingAggregatorSim] wrote ${OUT_FILE} (${elapsedSec}s)\n`);
  }, 1_800_000);
});

function renderReport(opts: {
  sReadings: StaticReading[];
  sVerdicts: StaticVerdict[];
  simCells: SimCell[];
  simVerdicts: SimVerdict[];
  elapsedSec: string;
}): string {
  const { sReadings, sVerdicts, simCells, simVerdicts, elapsedSec } = opts;

  const staticRows = [
    '| Class | L | Loadout | AC | Crit range (n) | Blessing dmg | Blessing holy |',
    '|-------|---|---------|----|----------------|--------------|---------------|',
    ...sReadings.map(
      (r) => `| ${r.classId} | ${r.level} | ${r.loadoutKey} | ${r.ac} | ${r.critRangeSize} | ${r.blessingDamageBonus} | ${r.blessingHolyBonus} |`,
    ),
  ];

  const staticVerdictRows = [
    '| Field | Ref loadout | Stacked loadout | Pass? | Notes |',
    '|-------|-------------|-----------------|-------|-------|',
    ...sVerdicts.map(
      (v) => `| ${v.field} | ${v.refKey} | ${v.stackedKey} | ${v.pass ? 'YES' : 'NO'} | ${v.failureDetail ?? 'all class×level cells match'} |`,
    ),
  ];

  const simRows = [
    '| Class | L | Loadout | Death% | Avg rooms | Avg dmg taken | Avg dmg dealt |',
    '|-------|---|---------|--------|-----------|---------------|---------------|',
    ...simCells.map(
      (c) => `| ${c.classId} | ${c.level} | ${c.loadoutKey} | ${(c.deathRate * 100).toFixed(0)}% | ${c.avgRoomsCleared.toFixed(1)} | ${c.avgDamageTaken.toFixed(1)} | ${c.avgDamageDealt.toFixed(1)} |`,
    ),
  ];

  const simVerdictRows = [
    '| Field | Ref | Stacked | Ref dmg taken | Stk dmg taken | Δ% taken | Ref dmg dealt | Stk dmg dealt | Δ% dealt | Verdict |',
    '|-------|-----|---------|---------------|---------------|----------|---------------|---------------|----------|---------|',
    ...simVerdicts.map(
      (v) => `| ${v.field} | ${v.refKey} | ${v.stackedKey} | ${v.refDamageTaken.toFixed(1)} | ${v.stackedDamageTaken.toFixed(1)} | ${(v.damageTakenDeltaPct * 100).toFixed(1)}% | ${v.refDamageDealt.toFixed(1)} | ${v.stackedDamageDealt.toFixed(1)} | ${(v.damageDealtDeltaPct * 100).toFixed(1)}% | ${v.verdict} |`,
    ),
  ];

  const allStaticPass = sVerdicts.every((v) => v.pass);
  const allSimPass = simVerdicts.every((v) => v.verdict !== 'still-stacks');
  const headline = allStaticPass && allSimPass
    ? 'CONFIRMED — PR #80 + #86 fixes hold at engine consumption sites for all four fields'
    : 'REGRESSED — stacking signal detected; see per-field verdict below';

  const loadoutDescRows = LOADOUTS.map((l) => `- **${l.key}** — ${l.label}`).join('\n');

  return `# Stacking-aggregator re-validation (post-#86)

_Auto-generated by \`src/sim/stackingAggregatorSim.test.ts\`. Re-run with \`npm run test:run -- src/sim/stackingAggregatorSim.test.ts\`. Wall clock: ${elapsedSec}s for ${RUNS_PER_CELL} runs/cell × ${CLASSES.length} classes × ${LEVELS.length} levels × ${LOADOUTS.length} loadouts._

## Verdict

**${headline}**

## Scope

PR #80 fixed \`extraTempHpPerRoom\` so two temp-HP blessings don't sum (Lathander's Dawn +3 + Ilmater's Crown +2 grants +3, not +5). PR #86 extended the same \`max-of-individual\` carve-out to four more reachable-in-the-pool fields:

| Field | Stacking sources (pre-fix) | Expected effect post-fix |
|-------|----------------------------|--------------------------|
| \`acBonus\` | Helm's Aegis + Mystra's Ward + Silvanus's Root → +3 | +1 |
| \`critRangeBonus\` | Tempus's Edge + Tymora's Gambit → +2 (crit on 18-20) | +1 (19-20 / 18-20 for Champion) |
| \`damageBonus\` | Mystra's Whisper + Silvanus's Thorn → +2/hit | +1/hit |
| \`holyDamageBonus\` | Helm's Bulwark + Lathander's Ember → +2/hit | +1/hit |

The original immortal-hypothesis sim (\`src/sim/immortalHypothesisSim.ts\`) tested only the temp-HP case. This validation re-tests under loadouts that exercise the four newer fields and confirms the aggregator's max-of-individual output is actually CONSUMED by the engine downstream (\`derived.computeAC\`, \`derived.critRange\`, \`combat/attack/playerAttack\` damage + holy bonuses).

## Method

**Static field check (deterministic, primary).** For each class × level × loadout, build the character, read the effective AC (\`computeAC\`), crit-range size (\`critRange\`), and blessing-aggregated damage / holy bonuses (\`characterBlessingMods\`). The stacked-source value MUST equal the single-source reference. Deterministic — 1 sample per cell is sufficient.

**Sim corroboration (engine integration, secondary).** Run the full Godwake delve under each loadout, ${RUNS_PER_CELL} runs/cell × 3 classes × 3 levels. Compare avg damage taken (sensitive to AC, holy) and avg damage dealt (sensitive to crit, damage, holy) between single-source ref and stacked variants. The reference and stacked cells should be statistically indistinguishable (Δ inside ±8%).

## Loadouts

${loadoutDescRows}

## Static field check — verdict per field-pair

${staticVerdictRows.join('\n')}

## Sim corroboration — verdict per field-pair

${simVerdictRows.join('\n')}

\`Δ% taken\` = (stacked − ref) / ref for avg damage taken. Defensive fields (AC, holy) post-fix should give ≈ 0%. \`Δ% dealt\` = same for avg damage dealt; offensive fields (crit, dmg) post-fix should give ≈ 0%. "still-stacks" verdict fires if the delta breaches ±8% in the bug-signature direction.

## Static field matrix (every cell)

${staticRows.join('\n')}

## Sim matrix (every cell)

${simRows.join('\n')}

## Files

- Validation harness: \`src/sim/stackingAggregatorSim.test.ts\`
- Re-uses sim plumbing: \`src/sim/immortalHypothesisSim.ts\` (\`runDelveCustom\`, \`makeCharacterFromBlessings\`)
- Aggregator under test: \`src/engine/character/blessings.ts:82\` (\`aggregateBlessingModifiers\`)
- AC consumption: \`src/engine/character/derived.ts:82\`
- Crit-range consumption: \`src/engine/character/derived.ts:155\`
- Damage consumption: \`src/engine/combat/attack/playerAttack.ts:232\`
- Holy-damage consumption: \`src/engine/combat/attack/playerAttack.ts:237\`
`;
}
