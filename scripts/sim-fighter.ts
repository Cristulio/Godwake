/**
 * Fighter balance simulator — headless run of a Champion Fighter through the
 * full Godwake delve (Ch1–Ch4). Used to compare death rates, resource usage,
 * and time-to-kill across start levels for the sim-fighter-balance worktree.
 *
 * Run via vitest: `npx vitest run scripts/sim-fighter.test.ts`.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createDiceRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import {
  buildPlayerCharacter,
  SIR_BRICK_PRESET,
} from '../src/engine/character/defaultCharacter';
import { applyLevelUp, xpForLevel } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat } from '../src/engine/combat/createCombat';
import { playerAttack } from '../src/engine/combat/attack/playerAttack';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import { useSecondWind } from '../src/engine/combat/secondWind';
import { useActionSurge } from '../src/engine/combat/actionSurge';
import { isPlayerParalyzed } from '../src/engine/combat/holdPerson';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

const MAX_TURNS_PER_FIGHT = 100; // hard cap; long fights count toward TTK only

export interface RunMetrics {
  startLevel: number;
  finalLevel: number;
  chaptersCleared: number;
  roomsCleared: number;
  combatsCompleted: number;
  combatRounds: number;
  died: boolean;
  deathRoomId: string | null;
  deathCause: string | null;
  damageDealt: number;
  damageTaken: number;
  hpHealed: number;
  secondWindUses: number;
  actionSurgeUses: number;
  critsRolled: number;
  attackRolls: number;
  hits: number;
}

const CHAPTER_BOSS_IDS = new Set([
  'duergar-ilyich',
  'athkatla-magistrate',
  'asylum-director',
  'drow-matron-mother',
]);

function fighterAtLevel(startLevel: number): Character {
  let c = buildPlayerCharacter(SIR_BRICK_PRESET);
  while (c.level < startLevel) {
    c = applyLevelUp(c);
  }
  c = { ...c, xp: xpForLevel(c.level) };
  return c;
}

function livingMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants
    .filter((c): c is MonsterCombatant => c.kind === 'monster')
    .filter((c) => c.instance.hp.current > 0);
}

function pickTarget(state: CombatState): MonsterCombatant | null {
  const living = livingMonsters(state);
  if (living.length === 0) return null;
  return [...living].sort((a, b) => a.instance.hp.current - b.instance.hp.current)[0];
}

function totalLivingMonsterHp(state: CombatState): number {
  return livingMonsters(state).reduce((sum, m) => sum + m.instance.hp.current, 0);
}

function isBossEncounter(state: CombatState): boolean {
  const monsters = state.combatants.filter((c) => c.kind === 'monster');
  return monsters.some((c) => c.kind === 'monster' && CHAPTER_BOSS_IDS.has(c.instance.defId));
}

interface PlayerTurnInput {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
  metrics: RunMetrics;
}

function tryUseSecondWind(input: PlayerTurnInput): { state: CombatState; character: Character } {
  const { roller, state, character, metrics } = input;
  const lowHp = character.hp.current <= character.hp.max * 0.5;
  if (
    !lowHp ||
    !character.resources.secondWindAvailable ||
    character.actionEconomy.bonusActionUsed
  ) {
    return { state, character };
  }
  const before = character.hp.current;
  const result = useSecondWind({ roller, character, state });
  if (result.character.hp.current > before) {
    metrics.secondWindUses += 1;
    metrics.hpHealed += result.character.hp.current - before;
  }
  return result;
}

function tryAttack(input: PlayerTurnInput): { state: CombatState; character: Character } {
  let { state, character } = input;
  const { roller, metrics } = input;
  const target = pickTarget(state);
  if (!target) return { state, character };
  const weapon = character.equipped.mainHand?.itemId;
  if (!weapon) return { state, character };

  const monsterBefore = target.instance.hp.current;
  const attackIdBefore = state.attackEventCounter;

  const result = playerAttack({ roller, character, state }, target.id, weapon);
  state = result.state;
  character = result.character;

  if (state.attackEventCounter > attackIdBefore && state.lastAttack) {
    metrics.attackRolls += 1;
    if (state.lastAttack.hit) metrics.hits += 1;
    if (state.lastAttack.crit) metrics.critsRolled += 1;
  }

  const monsterAfter =
    state.combatants.find((c) => c.id === target.id)?.kind === 'monster'
      ? (state.combatants.find((c) => c.id === target.id) as MonsterCombatant).instance.hp.current
      : 0;
  if (monsterAfter < monsterBefore) {
    metrics.damageDealt += monsterBefore - monsterAfter;
  }

  return { state, character };
}

function attackUntilActionSpent(input: PlayerTurnInput): { state: CombatState; character: Character } {
  let { state, character } = input;
  // Safety cap: 4 swings max per "action" — even with future Extra Attack 2.
  for (let i = 0; i < 4; i++) {
    if (character.actionEconomy.actionUsed) break;
    if (state.status !== 'active') break;
    if (livingMonsters(state).length === 0) break;
    const result = tryAttack({ ...input, state, character });
    state = result.state;
    character = result.character;
  }
  return { state, character };
}

function shouldUseActionSurge(state: CombatState, character: Character): boolean {
  if (character.level < 2) return false;
  if ((character.resources.actionSurgeRemaining ?? 0) <= 0) return false;
  if (!character.actionEconomy.actionUsed) return false; // surge only after spending action
  const living = livingMonsters(state);
  if (living.length === 0) return false;
  // Boss: surge when there's meaningful HP left and we've been bloodied.
  if (isBossEncounter(state)) {
    return (
      living[0].instance.hp.current > living[0].instance.hp.max * 0.25 &&
      character.hp.current <= character.hp.max * 0.7
    );
  }
  // Multi-mob: surge when several enemies still alive or HP burn is high.
  const totalHp = totalLivingMonsterHp(state);
  return living.length >= 2 || totalHp >= character.hp.max * 0.6;
}

function playerTurn(input: PlayerTurnInput): { state: CombatState; character: Character } {
  let { state, character } = input;
  const { metrics, roller } = input;

  // Paralysis (Magistrate's Hold Person): if all actions locked, just end turn.
  if (isPlayerParalyzed(character) && character.actionEconomy.actionUsed) {
    const ended = endTurn(state, character);
    return ended;
  }

  // Self-heal pre-combat actions if hurting.
  const swResult = tryUseSecondWind({ ...input });
  state = swResult.state;
  character = swResult.character;

  // Main attack chain.
  const attackResult = attackUntilActionSpent({ roller, state, character, metrics });
  state = attackResult.state;
  character = attackResult.character;

  if (state.status !== 'active') return { state, character };

  // Action Surge?
  if (shouldUseActionSurge(state, character)) {
    const surge = useActionSurge({ state, character });
    if (!surge.character.actionEconomy.actionUsed) {
      metrics.actionSurgeUses += 1;
      state = surge.state;
      character = surge.character;
      const second = attackUntilActionSpent({ roller, state, character, metrics });
      state = second.state;
      character = second.character;
    }
  }

  if (state.status !== 'active') return { state, character };

  const ended = endTurn(state, character);
  return ended;
}

function monsterTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
  metrics: RunMetrics,
): { state: CombatState; character: Character } {
  const currentId = state.initiativeOrder[state.currentTurnIndex];
  const before = character.hp.current;
  const result = monsterAttack({ roller, character, state }, currentId);
  let nextState = result.state;
  let nextCharacter = result.character;
  if (nextCharacter.hp.current < before) {
    metrics.damageTaken += before - nextCharacter.hp.current;
  }
  if (nextState.status === 'active') {
    const ended = endTurn(nextState, nextCharacter);
    nextState = ended.state;
    nextCharacter = ended.character;
  }
  return { state: nextState, character: nextCharacter };
}

function runEncounter(
  roller: DiceRoller,
  character: Character,
  room: RoomSpec,
  metrics: RunMetrics,
): { character: Character; victory: boolean } {
  const monsterSpecs: { def: ReturnType<typeof getMonster> }[] = [];
  for (const m of room.monsters ?? []) {
    for (let i = 0; i < m.count; i++) {
      monsterSpecs.push({ def: getMonster(m.defId) });
    }
  }
  const init = createCombat({ roller, character, monsters: monsterSpecs });
  let state = init.state;
  let next = init.character;
  const startRound = state.round;
  let turnsTaken = 0;

  while (state.status === 'active' && turnsTaken < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const t = playerTurn({ roller, state, character: next, metrics });
      state = t.state;
      next = t.character;
    } else {
      const t = monsterTurn(roller, state, next, metrics);
      state = t.state;
      next = t.character;
    }
    turnsTaken += 1;
  }

  metrics.combatRounds += Math.max(1, state.round - startRound + 1);
  metrics.combatsCompleted += 1;

  return { character: next, victory: state.status === 'player-victory' };
}

function tryLevelUp(character: Character): Character {
  // Auto-bump levels while xp threshold met. Caps inside applyLevelUp.
  let c = character;
  while (c.level < 8 && c.xp >= xpForLevel(c.level + 1)) {
    c = applyLevelUp(c);
  }
  return c;
}

export function runOnce(startLevel: number, seed: number): RunMetrics {
  const roller = createDiceRoller(seed);
  let character = fighterAtLevel(startLevel);
  const metrics: RunMetrics = {
    startLevel,
    finalLevel: character.level,
    chaptersCleared: 0,
    roomsCleared: 0,
    combatsCompleted: 0,
    combatRounds: 0,
    died: false,
    deathRoomId: null,
    deathCause: null,
    damageDealt: 0,
    damageTaken: 0,
    hpHealed: 0,
    secondWindUses: 0,
    actionSurgeUses: 0,
    critsRolled: 0,
    attackRolls: 0,
    hits: 0,
  };

  const delve = createGodwakeDelve(seed);
  for (const room of delve.rooms) {
    if (room.kind === 'combat' || room.kind === 'boss') {
      const result = runEncounter(roller, character, room, metrics);
      character = result.character;
      if (!result.victory) {
        metrics.died = true;
        metrics.deathRoomId = room.id;
        metrics.deathCause = (room.monsters ?? []).map((m) => m.defId).join('+');
        metrics.finalLevel = character.level;
        return metrics;
      }
      const xp = room.xpReward ?? 0;
      character = tryLevelUp({ ...character, xp: character.xp + xp });
      if (room.kind === 'boss') metrics.chaptersCleared += 1;
    } else if (room.kind === 'rest') {
      const heal = Math.floor(character.hp.max * 0.7);
      const before = character.hp.current;
      character = shortRestHeal(character, heal);
      metrics.hpHealed += character.hp.current - before;
    } else if (room.kind === 'camp') {
      const before = character.hp.current;
      character = longRest(character);
      metrics.hpHealed += character.hp.current - before;
    } else {
      // shrine / event / treasure → skip in sim (no blessing pick, no event choice)
    }
    metrics.roomsCleared += 1;
  }

  metrics.finalLevel = character.level;
  return metrics;
}

export interface CellResult {
  startLevel: number;
  runs: RunMetrics[];
}

export interface MatrixResult {
  cells: CellResult[];
  runsPerCell: number;
  seedBase: number;
}

export function runMatrix(
  startLevels: number[] = [1, 3, 5, 7],
  runsPerCell = 50,
  seedBase = 0x5f1ee7,
): MatrixResult {
  const cells: CellResult[] = [];
  for (const lvl of startLevels) {
    const runs: RunMetrics[] = [];
    for (let i = 0; i < runsPerCell; i++) {
      const seed = seedBase + lvl * 10_000 + i;
      runs.push(runOnce(lvl, seed));
    }
    cells.push({ startLevel: lvl, runs });
  }
  return { cells, runsPerCell, seedBase };
}

interface Aggregate {
  startLevel: number;
  n: number;
  deathRate: number;
  meanChapters: number;
  meanRooms: number;
  meanFinalLevel: number;
  meanCombats: number;
  meanRoundsPerCombat: number;
  meanDamageDealt: number;
  meanDamageTaken: number;
  meanHpHealed: number;
  meanSecondWind: number;
  meanActionSurge: number;
  hitRate: number;
  critRate: number;
  deathByRoom: Record<string, number>;
}

function aggregate(cell: CellResult): Aggregate {
  const r = cell.runs;
  const n = r.length;
  const sum = (sel: (m: RunMetrics) => number) => r.reduce((a, m) => a + sel(m), 0);
  const mean = (sel: (m: RunMetrics) => number) => (n === 0 ? 0 : sum(sel) / n);
  const totalAttacks = sum((m) => m.attackRolls);
  const totalHits = sum((m) => m.hits);
  const totalCrits = sum((m) => m.critsRolled);
  const totalCombats = sum((m) => m.combatsCompleted);
  const totalRounds = sum((m) => m.combatRounds);
  const deathByRoom: Record<string, number> = {};
  for (const m of r) {
    if (m.died && m.deathRoomId) {
      deathByRoom[m.deathRoomId] = (deathByRoom[m.deathRoomId] ?? 0) + 1;
    }
  }
  return {
    startLevel: cell.startLevel,
    n,
    deathRate: r.filter((m) => m.died).length / n,
    meanChapters: mean((m) => m.chaptersCleared),
    meanRooms: mean((m) => m.roomsCleared),
    meanFinalLevel: mean((m) => m.finalLevel),
    meanCombats: mean((m) => m.combatsCompleted),
    meanRoundsPerCombat: totalCombats === 0 ? 0 : totalRounds / totalCombats,
    meanDamageDealt: mean((m) => m.damageDealt),
    meanDamageTaken: mean((m) => m.damageTaken),
    meanHpHealed: mean((m) => m.hpHealed),
    meanSecondWind: mean((m) => m.secondWindUses),
    meanActionSurge: mean((m) => m.actionSurgeUses),
    hitRate: totalAttacks === 0 ? 0 : totalHits / totalAttacks,
    critRate: totalAttacks === 0 ? 0 : totalCrits / totalAttacks,
    deathByRoom,
  };
}

export function summarizeMatrix(matrix: MatrixResult): Aggregate[] {
  return matrix.cells.map(aggregate);
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number, digits = 2): string {
  return n.toFixed(digits);
}

export function renderFindings(label: string, matrix: MatrixResult, beforeMatrix?: MatrixResult): string {
  const agg = summarizeMatrix(matrix);
  const aggBefore = beforeMatrix ? summarizeMatrix(beforeMatrix) : null;
  const rows = (a: Aggregate[]) =>
    a
      .map(
        (g) =>
          `| L${g.startLevel} | ${g.n} | ${fmtPct(g.deathRate)} | ${fmtNum(g.meanChapters)} | ${fmtNum(g.meanRooms, 1)} | ${fmtNum(g.meanFinalLevel, 2)} | ${fmtNum(g.meanRoundsPerCombat)} | ${fmtPct(g.hitRate)} | ${fmtPct(g.critRate)} | ${fmtNum(g.meanDamageDealt, 0)} | ${fmtNum(g.meanDamageTaken, 0)} | ${fmtNum(g.meanHpHealed, 0)} | ${fmtNum(g.meanSecondWind)} | ${fmtNum(g.meanActionSurge)} |`,
      )
      .join('\n');

  const header =
    '| Start | N | Deaths | Chapters | Rooms | Final lvl | Rounds/combat | Hit% | Crit% | Dmg dealt | Dmg taken | HP healed | SW uses | AS uses |\n' +
    '|------:|--:|------:|--------:|------:|---------:|-------------:|-----:|-----:|----------:|----------:|----------:|-------:|-------:|';

  const deathLines = agg
    .map((g) => {
      const top = Object.entries(g.deathByRoom)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, n]) => `${id} (${n})`)
        .join(', ');
      return `- L${g.startLevel}: ${top || '—'}`;
    })
    .join('\n');

  return `# Fighter balance — sim findings (${label})\n\n## Matrix\n\n${header}\n${rows(agg)}\n\n${
    aggBefore
      ? `### Before fix (for comparison)\n\n${header}\n${rows(aggBefore)}\n\n`
      : ''
  }## Where deaths cluster\n\n${deathLines}\n`;
}

export function writeFindings(content: string, filename = 'fighter-balance.md'): string {
  const path = resolve(process.cwd(), 'docs/sim-findings', filename);
  writeFileSync(path, content, 'utf8');
  return path;
}
