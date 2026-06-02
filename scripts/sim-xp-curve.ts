/**
 * Instrument the realized cumulative XP a typical full-clear run banks at the
 * end of each chapter. Generates many Godwake delves, routes ONE node per map
 * column (the branching layout — a player walks a single path, not every room),
 * and sums xpReward per chapter. Reports the median cumulative XP at the end of
 * Ch1..Ch14 so the XP_TABLE can be re-fit to land L20 at the target chapter.
 *
 * Routing policies bound the band:
 *   - random:  pick a uniformly random reachable node each step (neutral).
 *   - combat:  prefer a combat/elite/boss node when the column offers one
 *              (an XP-hungry player who still must take forced special columns).
 *
 * Run: npx tsx scripts/sim-xp-curve.ts
 */
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { reachableRooms } from '../src/engine/delve/createDelve';
import { randomSeed } from '../src/engine/dice/rng';
import type { DelveState, RoomSpec } from '../src/types/delve';

const RUNS = 4000;
const TOTAL_CHAPTERS = 14;

type Policy = 'random' | 'combat';

const isCombat = (r: RoomSpec): boolean =>
  r.kind === 'combat' || r.kind === 'elite' || r.kind === 'boss';

function routeXpByChapter(state: DelveState, policy: Policy, rand: () => number): number[] {
  const perChapter = new Array(TOTAL_CHAPTERS + 1).fill(0);
  let room: RoomSpec | undefined = state.rooms[0];
  const seen = new Set<string>();
  while (room && !seen.has(room.id)) {
    seen.add(room.id);
    if (room.xpReward && room.chapter) perChapter[room.chapter] += room.xpReward;
    const nexts = reachableRooms(state, room);
    if (nexts.length === 0) break;
    let pick: RoomSpec;
    if (policy === 'combat') {
      const combats = nexts.filter(isCombat);
      const choices = combats.length > 0 ? combats : nexts;
      pick = choices[Math.floor(rand() * choices.length)];
    } else {
      pick = nexts[Math.floor(rand() * nexts.length)];
    }
    room = pick;
  }
  return perChapter;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function run(policy: Policy): number[] {
  // cumulative XP at end of each chapter, one sample per run
  const cumSamples: number[][] = Array.from({ length: TOTAL_CHAPTERS + 1 }, () => []);
  for (let i = 0; i < RUNS; i++) {
    const seed = randomSeed();
    const state = createGodwakeDelve({ seed, ascension: 0, elitesEnabled: true });
    const rand = () => Math.random();
    const per = routeXpByChapter(state, policy, rand);
    let cum = 0;
    for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
      cum += per[ch];
      cumSamples[ch].push(cum);
    }
  }
  return cumSamples.map((s, ch) => (ch === 0 ? 0 : median(s)));
}

const XP_TABLE = [
  0, 200, 500, 1000, 1900, 3200, 5000, 7400, 10000, 14000, 18800, 24400, 30800,
  38000, 46000, 54800, 64400, 74800, 86000, 98000,
];
function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_TABLE.length; i++) if (xp >= XP_TABLE[i]) lvl = i + 1;
  return lvl;
}

const bossCR = [2, 4, 5, 6, 8, 10, 11, 12, 13, 13, 14, 15, 16, 17];

for (const policy of ['random', 'combat'] as Policy[]) {
  const cum = run(policy);
  console.log(`\n=== policy: ${policy} (median of ${RUNS} runs, Asc0, elites on) ===`);
  console.log('Ch | cumXP   | curLvl@end | bossCR');
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    console.log(
      `${String(ch).padStart(2)} | ${String(cum[ch]).padStart(7)} | ${String(
        levelForXp(cum[ch]),
      ).padStart(10)} | ${bossCR[ch - 1]}`,
    );
  }
}
