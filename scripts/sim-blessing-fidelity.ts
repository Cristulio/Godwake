/**
 * Blessing-fidelity sim. Measures how much player power the SHARED shrine
 * policy (`chooseBlessing` in actionPolicy) actually adds — the data the
 * eventual balance pass needs. Earlier sims undercounted player strength
 * because the bot didn't take shrine blessings (or picked the arbitrary first
 * option); this runs the full Godwake delve with the competent picker and
 * compares it head-to-head against a bare-soul baseline.
 *
 * Per class × {OFF = skip shrines, ON = pick the best offered blessing}:
 *   - clear rate (survived all 50 rooms / killed the Ch4 boss)
 *   - mean rooms reached, mean chapter reached, mean final level
 *   - boss-fight win rate (chapter bosses entered vs cleared)
 *   - mean blessings held at end, top blessings the policy actually takes
 *   - where deaths cluster
 *
 * Single life, L1 start, leveling on room XP — everything identical between
 * OFF and ON except the shrine pick, so the delta is the blessing lift alone.
 * The meta-loop (multi-life, Grove-buying) before/after lives in
 * sim-reincarnation-loop.ts via `BLESSINGS=off`.
 *
 * Run:
 *   RUNS_PER_CELL=500 npx tsx scripts/sim-blessing-fidelity.ts
 *
 * Writes docs/sim-findings/blessing-fidelity.md.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { getBlessing } from '../src/content/blessings';
import { applyLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import {
  characterAtLevel,
  takeTurn,
  pickBlessingAtShrine,
} from '../src/test/sim/encounterStress';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type SimClassId = 'fighter' | 'rogue' | 'wizard';
const CLASSES: SimClassId[] = ['fighter', 'rogue', 'wizard'];

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 500);
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xb1e55 >>> 0;

interface RunMetrics {
  cleared: boolean;
  roomsReached: number;
  finalChapter: number;
  finalLevel: number;
  bossesEntered: number;
  bossesKilled: number;
  blessingsHeld: string[];
  deathRoomId: string | null;
  deathCause: string | null;
}

function chapterForRoomIdx(idx: number): number {
  // 50-room Godwake chain (mirrors sim-reincarnation-loop.roomChapter).
  if (idx <= 11) return 1;
  if (idx <= 24) return 2;
  if (idx <= 37) return 3;
  return 4;
}

function tryLevelUp(character: Character): Character {
  let c = character;
  while (c.level < MAX_LEVEL && c.xp >= xpForLevel(c.level + 1)) {
    c = applyLevelUp(c);
  }
  return c;
}

function runCombatRoom(
  roller: ReturnType<typeof createDiceRoller>,
  characterIn: Character,
  room: RoomSpec,
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;

  let turns = 0;
  while (state.status === 'active' && turns < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const turn = takeTurn(roller, state, character);
      state = turn.state;
      character = turn.character;
      if (state.status !== 'active') break;
      const ended = endTurn(state, character);
      state = ended.state;
      character = ended.character;
    } else {
      const r = monsterAttack({ roller, character, state }, state.turnOrder[state.currentTurnIndex]);
      state = r.state;
      character = r.character;
      if (state.status !== 'active') break;
      const ended = endTurn(state, character);
      state = ended.state;
      character = ended.character;
    }
    turns += 1;
  }
  return { character, victory: state.status === 'player-victory' };
}

function runOnce(classId: SimClassId, blessingsOn: boolean, seed: number): RunMetrics {
  // setActiveRoller seeds the global roller the engine's paralyze-tick path
  // reads, and returns it — use that same stream for combat so the run is
  // fully deterministic on `seed`.
  const roller = setActiveRoller(seed);
  let character = characterAtLevel(classId, 1);
  character = longRest(character);

  const delve = createGodwakeDelve({ seed });
  const m: RunMetrics = {
    cleared: false,
    roomsReached: 0,
    finalChapter: 1,
    finalLevel: 1,
    bossesEntered: 0,
    bossesKilled: 0,
    blessingsHeld: [],
    deathRoomId: null,
    deathCause: null,
  };

  for (let i = 0; i < delve.rooms.length; i++) {
    m.roomsReached = i + 1;
    m.finalChapter = chapterForRoomIdx(i);
    const room = delve.rooms[i];

    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      continue;
    }
    if (room.kind === 'camp') {
      character = longRest(character);
      continue;
    }
    if (room.kind === 'shrine') {
      if (blessingsOn) character = pickBlessingAtShrine(roller, character);
      continue;
    }
    if (room.kind === 'event') continue;

    if (room.kind === 'combat' || room.kind === 'boss') {
      const isBoss = room.kind === 'boss';
      if (isBoss) m.bossesEntered += 1;
      const result = runCombatRoom(roller, character, room);
      character = result.character;
      if (!result.victory) {
        m.deathRoomId = room.id;
        m.deathCause = (room.monsters ?? []).map((mm) => mm.defId).join('+');
        break;
      }
      if (isBoss) m.bossesKilled += 1;
      character = tryLevelUp({ ...character, xp: character.xp + (room.xpReward ?? 0) });
    }
  }

  m.cleared = m.roomsReached === delve.rooms.length && m.deathRoomId === null;
  m.finalLevel = character.level;
  m.blessingsHeld = [...character.blessings];
  return m;
}

interface Cell {
  classId: SimClassId;
  blessingsOn: boolean;
  runs: RunMetrics[];
}

function runCell(classId: SimClassId, blessingsOn: boolean): Cell {
  const runs: RunMetrics[] = [];
  for (let i = 0; i < RUNS_PER_CELL; i++) {
    // Identical seed per (class, run index) across OFF/ON so the only
    // difference between the two is the shrine pick.
    const seed = (SEED_BASE + classId.charCodeAt(0) * 7919 + i * 31) >>> 0;
    runs.push(runOnce(classId, blessingsOn, seed));
  }
  return { classId, blessingsOn, runs };
}

interface Agg {
  classId: SimClassId;
  blessingsOn: boolean;
  n: number;
  clearPct: number;
  meanRooms: number;
  meanChapter: number;
  meanFinalLevel: number;
  bossWinPct: number;
  meanBlessings: number;
  topBlessings: [string, number][];
  deathByRoom: [string, number][];
}

function aggregate(cell: Cell): Agg {
  const r = cell.runs;
  const n = r.length;
  const mean = (sel: (m: RunMetrics) => number) => (n === 0 ? 0 : r.reduce((a, m) => a + sel(m), 0) / n);
  const bossEntered = r.reduce((a, m) => a + m.bossesEntered, 0);
  const bossKilled = r.reduce((a, m) => a + m.bossesKilled, 0);
  const blessingCounts: Record<string, number> = {};
  for (const m of r) for (const b of m.blessingsHeld) blessingCounts[b] = (blessingCounts[b] ?? 0) + 1;
  const deathCounts: Record<string, number> = {};
  for (const m of r) if (m.deathRoomId) deathCounts[m.deathRoomId] = (deathCounts[m.deathRoomId] ?? 0) + 1;
  const sortTop = (rec: Record<string, number>, k: number): [string, number][] =>
    Object.entries(rec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
  return {
    classId: cell.classId,
    blessingsOn: cell.blessingsOn,
    n,
    clearPct: (r.filter((m) => m.cleared).length / n) * 100,
    meanRooms: mean((m) => m.roomsReached),
    meanChapter: mean((m) => m.finalChapter),
    meanFinalLevel: mean((m) => m.finalLevel),
    bossWinPct: bossEntered === 0 ? 0 : (bossKilled / bossEntered) * 100,
    meanBlessings: mean((m) => m.blessingsHeld.length),
    topBlessings: sortTop(blessingCounts, 5),
    deathByRoom: sortTop(deathCounts, 4),
  };
}

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

function blessingName(id: string): string {
  try {
    return getBlessing(id).name;
  } catch {
    return id;
  }
}

function render(): string {
  const lines: string[] = [];
  lines.push(`# Blessing-fidelity — sim findings`);
  lines.push('');
  lines.push(
    `Full Godwake delve, single life, L1 start, leveling on room XP. **OFF** skips ` +
      `shrines (bare-soul baseline); **ON** picks the best offered blessing via the ` +
      `shared \`chooseBlessing\` policy. ${RUNS_PER_CELL} runs/cell, same seeds across OFF/ON.`,
  );
  lines.push('');
  lines.push('## Power curve: OFF vs ON');
  lines.push('');
  lines.push('| Class | Bless | Clear% | Rooms | Chapter | Final lvl | Boss win% | Blessings held |');
  lines.push('|------|------|------:|-----:|-------:|---------:|---------:|--------------:|');

  const aggs: Agg[] = [];
  for (const cls of CLASSES) {
    for (const on of [false, true]) {
      const a = aggregate(runCell(cls, on));
      aggs.push(a);
      lines.push(
        `| ${cls} | ${on ? 'ON' : 'OFF'} | ${fmt(a.clearPct)} | ${fmt(a.meanRooms)} | ${fmt(
          a.meanChapter,
          2,
        )} | ${fmt(a.meanFinalLevel, 2)} | ${fmt(a.bossWinPct)} | ${fmt(a.meanBlessings, 2)} |`,
      );
    }
  }

  lines.push('');
  lines.push('## Lift (ON − OFF)');
  lines.push('');
  lines.push('| Class | ΔClear% | ΔRooms | ΔChapter | ΔFinal lvl | ΔBoss win% |');
  lines.push('|------|-------:|------:|--------:|----------:|----------:|');
  for (const cls of CLASSES) {
    const off = aggs.find((a) => a.classId === cls && !a.blessingsOn)!;
    const on = aggs.find((a) => a.classId === cls && a.blessingsOn)!;
    const d = (x: number, y: number, dec = 1) => `${y - x >= 0 ? '+' : ''}${fmt(y - x, dec)}`;
    lines.push(
      `| ${cls} | ${d(off.clearPct, on.clearPct)} | ${d(off.meanRooms, on.meanRooms)} | ${d(
        off.meanChapter,
        on.meanChapter,
        2,
      )} | ${d(off.meanFinalLevel, on.meanFinalLevel, 2)} | ${d(off.bossWinPct, on.bossWinPct)} |`,
    );
  }

  lines.push('');
  lines.push('## What the policy takes (ON)');
  lines.push('');
  for (const cls of CLASSES) {
    const on = aggs.find((a) => a.classId === cls && a.blessingsOn)!;
    const top = on.topBlessings
      .map(([id, c]) => `${blessingName(id)} (${fmt((c / on.n) * 100, 0)}%)`)
      .join(', ');
    lines.push(`- **${cls}:** ${top || '—'}`);
  }

  lines.push('');
  lines.push('## Where deaths cluster');
  lines.push('');
  for (const a of aggs) {
    const top = a.deathByRoom.map(([id, c]) => `${id} (${c})`).join(', ');
    lines.push(`- ${a.classId} ${a.blessingsOn ? 'ON ' : 'OFF'}: ${top || '—'}`);
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const content = render();
  const outPath = resolve(process.cwd(), 'docs/sim-findings/blessing-fidelity.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, 'utf8');
  process.stdout.write(content);
  process.stdout.write(`\n\nWrote ${outPath}\n`);
}

main();
