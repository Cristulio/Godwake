/**
 * Loadout-diversity sweep — per-blessing survival/damage lift over a control
 * (no blessing). The META question after PR #80 / #86 fixed five aggregator
 * fields to max-of-individual: is there a "best blessing" at each shrine,
 * or do players still have meaningful pick variety?
 *
 * Method: each (class × level) cell is run once per variant. A variant is
 *   - `none` (control, no blessing)
 *   - one of the 21 pool blessings, set as the soul's only blessing
 *
 * Combat AI / character builders are transplanted from `sim-full-matrix.ts`
 * so cell numbers are directly comparable. Bare-soul: shrines + events are
 * skipped — the only thing changing between variants is the blessing.
 *
 * Run:
 *   RUNS_PER_CELL=200 npx tsx scripts/sim-blessing-diversity.ts
 *
 * Writes raw matrix to docs/gameplay-quality/loadout-diversity.raw.md.
 * Curated analysis lives in docs/gameplay-quality/loadout-diversity.md.
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
import { rollRoomGoldDrops } from '../src/engine/combat/goldDrop';
import { listBlessings } from '../src/content/blessings';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 200);
const LIVES_PER_RUN = 3;
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xb1e551 >>> 0;
const LEVELS: number[] = [3, 5];
const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard'];

const BLESSING_IDS = listBlessings().map((b) => b.id);
const VARIANTS: string[] = ['none', ...BLESSING_IDS];

// ─────────────────────────────────────────────────────────────────────────
// Character builders — copied from sim-full-matrix.ts.
// ─────────────────────────────────────────────────────────────────────────

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

function freshCharacter(classId: ClassId, level: number, blessingId: string): Character {
  let c: Character;
  if (classId === 'rogue') c = rogueAt(level);
  else if (classId === 'fighter') c = fighterAt(level);
  else c = wizardAt(level);
  if (blessingId !== 'none') c = { ...c, blessings: [blessingId] };
  return c;
}

// ─────────────────────────────────────────────────────────────────────────
// AI helpers
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

const BOSS_DEF_IDS = new Set([
  'duergar-ilyich',
  'athkatla-magistrate',
  'asylum-director',
  'drow-matron-mother',
]);

function isBossEncounter(state: CombatState): boolean {
  return state.combatants.some(
    (c) => c.kind === 'monster' && BOSS_DEF_IDS.has(c.instance.defId),
  );
}

function findPotionIdx(c: Character): number {
  return c.inventory.findIndex((ref) => ref.itemId === 'potion-of-healing');
}

// ─────────────────────────────────────────────────────────────────────────
// Per-class turn AIs (copied from sim-full-matrix.ts).
// ─────────────────────────────────────────────────────────────────────────

interface TurnCtx {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
  stats: RunStats;
}

function rogueTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller, stats } = ctx;

  if (character.hp.current / character.hp.max <= 0.35) {
    const idx = findPotionIdx(character);
    if (idx >= 0 && !character.actionEconomy.actionUsed) {
      const before = character.hp.current;
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
      stats.potionsUsed += 1;
      stats.hpHealed += character.hp.current - before;
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
      const monsterHpBefore = target.instance.hp.current;
      const r = playerAttack({ roller, character, state }, target.id, weaponId);
      state = r.state;
      character = r.character;
      if (state.lastAttack) {
        stats.attacks += 1;
        if (state.lastAttack.hit) stats.hits += 1;
        if (state.lastAttack.crit) stats.crits += 1;
      }
      const after = state.combatants.find((c) => c.id === target.id);
      if (after && after.kind === 'monster') {
        const delta = monsterHpBefore - after.instance.hp.current;
        if (delta > 0) stats.damageDealt += delta;
      }
    }
  }

  if (state.status !== 'active') return { state, character };
  return endTurn(state, character);
}

function fighterTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller, stats } = ctx;

  if (isPlayerParalyzed(character) && character.actionEconomy.actionUsed) {
    return endTurn(state, character);
  }

  if (
    character.hp.current <= character.hp.max * 0.5 &&
    character.resources.secondWindAvailable &&
    !character.actionEconomy.bonusActionUsed
  ) {
    const before = character.hp.current;
    const r = useSecondWind({ roller, character, state });
    state = r.state;
    character = r.character;
    if (character.hp.current > before) {
      stats.hpHealed += character.hp.current - before;
    }
  }

  if (character.hp.current / character.hp.max <= 0.3 && !character.actionEconomy.actionUsed) {
    const idx = findPotionIdx(character);
    if (idx >= 0) {
      const before = character.hp.current;
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
      stats.potionsUsed += 1;
      stats.hpHealed += character.hp.current - before;
    }
  }

  for (let i = 0; i < 4; i++) {
    if (character.actionEconomy.actionUsed) break;
    if (state.status !== 'active') break;
    const target = pickLowestHpTarget(state);
    const weaponId = character.equipped.mainHand?.itemId;
    if (!target || !weaponId) break;
    const monsterHpBefore = target.instance.hp.current;
    const r = playerAttack({ roller, character, state }, target.id, weaponId);
    state = r.state;
    character = r.character;
    if (state.lastAttack) {
      stats.attacks += 1;
      if (state.lastAttack.hit) stats.hits += 1;
      if (state.lastAttack.crit) stats.crits += 1;
    }
    const after = state.combatants.find((c) => c.id === target.id);
    if (after && after.kind === 'monster') {
      const delta = monsterHpBefore - after.instance.hp.current;
      if (delta > 0) stats.damageDealt += delta;
    }
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
          const monsterHpBefore = target.instance.hp.current;
          const r2 = playerAttack({ roller, character, state }, target.id, weaponId);
          state = r2.state;
          character = r2.character;
          if (state.lastAttack) {
            stats.attacks += 1;
            if (state.lastAttack.hit) stats.hits += 1;
            if (state.lastAttack.crit) stats.crits += 1;
          }
          const after = state.combatants.find((c) => c.id === target.id);
          if (after && after.kind === 'monster') {
            const delta = monsterHpBefore - after.instance.hp.current;
            if (delta > 0) stats.damageDealt += delta;
          }
        }
      }
    }
  }

  if (state.status !== 'active') return { state, character };
  return endTurn(state, character);
}

function wizardTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller, stats } = ctx;
  const alive = livingMonsters(state);
  if (alive.length === 0) return endTurn(state, character);

  if (character.hp.current / character.hp.max <= 0.35 && !character.actionEconomy.actionUsed) {
    const idx = findPotionIdx(character);
    if (idx >= 0) {
      const before = character.hp.current;
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
      stats.potionsUsed += 1;
      stats.hpHealed += character.hp.current - before;
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
    const hpBeforeAll = totalLivingHp(state);
    let cast = false;

    if (
      livingNow.length >= 2 &&
      slotsAt(character, 3) > 0 &&
      canCastSpell(character, 'fireball').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'fireball' });
      if (r.cast) {
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
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
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
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
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
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
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
        state = r.state;
        character = r.character;
        cast = true;
      }
    }

    if (!cast) {
      const target = pickLowestHpTarget(state)!;
      const monsterHpBefore = target.instance.hp.current;
      const r = castSpell({ roller, character, state, spellId: 'fire-bolt', targetId: target.id });
      if (r.cast) {
        const after = r.state.combatants.find((c) => c.id === target.id);
        const dealt =
          after && after.kind === 'monster'
            ? Math.max(0, monsterHpBefore - after.instance.hp.current)
            : 0;
        stats.damageDealt += dealt;
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

// ─────────────────────────────────────────────────────────────────────────
// Run driver
// ─────────────────────────────────────────────────────────────────────────

interface RunStats {
  damageDealt: number;
  damageTaken: number;
  hpHealed: number;
  attacks: number;
  hits: number;
  crits: number;
  potionsUsed: number;
  encountersFought: number;
  encountersWon: number;
  combatRoundsTotal: number;
  goldAccumulated: number;
  lifeOutcomes: Array<{ life: number; cleared: boolean; finalRoomIdx: number; finalChapter: number }>;
}

function roomChapter(idx: number): number {
  // Matches sim-full-matrix: rooms 0..9 = Ch1, 10 = camp, 11..18 = Ch2,
  // 19 = camp, 20..27 = Ch3, 28 = camp, 29..36 = Ch4.
  if (idx <= 10) return 1;
  if (idx <= 19) return 2;
  if (idx <= 28) return 3;
  return 4;
}

function emptyStats(): RunStats {
  return {
    damageDealt: 0,
    damageTaken: 0,
    hpHealed: 0,
    attacks: 0,
    hits: 0,
    crits: 0,
    potionsUsed: 0,
    encountersFought: 0,
    encountersWon: 0,
    combatRoundsTotal: 0,
    goldAccumulated: 0,
    lifeOutcomes: [],
  };
}

function runCombat(
  roller: DiceRoller,
  classId: ClassId,
  characterIn: Character,
  room: RoomSpec,
  stats: RunStats,
): { character: Character; victory: boolean; defIds: string[] } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;
  const defIds = monsterRefs.map((m) => m.def.id);
  const startRound = state.round;
  let turnsTaken = 0;

  while (state.status === 'active' && turnsTaken < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const hpBefore = character.hp.current;
      const turn = playerTurn(classId, { roller, state, character, stats });
      state = turn.state;
      character = turn.character;
      if (character.hp.current < hpBefore) stats.damageTaken += hpBefore - character.hp.current;
    } else {
      const hpBefore = character.hp.current;
      const r = monsterAttack(
        { roller, character, state },
        state.turnOrder[state.currentTurnIndex],
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

  const rounds = Math.max(1, state.round - startRound + 1);
  stats.combatRoundsTotal += rounds;
  stats.encountersFought += 1;
  const victory = state.status === 'player-victory';
  if (victory) {
    stats.encountersWon += 1;
    stats.goldAccumulated += rollRoomGoldDrops(roller, defIds);
  }
  return { character, victory, defIds };
}

function liveOneAttempt(
  roller: DiceRoller,
  classId: ClassId,
  startLevel: number,
  blessingId: string,
  stats: RunStats,
  lifeIdx: number,
): { cleared: boolean; finalRoomIdx: number; finalChapter: number } {
  let character = freshCharacter(classId, startLevel, blessingId);
  const delveSeed =
    ((roller.roll('1d100').total * 2654435761) ^ (lifeIdx * 7919) ^ classId.charCodeAt(0)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed });
  let finalRoomIdx = 0;

  for (let i = 0; i < delve.rooms.length; i++) {
    finalRoomIdx = i;
    const room = delve.rooms[i];

    if (room.kind === 'rest') {
      const before = character.hp.current;
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      stats.hpHealed += character.hp.current - before;
      continue;
    }
    if (room.kind === 'camp') {
      const before = character.hp.current;
      character = longRest(character);
      stats.hpHealed += character.hp.current - before;
      continue;
    }
    if (room.kind === 'shrine' || room.kind === 'event') continue;

    const result = runCombat(roller, classId, character, room, stats);
    character = result.character;
    if (!result.victory) {
      return { cleared: false, finalRoomIdx, finalChapter: roomChapter(finalRoomIdx) };
    }
    const roomXp = room.xpReward ?? 0;
    if (roomXp > 0) {
      character = { ...character, xp: character.xp + roomXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  return { cleared: true, finalRoomIdx, finalChapter: 4 };
}

function runCell(
  classId: ClassId,
  startLevel: number,
  blessingId: string,
): RunStats[] {
  const cell: RunStats[] = [];
  // Per-cell seed offset by variant so two blessings see different seeds — we
  // are comparing across blessings, not within seeds.
  const variantSalt = (() => {
    let h = 0;
    for (let i = 0; i < blessingId.length; i++) h = (h * 31 + blessingId.charCodeAt(i)) >>> 0;
    return h;
  })();
  const cellSeedBase = (SEED_BASE ^ variantSalt) >>> 0;
  for (let runIdx = 0; runIdx < RUNS_PER_CELL; runIdx++) {
    const stats = emptyStats();
    for (let life = 0; life < LIVES_PER_RUN; life++) {
      const seed = ((cellSeedBase + runIdx * 101 + life * 7919) ^ (startLevel * 1009)) >>> 0;
      const roller = createDiceRoller(seed);
      setActiveRoller(seed);
      const outcome = liveOneAttempt(roller, classId, startLevel, blessingId, stats, life);
      stats.lifeOutcomes.push({
        life,
        cleared: outcome.cleared,
        finalRoomIdx: outcome.finalRoomIdx,
        finalChapter: outcome.finalChapter,
      });
      if (outcome.cleared) break;
    }
    cell.push(stats);
  }
  return cell;
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────────

interface CellAgg {
  classId: ClassId;
  startLevel: number;
  blessingId: string;
  runs: number;
  lives: number;
  livesUsedMean: number;
  runWinRate: number;        // any life cleared the chain
  lifeClearRate: number;     // lives that cleared / total lives
  meanDmgDealtPerLife: number;
  meanDmgTakenPerLife: number;
  meanRoomsReachedPerLife: number;
  // Per-chapter reach: did the life make it _into_ chapter N (room idx past
  // the prior camp)?  reachCh1 is trivially 1 for any life that took a step.
  reachCh2: number;
  reachCh3: number;
  reachCh4: number;
  // Survival proxy: chapter floor of final life — 1..4.
  meanFinalChapter: number;
}

function aggregate(cell: RunStats[], classId: ClassId, startLevel: number, blessingId: string): CellAgg {
  const totalLives = cell.reduce((s, r) => s + r.lifeOutcomes.length, 0);
  const clearedLives = cell.reduce(
    (s, r) => s + r.lifeOutcomes.filter((l) => l.cleared).length,
    0,
  );
  const sumDmgDealt = cell.reduce((s, r) => s + r.damageDealt, 0);
  const sumDmgTaken = cell.reduce((s, r) => s + r.damageTaken, 0);
  const sumRooms = cell.reduce(
    (s, r) =>
      s +
      r.lifeOutcomes.reduce((ss, lo) => ss + lo.finalRoomIdx + (lo.cleared ? 1 : 0), 0),
    0,
  );
  const runsCleared = cell.filter((r) => r.lifeOutcomes.some((l) => l.cleared)).length;

  let reachedCh2 = 0;
  let reachedCh3 = 0;
  let reachedCh4 = 0;
  let sumFinalChapter = 0;
  for (const r of cell) {
    for (const lo of r.lifeOutcomes) {
      if (lo.finalRoomIdx >= 11) reachedCh2 += 1;
      if (lo.finalRoomIdx >= 20) reachedCh3 += 1;
      if (lo.finalRoomIdx >= 29) reachedCh4 += 1;
      sumFinalChapter += lo.finalChapter;
    }
  }

  return {
    classId,
    startLevel,
    blessingId,
    runs: cell.length,
    lives: totalLives,
    livesUsedMean: totalLives / Math.max(1, cell.length),
    runWinRate: runsCleared / Math.max(1, cell.length),
    lifeClearRate: totalLives === 0 ? 0 : clearedLives / totalLives,
    meanDmgDealtPerLife: totalLives === 0 ? 0 : sumDmgDealt / totalLives,
    meanDmgTakenPerLife: totalLives === 0 ? 0 : sumDmgTaken / totalLives,
    meanRoomsReachedPerLife: totalLives === 0 ? 0 : sumRooms / totalLives,
    reachCh2: totalLives === 0 ? 0 : reachedCh2 / totalLives,
    reachCh3: totalLives === 0 ? 0 : reachedCh3 / totalLives,
    reachCh4: totalLives === 0 ? 0 : reachedCh4 / totalLives,
    meanFinalChapter: totalLives === 0 ? 0 : sumFinalChapter / totalLives,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function renderRaw(aggs: CellAgg[], wallSec: string): string {
  const lines: string[] = [];
  lines.push(`# Loadout-diversity sweep — raw output

> Auto-generated by \`scripts/sim-blessing-diversity.ts\`. Re-run with
> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-blessing-diversity.ts\`.
> Curated analysis lives in [\`loadout-diversity.md\`](./loadout-diversity.md).

**Cells:** ${aggs.length}.
**Runs / cell:** ${RUNS_PER_CELL}.
**Lives / run:** ${LIVES_PER_RUN}.
**Total lives simulated:** ${aggs.reduce((s, a) => s + a.lives, 0)}.
**Wall clock:** ${wallSec}s.

## Headline matrix — per (class, level, blessing)
`);
  lines.push(
    '| Class | L | Blessing | Lives | LifeClear% | Rooms/life | Ch2% | Ch3% | Ch4% | FinalCh | Dmg dealt/life | Dmg taken/life |',
  );
  lines.push('|------|--:|---------|-----:|----------:|----------:|-----:|-----:|-----:|-------:|--------------:|--------------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${a.startLevel} | ${a.blessingId} | ${a.lives} | ${pct(a.lifeClearRate)} | ${num(a.meanRoomsReachedPerLife, 1)} | ${pct(a.reachCh2)} | ${pct(a.reachCh3)} | ${pct(a.reachCh4)} | ${num(a.meanFinalChapter, 2)} | ${num(a.meanDmgDealtPerLife, 0)} | ${num(a.meanDmgTakenPerLife, 0)} |`,
    );
  }
  return lines.join('\n');
}

function main(): void {
  const tWall0 = Date.now();
  const total = CLASSES.length * LEVELS.length * VARIANTS.length;
  console.log(
    `Blessing-diversity sweep — ${CLASSES.length} classes × ${LEVELS.length} levels × ${VARIANTS.length} variants = ${total} cells × ${RUNS_PER_CELL} runs/cell × ${LIVES_PER_RUN} lives\n`,
  );

  const aggs: CellAgg[] = [];
  let cellIdx = 0;
  for (const classId of CLASSES) {
    for (const level of LEVELS) {
      for (const blessingId of VARIANTS) {
        const t0 = Date.now();
        const cell = runCell(classId, level, blessingId);
        const agg = aggregate(cell, classId, level, blessingId);
        aggs.push(agg);
        const dt = Date.now() - t0;
        cellIdx += 1;
        console.log(
          `[${String(cellIdx).padStart(3)}/${total}] ${classId.padEnd(7)} L${level} ${blessingId.padEnd(22)} → clear ${pct(agg.lifeClearRate).padStart(6)}  dmg ${num(agg.meanDmgDealtPerLife, 0).padStart(6)}  ${dt}ms`,
        );
      }
    }
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderRaw(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/loadout-diversity.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');

  // Also write a JSON snapshot so the diagnostic step can compute lift without
  // re-running the sweep.
  const jsonPath = resolve(process.cwd(), 'docs/gameplay-quality/loadout-diversity.raw.json');
  writeFileSync(jsonPath, JSON.stringify({ runsPerCell: RUNS_PER_CELL, livesPerRun: LIVES_PER_RUN, aggs }, null, 2), 'utf8');

  console.log(`\nWrote raw matrix → ${outPath}`);
  console.log(`Wrote JSON snapshot → ${jsonPath}`);
  console.log(`Wall clock: ${dtTotal}s`);
}

main();
