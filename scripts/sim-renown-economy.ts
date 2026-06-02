/**
 * Renown economy analysis: total Grove tree cost vs realized renown income.
 * Read-only measurement — imports the live upgrade + ascension data and the
 * delveStore renown formula, computes tree totals and runs-to-afford.
 *
 *   npx tsx scripts/sim-renown-economy.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listUpgrades, type Upgrade } from '../src/content/upgrades/index';
import { ascensionUpgradeCostMult, getAscensionLevel } from '../src/engine/delve/ascension';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import type { RoomSpec } from '../src/types/delve';

// ── Live renown formula (mirrors src/stores/delveStore.computeDelveRenown) ──
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 3;
const RENOWN_PER_MOB_KILLED = 2;
const RENOWN_PER_CHAPTER_BOSS = 25;
const RENOWN_PER_ROOM_REACHED = 1;

function liveRenown(opts: {
  cleared: boolean;
  mobs: number;
  bosses: number;
  rooms: number;
  soulMark: number;
  renownMult: number;
}): number {
  const base =
    (opts.cleared ? RENOWN_PER_DELVE_CLEAR : RENOWN_PER_DELVE_FAILURE) +
    RENOWN_PER_MOB_KILLED * opts.mobs +
    RENOWN_PER_CHAPTER_BOSS * opts.bosses +
    RENOWN_PER_ROOM_REACHED * opts.rooms;
  return Math.floor(base * opts.soulMark * opts.renownMult);
}

function treeCostAtAsc(upgrades: Upgrade[], asc: number): number {
  const mult = ascensionUpgradeCostMult(asc);
  let total = 0;
  for (const u of upgrades) {
    for (let r = 1; r <= u.maxRank; r++) {
      total += Math.round(u.costForRank(r) * mult);
    }
  }
  return total;
}

const all = listUpgrades();
const shared = all.filter((u) => !u.classId);
const byClass: Record<string, Upgrade[]> = {};
for (const u of all) {
  if (u.classId) (byClass[u.classId] ??= []).push(u);
}

// What one soul actually faces: shared nodes + its own class nodes.
function perClassTree(classId: string): Upgrade[] {
  return [...shared, ...(byClass[classId] ?? [])];
}

console.log('=== GROVE TREE COST (sum of every rank to max) ===\n');
console.log(`Shared nodes (${shared.length}): base-Asc0 = ${treeCostAtAsc(shared, 0)} renown`);
for (const cls of Object.keys(byClass)) {
  const t = perClassTree(cls);
  console.log(
    `  ${cls.padEnd(10)} full tree (shared+class, ${t.length} nodes): Asc0 = ${treeCostAtAsc(t, 0)}`,
  );
}
console.log(`  ALL NODES (${all.length}): Asc0 = ${treeCostAtAsc(all, 0)}\n`);

// gated nodes break-out
const gated = all.filter((u) => u.unlock);
console.log('Ascension-gated nodes (need NG+ to even buy):');
for (const u of gated) {
  let c = 0;
  for (let r = 1; r <= u.maxRank; r++) c += u.costForRank(r);
  console.log(`  ${u.id} (asc>=${u.unlock!.ascension}) maxRank ${u.maxRank}: ${c} renown`);
}
console.log();

console.log('=== PER-CLASS TREE COST ACROSS ASCENSION ===');
console.log('(price mult: ' + [0, 1, 2, 3, 4, 5, 6].map((a) => `A${a}=${ascensionUpgradeCostMult(a)}`).join('  ') + ')\n');
const repClass = 'fighter';
const repTree = perClassTree(repClass);
console.log(`Representative single-soul tree = ${repClass} (shared + class):`);
for (const a of [0, 1, 2, 3, 4, 5, 6]) {
  console.log(`  Asc${a}: ${treeCostAtAsc(repTree, a)} renown  (renownMult income x${getAscensionLevel(a).renownMult})`);
}
console.log();

console.log('=== INCOME-vs-PRICE SCALING RATIO (the NG+ hypothesis) ===\n');
console.log('asc | renownMult(income) | upgradeCostMult(price) | income/price ratio vs A0');
for (const a of [0, 1, 2, 3, 4, 5, 6]) {
  const inc = getAscensionLevel(a).renownMult;
  const price = ascensionUpgradeCostMult(a);
  const ratio = inc / price;
  console.log(
    `A${a}  | ${inc.toFixed(2).padStart(6)}            | ${price.toFixed(2).padStart(6)}                 | ${ratio.toFixed(3)} (${((ratio - 1) * 100).toFixed(0)}% ${ratio >= 1 ? 'cheaper' : 'dearer'} than A0)`,
  );
}

// ── Competent full-clear run: route ONE path through a fresh delve to the end ──
function routeFullClear(seed: number): { rooms: number; mobs: number; bosses: number } {
  const delve = createGodwakeDelve({ seed, ascension: 0 });
  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  let curId: string | undefined = delve.rooms[0]?.id;
  const guard = new Set<string>();
  let rooms = 0;
  let mobs = 0;
  let bosses = 0;
  while (curId && !guard.has(curId)) {
    guard.add(curId);
    const room: RoomSpec | undefined = byId.get(curId);
    if (!room) break;
    rooms += 1;
    const isCombat = room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss';
    if (isCombat) mobs += (room.monsters ?? []).reduce((n, m) => n + m.count, 0);
    if (room.kind === 'boss') bosses += 1;
    const nexts = room.next ?? [];
    if (nexts.length >= 1) {
      curId = nexts[(seed + rooms) % nexts.length];
    } else {
      const ni = delve.rooms.findIndex((r) => r.id === curId) + 1;
      curId = ni > 0 && ni < delve.rooms.length ? delve.rooms[ni].id : undefined;
    }
  }
  return { rooms, mobs, bosses };
}

console.log('\n=== COMPETENT FULL-CLEAR RUN STRUCTURE (one routed path, 14-ch chain) ===\n');
const clearSamples = Array.from({ length: 40 }, (_, i) => routeFullClear(1000 + i * 13));
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clrRooms = avg(clearSamples.map((s) => s.rooms));
const clrMobs = avg(clearSamples.map((s) => s.mobs));
const clrBosses = avg(clearSamples.map((s) => s.bosses));
console.log(`Mean routed path: ${clrRooms.toFixed(1)} rooms, ${clrMobs.toFixed(1)} mobs, ${clrBosses.toFixed(1)} bosses`);
for (const sm of [1.0, 1.4]) {
  const r = liveRenown({ cleared: true, mobs: clrMobs, bosses: clrBosses, rooms: clrRooms, soulMark: sm, renownMult: 1 });
  console.log(`  CLEAR renown @ Asc0, soulMark ${sm}: ${r}`);
}
for (const a of [0, 1, 2, 3, 4, 5, 6]) {
  const r = liveRenown({ cleared: true, mobs: clrMobs, bosses: clrBosses, rooms: clrRooms, soulMark: 1.4, renownMult: getAscensionLevel(a).renownMult });
  console.log(`  CLEAR renown @ Asc${a} (soulMark 1.4, x${getAscensionLevel(a).renownMult}): ${r}`);
}

// ── Bot-floor income from the sim's life-records (live formula applied) ──
console.log('\n=== BOT-FLOOR REALIZED INCOME (sim life-records, LIVE formula) ===');
console.log('(the Auto-Battle bot never clears — strict LOWER bound; the user clears by hand)\n');
type Rec = { cleared: boolean; mobsKilled: number; roomsReached: number; bossesKilled: number; finalRoomIdx: number; ascension: number };
let recs: Rec[] = [];
try {
  recs = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/sim-findings/life-records.json'), 'utf8'));
} catch {
  console.log('  (no life-records.json — run sim-class-viability first)');
}
if (recs.length) {
  // Bare soul (no banes) => soulMark 1.0; all sim lives are Asc0 here.
  const incomes = recs.map((r) =>
    liveRenown({ cleared: r.cleared, mobs: r.mobsKilled, bosses: r.bossesKilled, rooms: r.roomsReached, soulMark: 1.0, renownMult: getAscensionLevel(r.ascension).renownMult }),
  );
  const sorted = [...incomes].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
  console.log(`  N lives: ${recs.length}, cleared: ${recs.filter((r) => r.cleared).length}`);
  console.log(`  mean mobs/life: ${avg(recs.map((r) => r.mobsKilled)).toFixed(1)}, mean rooms: ${avg(recs.map((r) => r.roomsReached)).toFixed(1)}, mean bosses: ${avg(recs.map((r) => r.bossesKilled)).toFixed(2)}`);
  console.log(`  live renown/life — mean ${avg(incomes).toFixed(1)}, median ${q(0.5)}, p10 ${q(0.1)}, p90 ${q(0.9)}, max ${sorted[sorted.length - 1]}`);
  // bucket by depth
  const shallow = incomes.filter((_, i) => recs[i].finalRoomIdx <= 3);
  const mid = incomes.filter((_, i) => recs[i].finalRoomIdx > 3 && recs[i].finalRoomIdx <= 8);
  const deep = incomes.filter((_, i) => recs[i].finalRoomIdx > 8);
  const m = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '—');
  console.log(`  by depth: shallow(<=3 rms, n=${shallow.length}) ${m(shallow)} | mid(4-8, n=${mid.length}) ${m(mid)} | deep(>8, n=${deep.length}) ${m(deep)}`);
}

// ── Runs-to-afford ──
console.log('\n=== RUNS-TO-AFFORD (representative fighter tree) ===\n');
const clearIncomeA0 = liveRenown({ cleared: true, mobs: clrMobs, bosses: clrBosses, rooms: clrRooms, soulMark: 1.4, renownMult: 1 });
const botMean = recs.length ? avg(recs.map((r) => liveRenown({ cleared: r.cleared, mobs: r.mobsKilled, bosses: r.bossesKilled, rooms: r.roomsReached, soulMark: 1.0, renownMult: 1 }))) : 0;
const firstUpgrade = 25; // Pilgrim's Boots, cheapest meaningful node
console.log(`Income model A: competent CLEAR = ${clearIncomeA0} renown/run (soulMark 1.4)`);
console.log(`Income model B: bot-floor mean = ${botMean.toFixed(1)} renown/run (never clears, bare soul)`);
for (const a of [0, 3, 6]) {
  const tree = treeCostAtAsc(repTree, a);
  const clrInc = liveRenown({ cleared: true, mobs: clrMobs, bosses: clrBosses, rooms: clrRooms, soulMark: 1.4, renownMult: getAscensionLevel(a).renownMult });
  console.log(`  Asc${a}: tree ${tree} | clear-income ${clrInc}/run → first upgrade(${firstUpgrade}) in ${(firstUpgrade * ascensionUpgradeCostMult(a) / clrInc).toFixed(2)} runs, MAX tree in ${(tree / clrInc).toFixed(1)} runs`);
}
