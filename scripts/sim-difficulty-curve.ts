/**
 * Difficulty-curve harness — per-room reach + death tracking for the META
 * pacing question: did 13+ PRs of Phase 1 balance work make the curve
 * *healthier*, or just shift the cliffs around?
 *
 * Runs three classes (Rogue / Fighter / Wizard) × four start levels
 * (L1 / L3 / L5 / L7) through `createGodwakeDelve` with N reincarnation lives
 * per run. For each life walks every room and records:
 *   - reach count  (lives that entered the room)
 *   - death count  (lives that died there)
 *   - top death cause (first monster defId, or 'tpk' for boss rooms)
 *
 * Writes raw output to `docs/gameplay-quality/difficulty-curve.raw.md` for
 * the curated analysis in `difficulty-curve.md`.
 *
 *   RUNS_PER_CELL=300 npx tsx scripts/sim-difficulty-curve.ts   # default
 *   RUNS_PER_CELL=100 npx tsx scripts/sim-difficulty-curve.ts   # smoke test
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { buildPlayerCharacter, SIR_BRICK_PRESET } from '../src/engine/character/defaultCharacter';
import { applyLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { playerAttack } from '../src/engine/combat/attack/playerAttack';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import { useSecondWind } from '../src/engine/combat/secondWind';
import { useActionSurge } from '../src/engine/combat/actionSurge';
import { useCunningAction } from '../src/engine/combat/cunningAction';
import { useConsumable } from '../src/engine/combat/useItem';
import { castSpell, canCastSpell, slotsAt } from '../src/engine/combat/spells';
import { isPlayerParalyzed } from '../src/engine/combat/holdPerson';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';

const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard'];
const START_LEVELS = [1, 3, 5, 7];
const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 300);
const LIVES_PER_RUN = 3;
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee >>> 0;

const BOSS_DEF_IDS = new Set([
  'duergar-ilyich',
  'athkatla-magistrate',
  'asylum-director',
  'drow-matron-mother',
]);

// ─── Character builders ──────────────────────────────────────────────────

function rogueAt(level: number): Character {
  let c = buildPlayerCharacter({
    name: 'Maelis Vell',
    raceId: 'wood-elf',
    classId: 'rogue',
    baseAbilityScores: { str: 8, dex: 14, con: 14, int: 12, wis: 12, cha: 10 },
    skillProficiencies: ['stealth', 'sleight-of-hand'],
  });
  while (c.level < level) c = applyLevelUp(c);
  c = { ...c, xp: xpForLevel(c.level) };
  return longRest(c);
}

function fighterAt(level: number): Character {
  let c = buildPlayerCharacter(SIR_BRICK_PRESET);
  while (c.level < level) c = applyLevelUp(c);
  c = { ...c, xp: xpForLevel(c.level) };
  return longRest(c);
}

function wizardAt(level: number): Character {
  let c = buildPlayerCharacter({
    name: 'Veyra Ash',
    raceId: 'tiefling',
    classId: 'wizard',
    baseAbilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 8 },
    skillProficiencies: ['arcana', 'history'],
  });
  while (c.level < level) c = applyLevelUp(c);
  c = { ...c, xp: xpForLevel(c.level) };
  return longRest(c);
}

function freshCharacter(classId: ClassId, level: number): Character {
  if (classId === 'rogue') return rogueAt(level);
  if (classId === 'fighter') return fighterAt(level);
  return wizardAt(level);
}

// ─── AI helpers ──────────────────────────────────────────────────────────

function livingMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants
    .filter((c): c is MonsterCombatant => c.kind === 'monster')
    .filter((c) => c.instance.hp.current > 0);
}

function pickLowestHpTarget(state: CombatState): MonsterCombatant | null {
  const living = livingMonsters(state);
  if (living.length === 0) return null;
  return [...living].sort((a, b) => a.instance.hp.current - b.instance.hp.current)[0];
}

function pickHighestHpTarget(state: CombatState): MonsterCombatant | null {
  const living = livingMonsters(state);
  if (living.length === 0) return null;
  return [...living].sort((a, b) => b.instance.hp.current - a.instance.hp.current)[0];
}

function totalLivingHp(state: CombatState): number {
  return livingMonsters(state).reduce((s, m) => s + m.instance.hp.current, 0);
}

function isBossEncounter(state: CombatState): boolean {
  return state.combatants.some(
    (c) => c.kind === 'monster' && BOSS_DEF_IDS.has(c.instance.defId),
  );
}

function findPotionIdx(c: Character): number {
  return c.inventory.findIndex((ref) => ref.itemId === 'potion-of-healing');
}

// ─── Per-class turn AIs (transplanted from sim-full-matrix.ts) ──────────

interface TurnCtx {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
}

function rogueTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller } = ctx;

  if (character.hp.current / character.hp.max <= 0.35) {
    const idx = findPotionIdx(character);
    if (idx >= 0 && !character.actionEconomy.actionUsed) {
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
    }
  }

  if (
    !character.actionEconomy.bonusActionUsed &&
    (character.resources.cunningActionUsesRemaining ?? 0) > 0 &&
    livingMonsters(state).length > 0
  ) {
    const hpPct = character.hp.current / character.hp.max;
    const choice = hpPct < 0.3 ? 'disengage' : !character.nextAttackAdvantage ? 'hide' : null;
    if (choice) {
      const r = useCunningAction({ character, state, choice });
      state = r.state;
      character = r.character;
    }
  }

  if (!character.actionEconomy.actionUsed) {
    const target = pickLowestHpTarget(state);
    const weaponId = character.equipped.mainHand?.itemId;
    if (target && weaponId) {
      const r = playerAttack({ roller, character, state }, target.id, weaponId);
      state = r.state;
      character = r.character;
    }
  }

  if (state.status !== 'active') return { state, character };
  return endTurn(state, character);
}

function fighterTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller } = ctx;

  if (isPlayerParalyzed(character) && character.actionEconomy.actionUsed) {
    return endTurn(state, character);
  }

  if (
    character.hp.current <= character.hp.max * 0.5 &&
    character.resources.secondWindAvailable &&
    !character.actionEconomy.bonusActionUsed
  ) {
    const r = useSecondWind({ roller, character, state });
    state = r.state;
    character = r.character;
  }

  if (character.hp.current / character.hp.max <= 0.3 && !character.actionEconomy.actionUsed) {
    const idx = findPotionIdx(character);
    if (idx >= 0) {
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
    }
  }

  for (let i = 0; i < 4; i++) {
    if (character.actionEconomy.actionUsed) break;
    if (state.status !== 'active') break;
    const target = pickLowestHpTarget(state);
    const weaponId = character.equipped.mainHand?.itemId;
    if (!target || !weaponId) break;
    const r = playerAttack({ roller, character, state }, target.id, weaponId);
    state = r.state;
    character = r.character;
  }

  if (
    (character.resources.actionSurgeRemaining ?? 0) > 0 &&
    character.actionEconomy.actionUsed &&
    state.status === 'active' &&
    livingMonsters(state).length > 0
  ) {
    const surgeWanted = isBossEncounter(state)
      ? character.hp.current <= character.hp.max * 0.7 &&
        livingMonsters(state)[0].instance.hp.current >
          livingMonsters(state)[0].instance.hp.max * 0.25
      : livingMonsters(state).length >= 2 || totalLivingHp(state) >= character.hp.max * 0.6;
    if (surgeWanted) {
      const r = useActionSurge({ state, character });
      if (!r.character.actionEconomy.actionUsed) {
        state = r.state;
        character = r.character;
        for (let i = 0; i < 4; i++) {
          if (character.actionEconomy.actionUsed) break;
          if (state.status !== 'active') break;
          const target = pickLowestHpTarget(state);
          const weaponId = character.equipped.mainHand?.itemId;
          if (!target || !weaponId) break;
          const r2 = playerAttack({ roller, character, state }, target.id, weaponId);
          state = r2.state;
          character = r2.character;
        }
      }
    }
  }

  if (state.status !== 'active') return { state, character };
  return endTurn(state, character);
}

function wizardTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller } = ctx;
  const alive = livingMonsters(state);
  if (alive.length === 0) return endTurn(state, character);

  if (character.hp.current / character.hp.max <= 0.35 && !character.actionEconomy.actionUsed) {
    const idx = findPotionIdx(character);
    if (idx >= 0) {
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
    }
  }

  if (
    character.hp.current * 2 <= character.hp.max &&
    slotsAt(character, 2) > 0 &&
    !character.actionEconomy.bonusActionUsed &&
    canCastSpell(character, 'misty-step').ok
  ) {
    const r = castSpell({ roller, character, state, spellId: 'misty-step' });
    if (r.cast) {
      state = r.state;
      character = r.character;
    }
  }

  if (!character.actionEconomy.actionUsed) {
    const livingNow = livingMonsters(state);
    let cast = false;

    if (
      livingNow.length >= 2 &&
      slotsAt(character, 3) > 0 &&
      canCastSpell(character, 'fireball').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'fireball' });
      if (r.cast) {
        state = r.state;
        character = r.character;
        cast = true;
      }
    } else if (
      livingNow.length >= 3 &&
      slotsAt(character, 3) > 0 &&
      canCastSpell(character, 'lightning-bolt').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'lightning-bolt' });
      if (r.cast) {
        state = r.state;
        character = r.character;
        cast = true;
      }
    }

    if (
      !cast &&
      livingNow.length >= 2 &&
      slotsAt(character, 1) > 0 &&
      canCastSpell(character, 'burning-hands').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'burning-hands' });
      if (r.cast) {
        state = r.state;
        character = r.character;
        cast = true;
      }
    }

    if (
      !cast &&
      livingNow.length === 1 &&
      livingNow[0].instance.hp.current > 25 &&
      slotsAt(character, 2) > 0 &&
      canCastSpell(character, 'hold-person').ok
    ) {
      const r = castSpell({
        roller,
        character,
        state,
        spellId: 'hold-person',
        targetId: livingNow[0].id,
      });
      if (r.cast) {
        state = r.state;
        character = r.character;
        cast = true;
      }
    }

    if (
      !cast &&
      slotsAt(character, 1) > 0 &&
      livingNow.some((m) => m.instance.hp.current > 8) &&
      canCastSpell(character, 'magic-missile').ok
    ) {
      const target = pickHighestHpTarget(state)!;
      const r = castSpell({ roller, character, state, spellId: 'magic-missile', targetId: target.id });
      if (r.cast) {
        state = r.state;
        character = r.character;
        cast = true;
      }
    }

    if (!cast) {
      const target = pickLowestHpTarget(state)!;
      const r = castSpell({ roller, character, state, spellId: 'fire-bolt', targetId: target.id });
      if (r.cast) {
        state = r.state;
        character = r.character;
      }
    }
  }

  if (state.status !== 'active') return { state, character };
  return endTurn(state, character);
}

function playerTurn(classId: ClassId, ctx: TurnCtx) {
  if (classId === 'rogue') return rogueTurn(ctx);
  if (classId === 'fighter') return fighterTurn(ctx);
  return wizardTurn(ctx);
}

// ─── Combat driver ───────────────────────────────────────────────────────

interface CombatResult {
  character: Character;
  victory: boolean;
  firstMonsterDefId: string | null;
}

function runCombat(
  roller: DiceRoller,
  classId: ClassId,
  characterIn: Character,
  room: RoomSpec,
): CombatResult {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;
  let turnsTaken = 0;

  while (state.status === 'active' && turnsTaken < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const turn = playerTurn(classId, { roller, state, character });
      state = turn.state;
      character = turn.character;
    } else {
      const r = monsterAttack(
        { roller, character, state },
        state.initiativeOrder[state.currentTurnIndex],
      );
      state = r.state;
      character = r.character;
      if (state.status === 'active') {
        const ended = endTurn(state, character);
        state = ended.state;
        character = ended.character;
      }
    }
    turnsTaken += 1;
  }

  return {
    character,
    victory: state.status === 'player-victory',
    firstMonsterDefId: room.monsters?.[0]?.defId ?? null,
  };
}

// ─── Per-cell run loop ───────────────────────────────────────────────────

interface RoomTally {
  /** lives that entered this room */
  reach: number;
  /** lives that died in this room */
  deaths: number;
  /** death cause (first monster defId) → count */
  causes: Record<string, number>;
}

interface CellResult {
  classId: ClassId;
  startLevel: number;
  runs: number;
  lives: number;
  livesCleared: number;
  /** Keyed by room.id — every room a life entered, including rests/camps/events. */
  rooms: Record<string, RoomTally>;
  /** Stable room order from the canonical delve (uses the first life's delve). */
  roomOrder: string[];
  /** Room kind by id (combat / rest / boss / etc) so we can verdict each row. */
  roomKinds: Record<string, string>;
}

function emptyTally(): RoomTally {
  return { reach: 0, deaths: 0, causes: {} };
}

function liveOneAttempt(
  roller: DiceRoller,
  classId: ClassId,
  startLevel: number,
  cell: CellResult,
  lifeIdx: number,
): boolean {
  let character = freshCharacter(classId, startLevel);
  const delveSeed =
    ((roller.roll('1d100').total * 2654435761) ^ (lifeIdx * 7919) ^ classId.charCodeAt(0)) >>>
    0;
  const delve = createGodwakeDelve({ seed: delveSeed });

  if (cell.roomOrder.length === 0) {
    for (const room of delve.rooms) {
      cell.roomOrder.push(room.id);
      cell.roomKinds[room.id] = room.kind;
    }
  }

  for (let i = 0; i < delve.rooms.length; i++) {
    const room = delve.rooms[i];
    const tally = (cell.rooms[room.id] ??= emptyTally());
    tally.reach += 1;

    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      continue;
    }
    if (room.kind === 'camp') {
      character = longRest(character);
      continue;
    }
    if (room.kind === 'shrine' || room.kind === 'event') {
      continue;
    }

    const result = runCombat(roller, classId, character, room);
    character = result.character;
    if (!result.victory) {
      tally.deaths += 1;
      const cause = result.firstMonsterDefId ?? room.id;
      tally.causes[cause] = (tally.causes[cause] ?? 0) + 1;
      return false;
    }

    const roomXp = room.xpReward ?? 0;
    if (roomXp > 0) {
      character = { ...character, xp: character.xp + roomXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  return true;
}

function runCell(classId: ClassId, startLevel: number, runs: number): CellResult {
  const cell: CellResult = {
    classId,
    startLevel,
    runs,
    lives: 0,
    livesCleared: 0,
    rooms: {},
    roomOrder: [],
    roomKinds: {},
  };
  for (let runIdx = 0; runIdx < runs; runIdx++) {
    for (let life = 0; life < LIVES_PER_RUN; life++) {
      const seed = ((SEED_BASE + runIdx * 101 + life * 7919) ^ (startLevel * 1009)) >>> 0;
      const roller = createDiceRoller(seed);
      setActiveRoller(seed);
      cell.lives += 1;
      const cleared = liveOneAttempt(roller, classId, startLevel, cell, life);
      if (cleared) {
        cell.livesCleared += 1;
        break;
      }
    }
  }
  return cell;
}

// ─── Rendering ───────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const pctShort = (n: number) => `${(n * 100).toFixed(0)}%`;

interface MatrixByClass {
  rogue: Map<number, CellResult>;
  fighter: Map<number, CellResult>;
  wizard: Map<number, CellResult>;
}

function deathPctFor(cell: CellResult | undefined, roomId: string): number | null {
  if (!cell) return null;
  const t = cell.rooms[roomId];
  if (!t || t.reach === 0) return null;
  return t.deaths / t.reach;
}

function renderHeatmap(matrix: MatrixByClass, startLevel: number): string {
  const lines: string[] = [];
  const ref = matrix.rogue.get(startLevel) ?? matrix.fighter.get(startLevel) ?? matrix.wizard.get(startLevel)!;
  lines.push(`### Start L${startLevel} (300 runs × 3 lives = 900 lives/cell)`);
  lines.push('');
  lines.push('| Room | Kind | Rogue | Fighter | Wizard | Notes |');
  lines.push('|------|------|------:|--------:|-------:|-------|');
  for (const roomId of ref.roomOrder) {
    const kind = ref.roomKinds[roomId];
    const rD = deathPctFor(matrix.rogue.get(startLevel), roomId);
    const fD = deathPctFor(matrix.fighter.get(startLevel), roomId);
    const wD = deathPctFor(matrix.wizard.get(startLevel), roomId);
    const fmt = (d: number | null) => (d === null ? '—' : pct(d));
    const notes: string[] = [];
    if (kind === 'boss') notes.push('boss');
    if (kind === 'camp') notes.push('long rest');
    if (kind === 'rest') notes.push('short rest');
    if (kind === 'shrine') notes.push('skipped (bare-soul)');
    if (kind === 'event') notes.push('skipped (bare-soul)');
    // Class asymmetry flag
    const present = [rD, fD, wD].filter((x): x is number => x !== null);
    if (present.length >= 2) {
      const max = Math.max(...present);
      const min = Math.min(...present);
      if (max - min >= 0.3) notes.push('CLASS ASYM');
    }
    lines.push(`| ${roomId} | ${kind} | ${fmt(rD)} | ${fmt(fD)} | ${fmt(wD)} | ${notes.join(', ')} |`);
  }
  return lines.join('\n');
}

function findCliffs(matrix: MatrixByClass, startLevel: number): string[] {
  const out: string[] = [];
  const ref = matrix.rogue.get(startLevel) ?? matrix.fighter.get(startLevel) ?? matrix.wizard.get(startLevel)!;
  const order = ref.roomOrder;
  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const cur = order[i];
    if (ref.roomKinds[cur] !== 'combat' && ref.roomKinds[cur] !== 'boss') continue;
    for (const cls of CLASSES) {
      const a = deathPctFor(matrix[cls].get(startLevel), prev);
      const b = deathPctFor(matrix[cls].get(startLevel), cur);
      if (a === null || b === null) continue;
      const jump = b - a;
      if (jump >= 0.2) {
        out.push(`L${startLevel} ${cls}: ${prev} ${pct(a)} → ${cur} ${pct(b)} (Δ${pct(jump)})`);
      }
    }
  }
  return out;
}

function findBoringValleys(matrix: MatrixByClass, startLevel: number): string[] {
  const out: string[] = [];
  const ref = matrix.rogue.get(startLevel) ?? matrix.fighter.get(startLevel) ?? matrix.wizard.get(startLevel)!;
  const order = ref.roomOrder.filter((r) => ref.roomKinds[r] === 'combat');
  for (const cls of CLASSES) {
    let runStart = -1;
    let runLen = 0;
    const cell = matrix[cls].get(startLevel);
    for (let i = 0; i < order.length; i++) {
      const d = deathPctFor(cell, order[i]);
      if (d !== null && d < 0.05) {
        if (runStart < 0) runStart = i;
        runLen += 1;
        if (runLen >= 3) {
          out.push(`L${startLevel} ${cls}: ${order.slice(runStart, i + 1).join(',')} all <5%`);
          runStart = -1;
          runLen = 0;
        }
      } else {
        runStart = -1;
        runLen = 0;
      }
    }
  }
  return out;
}

function renderTopCliffs(matrix: MatrixByClass): string {
  const all: Array<{ score: number; line: string }> = [];
  for (const L of START_LEVELS) {
    for (const cls of CLASSES) {
      const cell = matrix[cls].get(L);
      if (!cell) continue;
      for (const roomId of cell.roomOrder) {
        const kind = cell.roomKinds[roomId];
        if (kind !== 'combat') continue;
        const d = deathPctFor(cell, roomId);
        if (d === null) continue;
        if (d >= 0.2) {
          all.push({ score: d, line: `${roomId} (${kind}) ${cls} L${L}: ${pct(d)}` });
        }
      }
    }
  }
  all.sort((a, b) => b.score - a.score);
  return all.slice(0, 12).map((a) => `- ${a.line}`).join('\n');
}

function renderTopDeathCauses(matrix: MatrixByClass, startLevel: number): string {
  const out: string[] = [];
  for (const cls of CLASSES) {
    const cell = matrix[cls].get(startLevel);
    if (!cell) continue;
    const sorted = Object.entries(cell.rooms)
      .filter(([, t]) => t.deaths > 0)
      .sort((a, b) => b[1].deaths - a[1].deaths)
      .slice(0, 5);
    out.push(`**${cls} L${startLevel}:**`);
    for (const [roomId, t] of sorted) {
      const topCause = Object.entries(t.causes).sort((a, b) => b[1] - a[1])[0];
      out.push(
        `  - ${roomId} (${cell.roomKinds[roomId]}): ${t.deaths}/${t.reach} (${pct(t.deaths / t.reach)}) — ${topCause?.[0] ?? 'n/a'}`,
      );
    }
  }
  return out.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────

function main(): void {
  const tWall0 = Date.now();
  console.log(
    `Difficulty-curve sweep — ${CLASSES.length}×${START_LEVELS.length} cells × ${RUNS_PER_CELL} runs × ${LIVES_PER_RUN} lives\n`,
  );

  const matrix: MatrixByClass = {
    rogue: new Map(),
    fighter: new Map(),
    wizard: new Map(),
  };

  for (const cls of CLASSES) {
    for (const L of START_LEVELS) {
      const t0 = Date.now();
      const cell = runCell(cls, L, RUNS_PER_CELL);
      matrix[cls].set(L, cell);
      const dt = Date.now() - t0;
      const deaths = cell.lives - cell.livesCleared;
      console.log(
        `${cls.padEnd(8)} L${L}  lives=${cell.lives}  cleared=${cell.livesCleared}  deathRate=${pct(deaths / cell.lives)}  ${dt}ms`,
      );
    }
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);

  const sections: string[] = [];
  sections.push('# Difficulty-curve heatmap — raw output\n');
  sections.push(
    `> Auto-generated by \`scripts/sim-difficulty-curve.ts\`. Re-run with\n> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-difficulty-curve.ts\`.\n> Curated diagnosis lives in [\`difficulty-curve.md\`](./difficulty-curve.md).\n`,
  );
  sections.push(
    `**Cells:** ${CLASSES.length * START_LEVELS.length}. **Runs/cell:** ${RUNS_PER_CELL}. **Lives/run:** ${LIVES_PER_RUN}. **Wall:** ${dtTotal}s.`,
  );

  sections.push('\n## Per-room death-rate heatmap (death% = deaths / reaches)\n');
  for (const L of START_LEVELS) {
    sections.push(renderHeatmap(matrix, L));
    sections.push('');
  }

  sections.push('## Top death rooms by class (with most common cause)\n');
  for (const L of START_LEVELS) {
    sections.push(`### L${L}`);
    sections.push(renderTopDeathCauses(matrix, L));
    sections.push('');
  }

  sections.push('## Detected cliffs (>=20pp jump from prior room, per class)\n');
  for (const L of START_LEVELS) {
    const cliffs = findCliffs(matrix, L);
    if (cliffs.length === 0) {
      sections.push(`- L${L}: none`);
    } else {
      for (const c of cliffs) sections.push(`- ${c}`);
    }
  }

  sections.push('\n## Detected boring valleys (3+ consecutive combat rooms <5%)\n');
  for (const L of START_LEVELS) {
    const valleys = findBoringValleys(matrix, L);
    if (valleys.length === 0) {
      sections.push(`- L${L}: none`);
    } else {
      for (const v of valleys) sections.push(`- ${v}`);
    }
  }

  sections.push('\n## Top deadly combat rooms (>=20% death, any class/level)\n');
  sections.push(renderTopCliffs(matrix));

  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/difficulty-curve.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, sections.join('\n') + '\n', 'utf8');
  console.log(`\nWrote raw heatmap → ${outPath}  (${dtTotal}s wall)`);
}

main();
