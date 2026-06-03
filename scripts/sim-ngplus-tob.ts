/**
 * New Game+ / Throne-of-Bhaal validation harness — MEASURE ONLY.
 *
 * The campaign was split (#367): the base game ends at Irenicus (Ch11); New
 * Game+ runs the FULL fourteen-chapter chain through the Throne-of-Bhaal arc
 * (Ch12 Yaga-Shura · Ch13 Abazigal/Sendai · Ch14 Melissan). This harness
 * answers two NG+-specific questions the existing sims cannot:
 *
 *   1. STRUCTURE / REACHABILITY — route MANY `fullChain` seeds and confirm every
 *      run is a complete 14-chapter chain ending at Melissan, with the
 *      chapterCount-1 = 13 camp seams and zero orphan rooms (BFS from entry over
 *      the `next` edges must reach every node). Reports rooms-per-chapter and the
 *      routed-path depth distribution PAST Ch11 (the ToB arc).
 *
 *   2. ToB SURVIVABILITY at the power a player ARRIVES with — the death+reincarnation
 *      bot floor dies ~Ch8-9 even at L20 (see sim-feel / sim-class-viability), so
 *      it never reaches the ToB arc by walking the chain. Instead we drop an
 *      "arriving player" (L20 + an accrued shrine-blessing build, the level a
 *      player reaches by ~Ch11-12 per the XP curve) at each chapter's camp seam
 *      (full long-rest), then walk that ONE chapter's routed rooms with no free
 *      heals to its boss. Repeated across classes × seeds × ascension 0→6.
 *
 *   This is a conservative FLOOR read: the arriving build is gear-light (archetype
 *   starter kit + blessings only — no endgame affix gear, legendaries, or Grove
 *   nodes a real NG+ player banks). A real player is strictly stronger, so if the
 *   floor build clears ToB at sane tension the player certainly does; a floor-build
 *   wall is a flag, tempered by the gear caveat. Read the SHAPE (Ch12-14 vs the
 *   Ch10/11 calibration baseline, and the asc-0→6 ramp), not the magnitudes.
 *
 *   ASCENSIONS=0,1,2,3,4,5,6 SEEDS=60 LEVEL=20 npx tsx scripts/sim-ngplus-tob.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack';
import { endTurn } from '../src/engine/combat/turn';
import { runAutoTurn } from '../src/engine/combat/actionPolicy';
import { clampAscension, getAscensionLevel, MAX_ASCENSION } from '../src/engine/delve/ascension';
import { shortRestHeal, longRest, withResetActionEconomy } from '../src/engine/character/actions';
import { characterAtLevel, pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import { TOTAL_CHAPTERS } from '../src/engine/delve/constants';
import { rollItem } from '../src/engine/items/rollItem';
import { equipItem } from '../src/engine/character/equip';
import { legendaryDropPool, aggregateLegendaryEffects, canEquipLegendary } from '../src/content/legendaries';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec, DelveState } from '../src/types/delve';
import type { ClassId } from '../src/schemas/ids';
import type { GearRarity, BaseKind } from '../src/schemas/item';

// ─── Config ──────────────────────────────────────────────────────────────────
const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard', 'barbarian', 'ranger'];
const ASCENSIONS = (process.env.ASCENSIONS ?? '0,1,2,3,4,5,6')
  .split(',')
  .map((s) => clampAscension(Number(s.trim())))
  .filter((n, i, a) => a.indexOf(n) === i);
const SEEDS = Number(process.env.SEEDS ?? 60);
const LEVEL = Number(process.env.LEVEL ?? 20);
const STRUCT_SEEDS = Number(process.env.STRUCT_SEEDS ?? 400);
/** Chapters we isolate: the late base-game pair (calibration baseline) + the ToB arc. */
const FOCUS_CHAPTERS = [10, 11, 12, 13, 14];
/** Shrine picks pre-rolled to model the build a player accrues by the time they arrive. */
const ARRIVING_BLESSINGS = 11;
const MAX_ROUNDS = 25;
const MAX_STEPS = MAX_ROUNDS * 8;
const SEED_BASE = 0x70b >>> 0;

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);

// ─── Structure / reachability ─────────────────────────────────────────────────

interface StructResult {
  ok: boolean;
  problems: string[];
  totalRooms: number;
  campCount: number;
  bossChapters: number[];
  terminalBoss: string | undefined;
  orphans: number;
  roomsPerChapter: Map<number, number>;
  routedDepthPerChapter: Map<number, number>;
  routedDepthTotal: number;
}

/** BFS over `next` edges from the entry — count nodes never reached (orphans). */
function countOrphans(delve: DelveState): number {
  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  const seen = new Set<string>();
  const queue = [delve.rooms[0]?.id].filter(Boolean) as string[];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const room = byId.get(id);
    for (const n of room?.next ?? []) if (!seen.has(n)) queue.push(n);
  }
  return delve.rooms.length - seen.size;
}

/** Walk ONE route end-to-end, tallying routed rooms per chapter. */
function routedDepth(delve: DelveState, seed: number): Map<number, number> {
  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  const perCh = new Map<number, number>();
  let cur: string | undefined = delve.rooms[0]?.id;
  const guard = new Set<string>();
  let step = 0;
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const room = byId.get(cur);
    if (!room) break;
    const ch = room.chapter ?? 0;
    perCh.set(ch, (perCh.get(ch) ?? 0) + 1);
    const nexts = room.next ?? [];
    if (nexts.length === 0) break;
    cur = nexts.length === 1 ? nexts[0] : nexts[(seed + step) % nexts.length];
    step += 1;
  }
  return perCh;
}

function validateStructure(seeds: number): StructResult {
  const problems: string[] = [];
  let totalRooms = 0;
  let campCount = 0;
  let orphans = 0;
  let terminalBoss: string | undefined;
  let bossChapters: number[] = [];
  const roomsPerChapter = new Map<number, number>();
  const routedDepthPerChapter = new Map<number, number>();
  let routedDepthTotal = 0;

  for (let i = 0; i < seeds; i++) {
    const seed = (SEED_BASE * 2654435761 + i * 40503) >>> 0;
    const delve = createGodwakeDelve({ seed, ascension: 0, fullChain: true });
    const bosses = delve.rooms.filter((r) => r.kind === 'boss');
    const camps = delve.rooms.filter((r) => r.kind === 'camp');
    const chs = bosses.map((b) => b.chapter ?? 0);

    if (bosses.length !== TOTAL_CHAPTERS) problems.push(`seed ${seed}: ${bosses.length} bosses (want ${TOTAL_CHAPTERS})`);
    if (camps.length !== TOTAL_CHAPTERS - 1) problems.push(`seed ${seed}: ${camps.length} camps (want ${TOTAL_CHAPTERS - 1})`);
    const expectChs = Array.from({ length: TOTAL_CHAPTERS }, (_, k) => k + 1);
    if (JSON.stringify(chs) !== JSON.stringify(expectChs)) problems.push(`seed ${seed}: boss chapters ${chs.join(',')} not 1..${TOTAL_CHAPTERS}`);
    const last = delve.rooms[delve.rooms.length - 1];
    if (last.kind !== 'boss' || last.chapter !== TOTAL_CHAPTERS) problems.push(`seed ${seed}: terminal room not Ch${TOTAL_CHAPTERS} boss`);
    if ((last.next ?? []).length !== 0) problems.push(`seed ${seed}: terminal boss has outgoing edges`);
    const o = countOrphans(delve);
    if (o !== 0) problems.push(`seed ${seed}: ${o} orphan room(s) unreachable from entry`);

    orphans += o;
    totalRooms += delve.rooms.length;
    campCount += camps.length;
    terminalBoss = last.monsters?.[0]?.defId;
    bossChapters = chs;
    for (const r of delve.rooms) {
      const ch = r.chapter ?? 0;
      roomsPerChapter.set(ch, (roomsPerChapter.get(ch) ?? 0) + 1);
    }
    const rd = routedDepth(delve, seed);
    for (const [ch, n] of rd) routedDepthPerChapter.set(ch, (routedDepthPerChapter.get(ch) ?? 0) + n);
    routedDepthTotal += [...rd.values()].reduce((a, b) => a + b, 0);
  }

  // Average the accumulators.
  for (const [ch, n] of roomsPerChapter) roomsPerChapter.set(ch, n / seeds);
  for (const [ch, n] of routedDepthPerChapter) routedDepthPerChapter.set(ch, n / seeds);

  return {
    ok: problems.length === 0,
    problems: problems.slice(0, 12),
    totalRooms: totalRooms / seeds,
    campCount: campCount / seeds,
    bossChapters,
    terminalBoss,
    orphans,
    roomsPerChapter,
    routedDepthPerChapter,
    routedDepthTotal: routedDepthTotal / seeds,
  };
}

// ─── Combat driver (ascension-aware, mirrors sim-feel.runFight) ───────────────

interface FightOut {
  character: Character;
  win: boolean;
  minHpPct: number;
  rounds: number;
  /** Enemy HP remaining / max at fight end (0 on a clean win) — the gear-gap signal on a loss. */
  enemyHpFrac: number;
}

function enemyHpFractionRemaining(s: CombatState): number {
  let cur = 0;
  let max = 0;
  for (const c of s.combatants) {
    if (c.kind === 'monster') {
      cur += Math.max(0, c.instance.hp.current);
      max += c.instance.hp.max;
    }
  }
  return max > 0 ? cur / max : 0;
}

function runRoomFight(roller: DiceRoller, characterIn: Character, room: RoomSpec, ascension: number): FightOut {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, (_, i) => ({
      def,
      displayName: rm.displayPrefix ? `${rm.displayPrefix} ${i + 1}` : def.name,
    }));
  });
  const isBoss = room.kind === 'boss';
  const isElite = room.kind === 'elite';
  const init = createCombat({
    roller,
    character: withResetActionEconomy(characterIn),
    monsters: monsterRefs,
    ascension,
    isBoss,
    isElite,
    twistId: room.twistId,
  });
  let s: CombatState = init.state;
  let ch = init.character;
  let minHpPct = ch.hp.current / ch.hp.max;

  let guard = 0;
  while (s.status === 'active' && guard < MAX_STEPS) {
    guard += 1;
    if (s.round > MAX_ROUNDS) break;
    const currentId = s.turnOrder[s.currentTurnIndex];
    if (currentId === 'player') {
      if (ch.hp.current <= 0) break;
      const r = runAutoTurn(roller, s, ch);
      s = r.state;
      ch = r.character;
      minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      const r = monsterAttack({ roller, character: ch, state: s }, currentId);
      s = r.state;
      ch = r.character;
      minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }
  const win = s.status === 'player-victory';
  return { character: ch, win, minHpPct, rounds: s.round, enemyHpFrac: win ? 0 : enemyHpFractionRemaining(s) };
}

// ─── Per-chapter walk (camp long-rest → routed rooms → boss) ──────────────────

interface ChapterOut {
  reachedBoss: boolean;
  bossWin: boolean;
  clearedChapter: boolean;
  roomsFought: number;
  bossMinHp: number;
  bossRounds: number;
  minHpChapter: number;
}

function walkChapter(
  roller: DiceRoller,
  arriving: Character,
  delve: DelveState,
  chapter: number,
  ascension: number,
): ChapterOut {
  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  // Camp seam before the chapter = full long rest at the arriving build.
  let ch = longRest({ ...arriving, hp: { ...arriving.hp, current: arriving.hp.max, temp: 0 } });
  let cur: RoomSpec | undefined = delve.rooms.find((r) => r.chapter === chapter && r.kind !== 'camp');
  const guard = new Set<string>();
  let roomsFought = 0;
  let reachedBoss = false;
  let bossWin = false;
  let bossMinHp = 1;
  let bossRounds = 0;
  let minHpChapter = 1;
  let died = false;

  while (cur && cur.chapter === chapter && !guard.has(cur.id)) {
    guard.add(cur.id);
    if (cur.kind === 'rest') {
      ch = shortRestHeal(ch, Math.floor(ch.hp.max * 0.7));
    } else if (cur.kind === 'combat' || cur.kind === 'elite' || cur.kind === 'boss') {
      const f = runRoomFight(roller, ch, cur, ascension);
      ch = f.character;
      roomsFought += 1;
      minHpChapter = Math.min(minHpChapter, f.minHpPct);
      if (cur.kind === 'boss') {
        reachedBoss = true;
        bossWin = f.win;
        bossMinHp = f.minHpPct;
        bossRounds = f.rounds;
      }
      if (!f.win) {
        died = true;
        break;
      }
    }
    // shrine / event / shop / treasure: skip (the arriving build is fixed).
    const nexts = (cur.next ?? [])
      .map((id) => byId.get(id))
      .filter((r): r is RoomSpec => !!r && r.chapter === chapter);
    if (cur.kind === 'boss' || nexts.length === 0) break;
    cur = nexts.length === 1 ? nexts[0] : nexts[roller.roll({ count: 1, die: 20, modifier: 0 }).total % nexts.length];
  }

  return {
    reachedBoss,
    bossWin,
    clearedChapter: !died && reachedBoss && bossWin,
    roomsFought,
    bossMinHp,
    bossRounds,
    minHpChapter,
  };
}

// ─── Representative-geared arriving player ────────────────────────────────────
// The gear-light read is a conservative FLOOR. To bracket the gear gap, also
// model a player who arrives with the endgame loadout the loot loop hands out by
// the ToB arc: a high-rarity item rolled into each slot at Throne depth + a pair
// of attuned class legendaries (mirrors what sim-class-viability equips, minus the
// full greedy comparison — one rolled item per slot, so no downgrade risk).
const GEAR_SLOTS: { kind: BaseKind; rarity: GearRarity }[] = [
  { kind: 'weapon', rarity: 'legendary' },
  { kind: 'armor', rarity: 'legendary' },
  { kind: 'accessory', rarity: 'purple' },
  { kind: 'accessory', rarity: 'purple' },
];

function gearUpArriving(roller: DiceRoller, base: Character): Character {
  let ch = base;
  for (const { kind, rarity } of GEAR_SLOTS) {
    const ref = rollItem(roller, { rarity, classId: ch.classId, kind, depth: TOTAL_CHAPTERS });
    const idx = ch.inventory.length;
    ch = equipItem({ ...ch, inventory: [...ch.inventory, ref] }, idx);
  }
  const relics = legendaryDropPool(ch.classId)
    .filter((id) => canEquipLegendary(id, ch.classId))
    .slice(0, 2);
  if (relics.length) ch = { ...ch, legendaryEffects: aggregateLegendaryEffects(relics) };
  return { ...ch, hp: { ...ch.hp, current: ch.hp.max, temp: 0 } };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

interface Cell {
  runs: number;
  // Whole-chapter attrition walk (camp→boss, no free heals — gear-sensitive floor).
  clears: number;
  bossReached: number;
  chapterMinHpSum: number;
  roomsFoughtSum: number;
  // Boss-only wall check (rested, full HP — gear-confound removed).
  bossOnlyRuns: number;
  bossOnlyWins: number;
  bossOnlyMinHpSum: number;
  bossOnlyRoundsSum: number;
  bossOnlyLosses: number;
  bossOnlyLossEnemyHpSum: number; // boss HP frac remaining, summed over losses
  // Same wall check but with a representative endgame loadout (the gear bracket).
  gearedRuns: number;
  gearedWins: number;
  gearedMinHpSum: number;
  gearedLosses: number;
  gearedLossEnemyHpSum: number;
}
const freshCell = (): Cell => ({
  runs: 0,
  clears: 0,
  bossReached: 0,
  chapterMinHpSum: 0,
  roomsFoughtSum: 0,
  bossOnlyRuns: 0,
  bossOnlyWins: 0,
  bossOnlyMinHpSum: 0,
  bossOnlyRoundsSum: 0,
  bossOnlyLosses: 0,
  bossOnlyLossEnemyHpSum: 0,
  gearedRuns: 0,
  gearedWins: 0,
  gearedMinHpSum: 0,
  gearedLosses: 0,
  gearedLossEnemyHpSum: 0,
});

function main(): void {
  const t0 = Date.now();

  // ── Structure ──
  const struct = validateStructure(STRUCT_SEEDS);

  // ── Survivability matrix: [chapter][ascension] aggregated over classes × seeds ──
  const cells = new Map<string, Cell>(); // key `${ch}|${asc}`

  for (const asc of ASCENSIONS) {
    for (const cls of CLASSES) {
      for (let i = 0; i < SEEDS; i++) {
        const seed = (SEED_BASE + asc * 1000003 + cls.charCodeAt(0) * 7919 + i * 104729) >>> 0;
        const roller = createDiceRoller(seed);
        setActiveRoller(seed);
        // Arriving build: L20 + accrued blessings (rolled on this roller).
        let arriving = characterAtLevel(cls, LEVEL);
        for (let b = 0; b < ARRIVING_BLESSINGS; b += 1) arriving = pickBlessingAtShrine(roller, arriving);
        // Representative-geared variant of the same build (the gear bracket).
        const gearedArriving = gearUpArriving(roller, arriving);
        const delve = createGodwakeDelve({ seed, ascension: asc, fullChain: true });

        for (const chapter of FOCUS_CHAPTERS) {
          const key = `${chapter}|${asc}`;
          const cell = cells.get(key) ?? freshCell();

          // (a) Whole-chapter attrition walk — gear-sensitive floor.
          const out = walkChapter(roller, arriving, delve, chapter, asc);
          cell.runs += 1;
          if (out.clearedChapter) cell.clears += 1;
          if (out.reachedBoss) cell.bossReached += 1;
          cell.chapterMinHpSum += out.minHpChapter;
          cell.roomsFoughtSum += out.roomsFought;

          // (b) Boss-only wall check — rested player dropped straight onto the boss
          // at full HP, gear-confound removed. The definitive "brick wall vs pushover".
          const bossRoom = delve.rooms.find((r) => r.chapter === chapter && r.kind === 'boss');
          if (bossRoom) {
            const rested = longRest({ ...arriving, hp: { ...arriving.hp, current: arriving.hp.max, temp: 0 } });
            const bf = runRoomFight(roller, rested, bossRoom, asc);
            cell.bossOnlyRuns += 1;
            cell.bossOnlyMinHpSum += bf.minHpPct;
            cell.bossOnlyRoundsSum += bf.rounds;
            if (bf.win) {
              cell.bossOnlyWins += 1;
            } else {
              cell.bossOnlyLosses += 1;
              cell.bossOnlyLossEnemyHpSum += bf.enemyHpFrac;
            }
            // (c) Same wall, representative-geared — brackets the gear gap.
            const gf = runRoomFight(roller, gearedArriving, bossRoom, asc);
            cell.gearedRuns += 1;
            cell.gearedMinHpSum += gf.minHpPct;
            if (gf.win) {
              cell.gearedWins += 1;
            } else {
              cell.gearedLosses += 1;
              cell.gearedLossEnemyHpSum += gf.enemyHpFrac;
            }
          }
          cells.set(key, cell);
        }
      }
    }
  }

  // ─── Render ───
  const L: string[] = [];
  L.push('# New Game+ / Throne-of-Bhaal validation — raw output\n');
  L.push(`> Auto-generated by \`scripts/sim-ngplus-tob.ts\`. Re-run with \`SEEDS=${SEEDS} ASCENSIONS=${ASCENSIONS.join(',')} npx tsx scripts/sim-ngplus-tob.ts\`.`);
  L.push(`> Curated reading lives in [\`ngplus-ascension-economy.md\`](./ngplus-ascension-economy.md).\n`);
  L.push(`**Arriving-player model:** L${LEVEL} ${CLASSES.length}-class archetypes + ${ARRIVING_BLESSINGS} accrued shrine blessings, gear-light (no endgame affixes/legendaries/Grove). Full long-rest at each chapter's camp seam, then the chapter's routed rooms with no free heals to the boss. ${SEEDS} seeds × ${CLASSES.length} classes per cell. Wall: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

  // STRUCTURE
  L.push('\n## 1. Structure / reachability\n');
  L.push(`- **Verdict:** ${struct.ok ? '✅ all seeds well-formed' : `❌ ${struct.problems.length}+ problems`} across **${STRUCT_SEEDS} fullChain seeds**.`);
  L.push(`- Bosses per run: ${struct.bossChapters.length} (chapters ${struct.bossChapters.join(',')}).`);
  L.push(`- Terminal boss: \`${struct.terminalBoss}\` (Ch${TOTAL_CHAPTERS}).`);
  L.push(`- Camp seams: ${f1(struct.campCount)} (want ${TOTAL_CHAPTERS - 1}). Total rooms/run: ${f1(struct.totalRooms)}. Orphan rooms (BFS from entry): ${struct.orphans}.`);
  if (struct.problems.length) L.push(`- Problems:\n${struct.problems.map((p) => `  - ${p}`).join('\n')}`);
  L.push('\n**Rooms per chapter** (full graph, avg) + **routed-path rooms** (one walked route, avg):\n');
  L.push('| Chapter | Rooms in graph | Routed rooms |');
  L.push('|--------:|---------------:|-------------:|');
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    L.push(`| Ch${ch}${ch === 11 ? ' (base end)' : ch >= 12 ? ' (ToB)' : ''} | ${f1(struct.roomsPerChapter.get(ch) ?? 0)} | ${f1(struct.routedDepthPerChapter.get(ch) ?? 0)} |`);
  }
  const past11Graph = [12, 13, 14].reduce((a, c) => a + (struct.roomsPerChapter.get(c) ?? 0), 0);
  const past11Routed = [12, 13, 14].reduce((a, c) => a + (struct.routedDepthPerChapter.get(c) ?? 0), 0);
  L.push(`\n- **Depth past Ch11 (the ToB arc):** ${f1(past11Graph)} rooms in graph, ${f1(past11Routed)} on a routed path. Total routed path: ${f1(struct.routedDepthTotal)} rooms.`);

  const header = '| Chapter |' + ASCENSIONS.map((a) => ` A${a} |`).join('');
  const sep = '|--------:|' + ASCENSIONS.map(() => '----:|').join('');
  const chLabel = (ch: number) =>
    `Ch${ch}${ch === 14 ? ' Melissan' : ch === 13 ? ' Abazigal' : ch === 12 ? ' Yaga-Shura' : ch === 11 ? ' Irenicus·base-end' : ''}${ch >= 12 ? ' ⟨ToB⟩' : ''}`;
  const matrix = (val: (c: Cell) => string) => {
    L.push(header);
    L.push(sep);
    for (const ch of FOCUS_CHAPTERS) {
      const row = ASCENSIONS.map((a) => {
        const c = cells.get(`${ch}|${a}`);
        return ` ${c ? val(c) : '—'} |`;
      }).join('');
      L.push(`| ${chLabel(ch)} |${row}`);
    }
  };

  // BOSS-ONLY WALL CHECK (the headline — gear-confound removed)
  L.push('\n## 2. BOSS WALL CHECK — boss-only win%, rested player at full HP\n');
  L.push('Rested arriving L' + LEVEL + ' player dropped straight onto each chapter boss at full HP — isolates the boss itself from chapter attrition (so it is NOT confounded by the missing endgame gear). Ch10/11 = base-game calibration baseline; Ch12-14 = the ToB arc. This is the cleanest "brick wall vs pushover" read.\n');
  matrix((c) => (c.bossOnlyRuns ? pct(c.bossOnlyWins / c.bossOnlyRuns) : '—'));

  // GEARED WALL CHECK (brackets the gear gap)
  L.push('\n## 2b. BOSS WALL CHECK — REPRESENTATIVE-GEARED arriving player\n');
  L.push('Same rested boss-only check, but the arriving player now carries an endgame loadout (a high-rarity item rolled into each slot at Throne depth + two attuned class legendaries) — the gear the loot loop hands a real NG+ player by the ToB arc. The gap from §2 brackets how much the missing gear cost the floor read.\n');
  L.push('**Geared boss win%:**');
  matrix((c) => (c.gearedRuns ? pct(c.gearedWins / c.gearedRuns) : '—'));
  L.push('\n**Geared boss mean min-HP (tension):**');
  matrix((c) => (c.gearedRuns ? pct(c.gearedMinHpSum / c.gearedRuns) : '—'));
  L.push('\n**Geared boss HP remaining on a LOSS (is it still a wall even geared?):**');
  matrix((c) => (c.gearedLosses ? pct(c.gearedLossEnemyHpSum / c.gearedLosses) : 'no loss'));

  L.push('\n## 3. Boss-only mean min-HP (gear-light floor; tension; lower = tighter)\n');
  matrix((c) => (c.bossOnlyRuns ? pct(c.bossOnlyMinHpSum / c.bossOnlyRuns) : '—'));

  L.push('\n## 4. Boss-only avg rounds (length)\n');
  matrix((c) => (c.bossOnlyRuns ? f2(c.bossOnlyRoundsSum / c.bossOnlyRuns) : '—'));

  L.push('\n## 4b. Boss HP remaining on a LOSS (the gear-gap signal; lower = nearly killed → gear closes it, higher = hard gear-check wall)\n');
  L.push('Only losses count. A boss the gear-light floor build chips to ~10-20% is comfortably beatable once the real player adds endgame gear; one left near full HP is a genuine gear-check, not just a floor artifact.\n');
  matrix((c) => (c.bossOnlyLosses ? pct(c.bossOnlyLossEnemyHpSum / c.bossOnlyLosses) : 'no loss'));

  // WHOLE-CHAPTER ATTRITION (gear-sensitive floor)
  L.push('\n## 5. Whole-chapter attrition — clear% (gear-SENSITIVE floor, read with care)\n');
  L.push('Walked camp→boss with no free heals (rest rooms only). The gear-light floor build dies in ToB trash/elite rooms a real geared player would not, so treat low clear% as a FLOOR, not the player experience. Boss-reached% shows how often attrition kills before the boss.\n');
  L.push('**Chapter clear% (beat the boss after the full gauntlet):**');
  matrix((c) => (c.runs ? pct(c.clears / c.runs) : '—'));
  L.push('\n**Boss-reached% (survived the gauntlet to the boss room):**');
  matrix((c) => (c.runs ? pct(c.bossReached / c.runs) : '—'));
  L.push('\n**Whole-chapter min-HP (attrition floor across all rooms; lower = tighter):**');
  matrix((c) => (c.runs ? pct(c.chapterMinHpSum / c.runs) : '—'));

  const outPath = resolve(process.cwd(), 'docs/sim-findings/ngplus-tob.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, L.join('\n') + '\n', 'utf8');

  // Console summary
  console.log(`\n=== STRUCTURE (${STRUCT_SEEDS} seeds) ===`);
  console.log(`ok=${struct.ok} bosses=${struct.bossChapters.length} camps=${f1(struct.campCount)} orphans=${struct.orphans} terminal=${struct.terminalBoss}`);
  console.log(`routed path=${f1(struct.routedDepthTotal)} rooms; past Ch11 routed=${f1(past11Routed)}`);
  if (!struct.ok) console.log('PROBLEMS:', struct.problems.join(' | '));
  console.log(`\n=== BOSS WALL CHECK — boss-only win% (rested L${LEVEL}, full HP) ===`);
  for (const ch of FOCUS_CHAPTERS) {
    const row = ASCENSIONS.map((a) => {
      const c = cells.get(`${ch}|${a}`)!;
      return `A${a} ${c.bossOnlyRuns ? pct(c.bossOnlyWins / c.bossOnlyRuns) : '—'}`;
    }).join('  ');
    console.log(`Ch${ch}: ${row}`);
  }
  console.log(`\n=== BOSS WALL CHECK — geared win% (representative endgame loadout) ===`);
  for (const ch of FOCUS_CHAPTERS) {
    const row = ASCENSIONS.map((a) => {
      const c = cells.get(`${ch}|${a}`)!;
      return `A${a} ${c.gearedRuns ? pct(c.gearedWins / c.gearedRuns) : '—'}`;
    }).join('  ');
    console.log(`Ch${ch}: ${row}`);
  }
  console.log(`\n=== WHOLE-CHAPTER clear% (gear-light attrition floor) ===`);
  for (const ch of FOCUS_CHAPTERS) {
    const row = ASCENSIONS.map((a) => {
      const c = cells.get(`${ch}|${a}`)!;
      return `A${a} ${pct(c.clears / Math.max(1, c.runs))}`;
    }).join('  ');
    console.log(`Ch${ch}: ${row}`);
  }
  console.log(`\nWrote → ${outPath}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
