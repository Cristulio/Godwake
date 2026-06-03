/**
 * Structural-integrity sweep for the BASE game post-split (Cells→Irenicus).
 *
 * The campaign split (#367) made `createGodwakeDelve` build the base game by
 * default (11 chapters, 10 camp seams, ending on Irenicus) and the full NG+
 * chain (14 chapters → Melissan) only under `fullChain: true`. The camp-seam
 * invariant is silent — a miswired slice keeps the build green and only a
 * reachability walk catches it — so this routes MANY seeds through a fresh base
 * delve and asserts, per seed:
 *
 *   - chapterCount === 11, exactly 11 bosses in chapters 1..11;
 *   - exactly 10 camp seams (chapters-1);
 *   - the terminal room is the Ch11 Irenicus boss (no onward seam);
 *   - every node is forward-reachable from the entry (no orphans);
 *   - every edge resolves to a real node;
 *   - every node can still reach a boss (no dead-end before a convergence).
 *
 * Plus a smaller full-chain sample to confirm NG+ still reaches Melissan (Ch14).
 *
 * Measurement only — prints a report, writes nothing. Run:
 *   npx tsx scripts/sim-structural-integrity.ts
 *   BASE_SEEDS=2000 FULL_SEEDS=200 npx tsx scripts/sim-structural-integrity.ts
 */
import {
  createGodwakeDelve,
  roomById,
  BASE_GAME_CHAPTERS,
  TOTAL_CHAPTERS,
} from '../src/engine/delve/createDelve';
import type { DelveState } from '../src/types/delve';

const BASE_SEEDS = Number(process.env.BASE_SEEDS ?? 500);
const FULL_SEEDS = Number(process.env.FULL_SEEDS ?? 50);

/** Forward-reachable id set from the entry node (DFS over `next` edges). */
function reachableFromEntry(d: DelveState): Set<string> {
  const seen = new Set<string>();
  const stack = [d.rooms[0].id];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of roomById(d, id)?.next ?? []) stack.push(n);
  }
  return seen;
}

/** True iff every node can reach a boss along forward edges (no dead ends). */
function everyNodeReachesBoss(d: DelveState): boolean {
  const reaches = (start: string): boolean => {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const r = roomById(d, id);
      if (r?.kind === 'boss') return true;
      for (const n of r?.next ?? []) stack.push(n);
    }
    return false;
  };
  return d.rooms.every((r) => reaches(r.id));
}

/** Returns the list of structural problems for one delve (empty = clean). */
function validate(d: DelveState, expectedChapters: number, finalBossDefId: string): string[] {
  const problems: string[] = [];

  if (d.chapterCount !== expectedChapters) {
    problems.push(`chapterCount ${d.chapterCount} != ${expectedChapters}`);
  }

  const bosses = d.rooms.filter((r) => r.kind === 'boss');
  if (bosses.length !== expectedChapters) {
    problems.push(`${bosses.length} bosses, expected ${expectedChapters}`);
  }
  const bossChapters = bosses.map((b) => b.chapter);
  const expectedSeq = Array.from({ length: expectedChapters }, (_, i) => i + 1);
  if (bossChapters.join(',') !== expectedSeq.join(',')) {
    problems.push(`boss chapters [${bossChapters.join(',')}] != 1..${expectedChapters}`);
  }

  const camps = d.rooms.filter((r) => r.kind === 'camp');
  if (camps.length !== expectedChapters - 1) {
    problems.push(`${camps.length} camp seams, expected ${expectedChapters - 1}`);
  }

  const finalRoom = d.rooms[d.rooms.length - 1];
  if (finalRoom.kind !== 'boss') problems.push(`final room is ${finalRoom.kind}, not a boss`);
  if (finalRoom.chapter !== expectedChapters) {
    problems.push(`final boss in chapter ${finalRoom.chapter}, expected ${expectedChapters}`);
  }
  if (finalRoom.monsters?.[0]?.defId !== finalBossDefId) {
    problems.push(`final boss ${finalRoom.monsters?.[0]?.defId} != ${finalBossDefId}`);
  }
  if ((finalRoom.next ?? []).length !== 0) problems.push('final boss is not terminal');

  const reach = reachableFromEntry(d);
  if (reach.size !== d.rooms.length) {
    problems.push(`ORPHANS: ${d.rooms.length - reach.size} of ${d.rooms.length} nodes unreachable from entry`);
  }
  for (const room of d.rooms) {
    for (const id of room.next ?? []) {
      if (!roomById(d, id)) problems.push(`dangling edge ${room.id} -> ${id}`);
    }
  }
  if (!everyNodeReachesBoss(d)) problems.push('some node cannot reach a boss (dead end)');

  return problems;
}

interface SweepResult {
  label: string;
  seeds: number;
  clean: number;
  failures: { seed: number; problems: string[] }[];
  roomCounts: number[];
  campCounts: number[];
}

function sweep(label: string, seeds: number, fullChain: boolean): SweepResult {
  const expectedChapters = fullChain ? TOTAL_CHAPTERS : BASE_GAME_CHAPTERS;
  const finalBoss = fullChain ? 'melissan' : 'irenicus';
  const failures: { seed: number; problems: string[] }[] = [];
  const roomCounts: number[] = [];
  const campCounts: number[] = [];
  let clean = 0;

  for (let seed = 0; seed < seeds; seed++) {
    const d = createGodwakeDelve({ seed, fullChain });
    roomCounts.push(d.rooms.length);
    campCounts.push(d.rooms.filter((r) => r.kind === 'camp').length);
    const problems = validate(d, expectedChapters, finalBoss);
    if (problems.length === 0) clean += 1;
    else failures.push({ seed, problems });
  }

  return { label, seeds, clean, failures, roomCounts, campCounts };
}

function stats(xs: number[]): { min: number; med: number; max: number } {
  const s = [...xs].sort((a, b) => a - b);
  return { min: s[0], med: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
}

function report(r: SweepResult): void {
  const rc = stats(r.roomCounts);
  const cc = stats(r.campCounts);
  console.log(`\n=== ${r.label} — ${r.seeds} seeds ===`);
  console.log(`  clean: ${r.clean}/${r.seeds} (${((r.clean / r.seeds) * 100).toFixed(1)}%)`);
  console.log(`  rooms/delve: min ${rc.min}, median ${rc.med}, max ${rc.max}`);
  console.log(`  camps/delve: min ${cc.min}, median ${cc.med}, max ${cc.max}`);
  if (r.failures.length > 0) {
    console.log(`  FAILURES: ${r.failures.length}`);
    for (const f of r.failures.slice(0, 12)) {
      console.log(`    seed ${f.seed}: ${f.problems.join(' | ')}`);
    }
    if (r.failures.length > 12) console.log(`    ... and ${r.failures.length - 12} more`);
  } else {
    console.log('  FAILURES: none — every seed is whole and reaches its finale.');
  }
}

function main(): void {
  console.log(
    `Structural-integrity sweep — BASE ${BASE_SEEDS} seeds (11ch→Irenicus), FULL ${FULL_SEEDS} seeds (14ch→Melissan)`,
  );
  const base = sweep('BASE game (Cells→Irenicus)', BASE_SEEDS, false);
  const full = sweep('FULL chain / NG+ (Cells→Throne)', FULL_SEEDS, true);
  report(base);
  report(full);

  const totalFail = base.failures.length + full.failures.length;
  console.log(
    `\nVERDICT: ${totalFail === 0 ? 'PASS — no disconnection, no orphans, every finale reachable.' : `FAIL — ${totalFail} seed(s) with structural problems (see above).`}`,
  );
}

main();
