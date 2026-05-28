/**
 * Choice-impact sim — measures outcome variance across two decision points
 * the prior validation PRs didn't isolate:
 *
 *   1. Race × class — outcome delta when only the race changes (5 races × 3
 *      classes). Same ability-score array per class so the only mover is the
 *      race's bonuses / features.
 *   2. Shrine blessing (forced pick) — single blessing handed to the
 *      character before delve start; rest of the chain runs bare-soul.
 *      Compared against a no-blessing control for each (class, blessing) pair.
 *
 * The combat AI is copied from `sim-full-matrix.ts` (rogue / fighter / wizard
 * turn pickers); the runner is collapsed to outcome metrics only because the
 * caller (choice-impact analysis) only needs death% and chapters/life per cell.
 *
 * Run:
 *   RUNS_PER_CELL=120 npx tsx scripts/sim-choice-impact.ts
 *
 * Writes a raw matrix to `docs/gameplay-quality/choice-impact.raw.md`.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { buildPlayerCharacter } from '../src/engine/character/defaultCharacter';
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
import { rollRoomGoldDrops } from '../src/engine/combat/goldDrop';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';
import type { RaceId } from '../src/schemas/ids';

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 120);
const LIVES_PER_RUN = 3;
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc0ffee00 >>> 0;
const START_LEVEL = 3; // mid-low — past Ilyich choke, before chain power-up

type ClassId = 'rogue' | 'fighter' | 'wizard';

const RACES: RaceId[] = ['human', 'wood-elf', 'hill-dwarf', 'half-elf', 'tiefling'];

// Representative blessing slice — one per common mod family, plus a duplicate
// of the +damage family to gauge within-family variance.
const TEST_BLESSINGS = [
  'helms-aegis',       // +1 AC
  'mystras-whisper',   // +1 damage per hit
  'lathanders-dawn',   // +3 temp HP / room
  'selunes-veil',      // advantage first attack
  'tymoras-coin',      // reroll one missed attack / encounter
  'tempus-edge',       // crit range +1
  'ilmaters-patience', // +1 stabilise charge
] as const;

// ─────────────────────────────────────────────────────────────────────────
// Character builders — class baseline scores held constant, race swapped.
// ─────────────────────────────────────────────────────────────────────────

const BASE_SCORES: Record<ClassId, Character['baseAbilityScores']> = {
  rogue:   { str: 8,  dex: 14, con: 14, int: 12, wis: 12, cha: 10 },
  fighter: { str: 15, dex: 13, con: 14, int: 8,  wis: 12, cha: 10 },
  wizard:  { str: 8,  dex: 14, con: 13, int: 15, wis: 12, cha: 8 },
};

const NAME: Record<ClassId, string> = {
  rogue: 'Maelis Vell',
  fighter: 'Brak Stoneward',
  wizard: 'Veyra Ash',
};

const SKILLS: Record<ClassId, ('athletics' | 'perception' | 'stealth' | 'sleight-of-hand' | 'arcana' | 'history')[]> = {
  rogue: ['stealth', 'sleight-of-hand'],
  fighter: ['athletics', 'perception'],
  wizard: ['arcana', 'history'],
};

function freshCharacter(classId: ClassId, raceId: RaceId, level: number, startingBlessing: string | null): Character {
  let c = buildPlayerCharacter({
    name: NAME[classId],
    raceId,
    classId,
    baseAbilityScores: BASE_SCORES[classId],
    skillProficiencies: SKILLS[classId],
  });
  while (c.level < level) c = applyLevelUp(c);
  c = { ...c, xp: xpForLevel(c.level) };
  if (startingBlessing) {
    c = { ...c, blessings: [...c.blessings, startingBlessing] };
  }
  return longRest(c);
}

// ─────────────────────────────────────────────────────────────────────────
// AI helpers (copied from sim-full-matrix.ts)
// ─────────────────────────────────────────────────────────────────────────

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
    (c) =>
      c.kind === 'monster' &&
      ['duergar-ilyich', 'athkatla-magistrate', 'asylum-director', 'drow-matron-mother'].includes(
        c.instance.defId,
      ),
  );
}

function findPotionIdx(c: Character): number {
  return c.inventory.findIndex((ref) => ref.itemId === 'potion-of-healing');
}

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

    if (livingNow.length >= 2 && slotsAt(character, 3) > 0 && canCastSpell(character, 'fireball').ok) {
      const r = castSpell({ roller, character, state, spellId: 'fireball' });
      if (r.cast) { state = r.state; character = r.character; cast = true; }
    } else if (livingNow.length >= 3 && slotsAt(character, 3) > 0 && canCastSpell(character, 'lightning-bolt').ok) {
      const r = castSpell({ roller, character, state, spellId: 'lightning-bolt' });
      if (r.cast) { state = r.state; character = r.character; cast = true; }
    }

    if (!cast && livingNow.length >= 2 && slotsAt(character, 1) > 0 && canCastSpell(character, 'burning-hands').ok) {
      const r = castSpell({ roller, character, state, spellId: 'burning-hands' });
      if (r.cast) { state = r.state; character = r.character; cast = true; }
    }

    if (
      !cast &&
      livingNow.length === 1 &&
      livingNow[0].instance.hp.current > 25 &&
      slotsAt(character, 2) > 0 &&
      canCastSpell(character, 'hold-person').ok
    ) {
      const r = castSpell({
        roller, character, state,
        spellId: 'hold-person', targetId: livingNow[0].id,
      });
      if (r.cast) { state = r.state; character = r.character; cast = true; }
    }

    if (
      !cast &&
      slotsAt(character, 1) > 0 &&
      livingNow.some((m) => m.instance.hp.current > 8) &&
      canCastSpell(character, 'magic-missile').ok
    ) {
      const target = pickHighestHpTarget(state)!;
      const r = castSpell({ roller, character, state, spellId: 'magic-missile', targetId: target.id });
      if (r.cast) { state = r.state; character = r.character; cast = true; }
    }

    if (!cast) {
      const target = pickLowestHpTarget(state)!;
      const r = castSpell({ roller, character, state, spellId: 'fire-bolt', targetId: target.id });
      if (r.cast) { state = r.state; character = r.character; }
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

// ─────────────────────────────────────────────────────────────────────────
// Combat + delve driver — outcome metrics only
// ─────────────────────────────────────────────────────────────────────────

interface RunStats {
  encountersWon: number;
  damageTaken: number;
  goldGained: number;
  chaptersCleared: number;
  lifeOutcomes: Array<{ cleared: boolean; chapter: number; finalRoomIdx: number }>;
}

function emptyStats(): RunStats {
  return { encountersWon: 0, damageTaken: 0, goldGained: 0, chaptersCleared: 0, lifeOutcomes: [] };
}

function roomChapter(idx: number): number {
  if (idx <= 9) return 1;
  if (idx === 10) return 1;
  if (idx <= 18) return 2;
  if (idx === 19) return 2;
  if (idx <= 27) return 3;
  if (idx === 28) return 3;
  return 4;
}

function runCombat(
  roller: DiceRoller,
  classId: ClassId,
  characterIn: Character,
  room: RoomSpec,
  stats: RunStats,
): { character: Character; victory: boolean } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;
  const defIds = monsterRefs.map((m) => m.def.id);
  let turnsTaken = 0;

  while (state.status === 'active' && turnsTaken < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const hpBefore = character.hp.current;
      const turn = playerTurn(classId, { roller, state, character });
      state = turn.state;
      character = turn.character;
      if (character.hp.current < hpBefore) stats.damageTaken += hpBefore - character.hp.current;
    } else {
      const hpBefore = character.hp.current;
      const r = monsterAttack(
        { roller, character, state },
        state.initiativeOrder[state.currentTurnIndex],
      );
      state = r.state;
      character = r.character;
      if (character.hp.current < hpBefore) stats.damageTaken += hpBefore - character.hp.current;
      if (state.status === 'active') {
        const ended = endTurn(state, character);
        state = ended.state;
        character = ended.character;
      }
    }
    turnsTaken += 1;
  }
  const victory = state.status === 'player-victory';
  if (victory) {
    stats.encountersWon += 1;
    stats.goldGained += rollRoomGoldDrops(roller, defIds);
  }
  return { character, victory };
}

function liveOneAttempt(
  roller: DiceRoller,
  classId: ClassId,
  raceId: RaceId,
  startingBlessing: string | null,
  startLevel: number,
  stats: RunStats,
  lifeIdx: number,
): { cleared: boolean; chapter: number; finalRoomIdx: number } {
  let character = freshCharacter(classId, raceId, startLevel, startingBlessing);
  const delveSeed =
    ((roller.roll('1d100').total * 2654435761) ^
      (lifeIdx * 7919) ^
      classId.charCodeAt(0) ^
      raceId.charCodeAt(0)) >>>
    0;
  const delve = createGodwakeDelve({ seed: delveSeed });
  let lastChapterAdvanced = 0;
  let finalRoomIdx = 0;

  for (let i = 0; i < delve.rooms.length; i++) {
    finalRoomIdx = i;
    const room = delve.rooms[i];
    const chapter = roomChapter(i);

    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      continue;
    }
    if (room.kind === 'camp') {
      character = longRest(character);
      if (chapter > lastChapterAdvanced) {
        stats.chaptersCleared += 1;
        lastChapterAdvanced = chapter;
      }
      continue;
    }
    if (room.kind === 'shrine' || room.kind === 'event') continue;

    const result = runCombat(roller, classId, character, room, stats);
    character = result.character;
    if (!result.victory) return { cleared: false, chapter, finalRoomIdx };

    const roomXp = room.xpReward ?? 0;
    if (roomXp > 0) {
      character = { ...character, xp: character.xp + roomXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }
  return { cleared: true, chapter: 4, finalRoomIdx };
}

interface CellSpec {
  classId: ClassId;
  raceId: RaceId;
  startingBlessing: string | null;
  label: string;
  axis: 'race' | 'blessing';
}

function runCell(spec: CellSpec): RunStats[] {
  const cell: RunStats[] = [];
  for (let runIdx = 0; runIdx < RUNS_PER_CELL; runIdx++) {
    const stats = emptyStats();
    for (let life = 0; life < LIVES_PER_RUN; life++) {
      const seed = ((SEED_BASE + runIdx * 101 + life * 7919) ^ (START_LEVEL * 1009)) >>> 0;
      const roller = createDiceRoller(seed);
      setActiveRoller(seed);
      const outcome = liveOneAttempt(roller, spec.classId, spec.raceId, spec.startingBlessing, START_LEVEL, stats, life);
      stats.lifeOutcomes.push({ cleared: outcome.cleared, chapter: outcome.chapter, finalRoomIdx: outcome.finalRoomIdx });
      if (outcome.cleared) break;
    }
    cell.push(stats);
  }
  return cell;
}

interface Aggregate {
  spec: CellSpec;
  runs: number;
  lives: number;
  runWinRate: number;
  lifeDeathRate: number;
  meanChaptersPerLife: number;
  meanEncountersPerLife: number;
  meanDmgTakenPerLife: number;
  meanGoldPerLife: number;
}

function aggregate(spec: CellSpec, cell: RunStats[]): Aggregate {
  const totalLives = cell.reduce((s, r) => s + r.lifeOutcomes.length, 0);
  const deadLives = cell.reduce(
    (s, r) => s + r.lifeOutcomes.filter((l) => !l.cleared).length,
    0,
  );
  const runsCleared = cell.filter((r) => r.lifeOutcomes.some((l) => l.cleared)).length;

  const sumPerLife = (sel: (s: RunStats) => number) =>
    totalLives === 0 ? 0 : cell.reduce((s, r) => s + sel(r), 0) / totalLives;
  const sumChaptersPerLife = totalLives === 0
    ? 0
    : cell.reduce((s, r) => {
        // Each lifeOutcome's chapter (or 4 if cleared) is the chapter the soul died at.
        // Use the recorded chaptersCleared accumulator which counted camp-seam crossings.
        return s + r.chaptersCleared;
      }, 0) / Math.max(1, cell.length); // chapters cleared *per run* (not per life)

  return {
    spec,
    runs: cell.length,
    lives: totalLives,
    runWinRate: runsCleared / Math.max(1, cell.length),
    lifeDeathRate: totalLives === 0 ? 0 : deadLives / totalLives,
    meanChaptersPerLife: sumChaptersPerLife,
    meanEncountersPerLife: sumPerLife((s) => s.encountersWon),
    meanDmgTakenPerLife: sumPerLife((s) => s.damageTaken),
    meanGoldPerLife: sumPerLife((s) => s.goldGained),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Matrix
// ─────────────────────────────────────────────────────────────────────────

function buildMatrix(): CellSpec[] {
  const cells: CellSpec[] = [];

  // Axis 1 — race × class (always wood-elf for rogue's default race, etc.,
  // but we sweep all 5 races per class to isolate the race lever).
  for (const classId of ['rogue', 'fighter', 'wizard'] as ClassId[]) {
    for (const raceId of RACES) {
      cells.push({
        classId,
        raceId,
        startingBlessing: null,
        label: `${classId}/${raceId}`,
        axis: 'race',
      });
    }
  }

  // Axis 2 — shrine blessing forced-pick (default race per class, single blessing handed in).
  const RACE_BY_CLASS: Record<ClassId, RaceId> = {
    rogue: 'wood-elf',
    fighter: 'human',
    wizard: 'tiefling',
  };
  for (const classId of ['rogue', 'fighter', 'wizard'] as ClassId[]) {
    cells.push({
      classId,
      raceId: RACE_BY_CLASS[classId],
      startingBlessing: null,
      label: `${classId}/none`,
      axis: 'blessing',
    });
    for (const b of TEST_BLESSINGS) {
      cells.push({
        classId,
        raceId: RACE_BY_CLASS[classId],
        startingBlessing: b,
        label: `${classId}/${b}`,
        axis: 'blessing',
      });
    }
  }
  return cells;
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function num(n: number, d = 2) { return n.toFixed(d); }

function renderRaceTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Race | Death% | RunClr% | Ch/run | Enc/life | Dmg taken/life | Gold/life |');
  lines.push('|------|------|------:|-------:|------:|--------:|--------------:|---------:|');
  const races = aggs.filter((a) => a.spec.axis === 'race');
  for (const a of races) {
    lines.push(
      `| ${a.spec.classId} | ${a.spec.raceId} | ${pct(a.lifeDeathRate)} | ${pct(a.runWinRate)} | ${num(a.meanChaptersPerLife)} | ${num(a.meanEncountersPerLife, 1)} | ${num(a.meanDmgTakenPerLife, 0)} | ${num(a.meanGoldPerLife, 0)} |`,
    );
  }
  return lines.join('\n');
}

function renderRaceVariance(aggs: Aggregate[]): string {
  const races = aggs.filter((a) => a.spec.axis === 'race');
  const byClass = new Map<ClassId, Aggregate[]>();
  for (const a of races) {
    const list = byClass.get(a.spec.classId) ?? [];
    list.push(a);
    byClass.set(a.spec.classId, list);
  }
  const lines: string[] = [];
  lines.push('| Class | Metric | Min | Max | Range (max-min) | Best race | Worst race |');
  lines.push('|------|-------|----:|----:|---------------:|----------|-----------|');
  for (const [cls, list] of byClass) {
    const deathMin = Math.min(...list.map((a) => a.lifeDeathRate));
    const deathMax = Math.max(...list.map((a) => a.lifeDeathRate));
    const chMin = Math.min(...list.map((a) => a.meanChaptersPerLife));
    const chMax = Math.max(...list.map((a) => a.meanChaptersPerLife));
    const bestRace = list.reduce((a, b) => (a.meanChaptersPerLife > b.meanChaptersPerLife ? a : b)).spec.raceId;
    const worstRace = list.reduce((a, b) => (a.meanChaptersPerLife < b.meanChaptersPerLife ? a : b)).spec.raceId;
    lines.push(
      `| ${cls} | death% | ${pct(deathMin)} | ${pct(deathMax)} | ${(100 * (deathMax - deathMin)).toFixed(1)}pp | (low-death) ${list.reduce((a, b) => (a.lifeDeathRate < b.lifeDeathRate ? a : b)).spec.raceId} | (high-death) ${list.reduce((a, b) => (a.lifeDeathRate > b.lifeDeathRate ? a : b)).spec.raceId} |`,
    );
    lines.push(
      `| ${cls} | chapters/run | ${num(chMin)} | ${num(chMax)} | ${num(chMax - chMin)} | ${bestRace} | ${worstRace} |`,
    );
  }
  return lines.join('\n');
}

function renderBlessingTable(aggs: Aggregate[]): string {
  const blessings = aggs.filter((a) => a.spec.axis === 'blessing');
  const lines: string[] = [];
  lines.push('| Class | Blessing | Death% | RunClr% | Ch/run | Δ Ch/run vs none | Enc/life | Dmg taken/life |');
  lines.push('|------|----------|------:|-------:|------:|----------------:|--------:|--------------:|');
  const byClassNone = new Map<ClassId, Aggregate>();
  for (const a of blessings) if (!a.spec.startingBlessing) byClassNone.set(a.spec.classId, a);
  for (const a of blessings) {
    const ctrl = byClassNone.get(a.spec.classId);
    const dCh = ctrl ? a.meanChaptersPerLife - ctrl.meanChaptersPerLife : 0;
    const dStr = ctrl && a.spec.startingBlessing ? `${dCh >= 0 ? '+' : ''}${num(dCh)}` : '—';
    lines.push(
      `| ${a.spec.classId} | ${a.spec.startingBlessing ?? 'none (control)'} | ${pct(a.lifeDeathRate)} | ${pct(a.runWinRate)} | ${num(a.meanChaptersPerLife)} | ${dStr} | ${num(a.meanEncountersPerLife, 1)} | ${num(a.meanDmgTakenPerLife, 0)} |`,
    );
  }
  return lines.join('\n');
}

function renderBlessingVariance(aggs: Aggregate[]): string {
  const blessings = aggs.filter((a) => a.spec.axis === 'blessing' && a.spec.startingBlessing);
  const byClass = new Map<ClassId, Aggregate[]>();
  for (const a of blessings) {
    const list = byClass.get(a.spec.classId) ?? [];
    list.push(a);
    byClass.set(a.spec.classId, list);
  }
  const lines: string[] = [];
  lines.push('| Class | Min ch/run | Max ch/run | Range | Best pick | Worst pick |');
  lines.push('|------|-----------:|-----------:|------:|-----------|-----------|');
  for (const [cls, list] of byClass) {
    const chMin = Math.min(...list.map((a) => a.meanChaptersPerLife));
    const chMax = Math.max(...list.map((a) => a.meanChaptersPerLife));
    const best = list.reduce((a, b) => (a.meanChaptersPerLife > b.meanChaptersPerLife ? a : b)).spec.startingBlessing;
    const worst = list.reduce((a, b) => (a.meanChaptersPerLife < b.meanChaptersPerLife ? a : b)).spec.startingBlessing;
    lines.push(
      `| ${cls} | ${num(chMin)} | ${num(chMax)} | ${num(chMax - chMin)} | ${best} | ${worst} |`,
    );
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();
  const matrix = buildMatrix();
  console.log(`Choice-impact sweep — ${matrix.length} cells × ${RUNS_PER_CELL} runs × ≤${LIVES_PER_RUN} lives, start L${START_LEVEL}\n`);
  const aggs: Aggregate[] = [];
  for (const spec of matrix) {
    const cellStart = Date.now();
    const cell = runCell(spec);
    const agg = aggregate(spec, cell);
    aggs.push(agg);
    console.log(
      `[${spec.axis.padEnd(8)}] ${spec.label.padEnd(34)} → death ${pct(agg.lifeDeathRate).padStart(6)}  runClr ${pct(agg.runWinRate).padStart(6)}  ch/run ${num(agg.meanChaptersPerLife)}  enc/life ${num(agg.meanEncountersPerLife, 1)}  ${Date.now() - cellStart}ms`,
    );
  }
  const wall = ((Date.now() - t0) / 1000).toFixed(1);

  const doc = `# Choice-impact — raw sim output

> Auto-generated by \`scripts/sim-choice-impact.ts\`. Re-run with
> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-choice-impact.ts\`.
>
> Curated analysis in [\`choice-impact.md\`](./choice-impact.md).

**Cells:** ${matrix.length}. **Runs/cell:** ${RUNS_PER_CELL}. **Lives/run:** ≤${LIVES_PER_RUN}. **Start level:** ${START_LEVEL}. **Wall clock:** ${wall}s.

Bare-soul chain otherwise: shrines/events skipped, rest heals 70%, camps long-rest, XP propagates. The single shrine blessing in axis 2 is *handed* to the character before delve start (sim AI doesn't visit shrines).

## Axis 1 — Race × class

${renderRaceTable(aggs)}

### Race variance per class

${renderRaceVariance(aggs)}

## Axis 2 — Shrine blessing forced-pick (single starting blessing)

${renderBlessingTable(aggs)}

### Blessing variance per class

${renderBlessingVariance(aggs)}
`;
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/choice-impact.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw matrix → ${outPath}  (${wall}s wall)`);
}

main();
