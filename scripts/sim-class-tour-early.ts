/**
 * Multi-class early-game tour (Ch1 + Ch2). 3 classes × {L1, L3} × 50 runs.
 *
 * Each "run" = a soul that gets up to 3 lives (per the reincarnation loop).
 * On death the soul reincarnates fresh at the same start level and starts
 * Ch1 again. We aggregate per-life metrics into a per-cell summary.
 *
 * Run with:  npx tsx scripts/sim-class-tour-early.ts
 *
 * Writes a Markdown summary to docs/playtest-findings/class-tour-early.md.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createCharacter, STANDARD_ARRAY } from '../src/engine/character/initialize';
import { applyLevelUp } from '../src/engine/character/leveling';
import { longRest, shortRestHeal } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat } from '../src/engine/combat/createCombat';
import { playerAttack, monsterAttack } from '../src/engine/combat/attack';
import { endTurn } from '../src/engine/combat/turn';
import { useSecondWind } from '../src/engine/combat/secondWind';
import { useActionSurge } from '../src/engine/combat/actionSurge';
import { useConsumable } from '../src/engine/combat/useItem';
import { useCunningAction } from '../src/engine/combat/cunningAction';
import { castSpell, slotsAt } from '../src/engine/combat/spells';
import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { rollBlessingOptions } from '../src/engine/character/blessings';
import { getBlessing } from '../src/content/blessings';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';
import type { ClassId, RaceId } from '../src/schemas/ids';

const RUNS_PER_CELL = 50;
const LIVES_PER_RUN = 3;
const MAX_TURNS_PER_FIGHT = 200;
const CHAPTER_LAST_ROOM_INDEX = 18; // rooms 1..19 (indices 0..18) = Ch1+Ch2 incl. Magistrate

// ─────────────────────────────────────────────────────────────────────────
// Archetypes — same loadouts the encounter-stress sim uses, so the tour
// numbers are comparable to docs/sim-findings/encounter-stress.md.
// ─────────────────────────────────────────────────────────────────────────

function buildRogue(): Character {
  const c = createCharacter({
    id: 'sim-rogue',
    name: 'Shiv',
    raceId: 'wood-elf' as RaceId,
    classId: 'rogue',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5],
      dex: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      int: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
    },
    skillProficiencies: ['stealth', 'sleight-of-hand'],
  });
  return {
    ...c,
    inventory: [
      { itemId: 'rapier' },
      { itemId: 'dagger' },
      { itemId: 'shortbow' },
      { itemId: 'leather-armor' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'rapier' },
      offHand: null,
      armor: { itemId: 'leather-armor' },
    },
  };
}

function buildFighter(): Character {
  const c = createCharacter({
    id: 'sim-fighter',
    name: 'Brick',
    raceId: 'human' as RaceId,
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      int: STANDARD_ARRAY[5],
    },
    skillProficiencies: ['athletics', 'perception'],
  });
  return {
    ...c,
    inventory: [
      { itemId: 'longsword' },
      { itemId: 'leather-armor' },
      { itemId: 'shield' },
      { itemId: 'dagger' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'longsword' },
      offHand: { itemId: 'shield' },
      armor: { itemId: 'leather-armor' },
    },
  };
}

function buildWizard(): Character {
  const c = createCharacter({
    id: 'sim-wizard',
    name: 'Quill',
    raceId: 'human' as RaceId,
    classId: 'wizard',
    baseAbilityScores: {
      int: STANDARD_ARRAY[0],
      con: STANDARD_ARRAY[1],
      dex: STANDARD_ARRAY[2],
      wis: STANDARD_ARRAY[3],
      cha: STANDARD_ARRAY[4],
      str: STANDARD_ARRAY[5],
    },
    skillProficiencies: ['arcana', 'investigation'],
  });
  return {
    ...c,
    inventory: [
      { itemId: 'dagger' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

const BUILDERS: Record<SimClassId, () => Character> = {
  rogue: buildRogue,
  fighter: buildFighter,
  wizard: buildWizard,
};

type SimClassId = Extract<ClassId, 'rogue' | 'fighter' | 'wizard'>;

function freshCharacter(classId: SimClassId, level: number): Character {
  let c = BUILDERS[classId]();
  while (c.level < level) c = applyLevelUp({ ...c, xp: 9_999_999 });
  c = longRest(c);
  return c;
}

// ─────────────────────────────────────────────────────────────────────────
// Combat AIs — per class.
// ─────────────────────────────────────────────────────────────────────────

function liveMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];
}

function lowestHpId(state: CombatState): string | undefined {
  const live = liveMonsters(state);
  if (live.length === 0) return undefined;
  return [...live].sort((a, b) => a.instance.hp.current - b.instance.hp.current)[0].id;
}

function potionIdx(ch: Character): number {
  return ch.inventory.findIndex((r) => r.itemId === 'potion-of-healing');
}

interface TurnCtx {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
  metrics: LifeMetrics;
}

function maybeUsePotion(ctx: TurnCtx): TurnCtx {
  const { character, roller, state, metrics } = ctx;
  if (character.hp.current > character.hp.max * 0.3) return ctx;
  if (character.actionEconomy.actionUsed) return ctx;
  const idx = potionIdx(character);
  if (idx < 0) return ctx;
  const before = character.hp.current;
  const r = useConsumable({ roller, character, state }, idx);
  metrics.hpHealedPotions += r.character.hp.current - before;
  metrics.potionsUsed += 1;
  return { ...ctx, state: r.state, character: r.character };
}

function rogueTurn(ctx: TurnCtx): TurnCtx {
  ctx = maybeUsePotion(ctx);
  let { roller, state, character, metrics } = ctx;
  // Cunning Action: Hide for advantage on the upcoming swing (→ Sneak Attack).
  // Heavy emergency: Disengage if very low.
  const cunningLeft = character.resources.cunningActionUsesRemaining ?? 0;
  const alive = liveMonsters(state).length;
  if (
    !character.actionEconomy.bonusActionUsed &&
    cunningLeft > 0 &&
    alive > 0
  ) {
    const hpPct = character.hp.current / character.hp.max;
    let choice: 'hide' | 'disengage' | null = null;
    if (hpPct < 0.3) choice = 'disengage';
    else if (!state.sneakAttackUsedThisTurn && !character.nextAttackAdvantage) choice = 'hide';
    if (choice) {
      const r = useCunningAction({ character, state, choice });
      state = r.state;
      character = r.character;
    }
  }
  // Attack chain (rogue has no Extra Attack — usually one swing).
  const weaponId = character.equipped.mainHand?.itemId ?? 'dagger';
  for (let i = 0; i < 3; i++) {
    if (state.status !== 'active') break;
    if (liveMonsters(state).length === 0) break;
    if (character.actionEconomy.actionUsed && !character.bonusAttackAvailable) break;
    const tid = lowestHpId(state);
    if (!tid) break;
    const dealtBefore = damageDealtNow(state);
    const r = playerAttack({ roller, character, state }, tid, weaponId);
    state = r.state;
    character = r.character;
    metrics.damageDealt += damageDealtNow(state) - dealtBefore;
  }
  return { roller, state, character, metrics };
}

function fighterTurn(ctx: TurnCtx): TurnCtx {
  let { roller, state, character, metrics } = ctx;
  // Potion if very low; else Second Wind if available + bloodied.
  if (
    character.hp.current <= character.hp.max * 0.3 &&
    !character.actionEconomy.actionUsed &&
    potionIdx(character) >= 0
  ) {
    const idx = potionIdx(character);
    const before = character.hp.current;
    const r = useConsumable({ roller, character, state }, idx);
    metrics.hpHealedPotions += r.character.hp.current - before;
    metrics.potionsUsed += 1;
    state = r.state;
    character = r.character;
  } else if (
    character.hp.current <= character.hp.max * 0.5 &&
    character.resources.secondWindAvailable === true &&
    !character.actionEconomy.bonusActionUsed
  ) {
    const before = character.hp.current;
    const r = useSecondWind({ roller, character, state });
    if (r.character.hp.current > before) {
      metrics.secondWindUses += 1;
      metrics.hpHealedSecondWind += r.character.hp.current - before;
    }
    state = r.state;
    character = r.character;
  }

  const weaponId = character.equipped.mainHand?.itemId ?? 'longsword';
  for (let pass = 0; pass < 2; pass++) {
    if (state.status !== 'active') break;
    for (let i = 0; i < 4; i++) {
      if (state.status !== 'active') break;
      if (liveMonsters(state).length === 0) break;
      if (character.actionEconomy.actionUsed) break;
      const tid = lowestHpId(state);
      if (!tid) break;
      const dealtBefore = damageDealtNow(state);
      const r = playerAttack({ roller, character, state }, tid, weaponId);
      state = r.state;
      character = r.character;
      metrics.damageDealt += damageDealtNow(state) - dealtBefore;
    }
    if (
      pass === 0 &&
      state.status === 'active' &&
      liveMonsters(state).length > 0 &&
      (character.resources.actionSurgeRemaining ?? 0) > 0 &&
      character.actionEconomy.actionUsed
    ) {
      const enemiesAlive = liveMonsters(state).length;
      const hurt = character.hp.current <= character.hp.max * 0.7;
      if (enemiesAlive >= 2 || hurt) {
        const r = useActionSurge({ character, state });
        metrics.actionSurgeUses += 1;
        state = r.state;
        character = r.character;
        continue;
      }
    }
    break;
  }
  return { roller, state, character, metrics };
}

function wizardKnowsSpell(c: Character, id: string): boolean {
  return (c.resources.knownSpells ?? []).includes(id);
}

function wizardTurn(ctx: TurnCtx): TurnCtx {
  let { roller, state, character, metrics } = ctx;
  if (
    character.hp.current <= character.hp.max * 0.3 &&
    !character.actionEconomy.actionUsed &&
    potionIdx(character) >= 0
  ) {
    const idx = potionIdx(character);
    const before = character.hp.current;
    const r = useConsumable({ roller, character, state }, idx);
    metrics.hpHealedPotions += r.character.hp.current - before;
    metrics.potionsUsed += 1;
    state = r.state;
    character = r.character;
  }
  if (character.actionEconomy.actionUsed) {
    return { roller, state, character, metrics };
  }
  const enemyCount = liveMonsters(state).length;
  if (enemyCount === 0) return { roller, state, character, metrics };
  const target = lowestHpId(state);

  const dealtBefore = damageDealtNow(state);
  let cast = false;
  if (enemyCount >= 3 && wizardKnowsSpell(character, 'fireball') && slotsAt(character, 3) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'fireball', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; metrics.spellSlot3Used += 1; }
  } else if (enemyCount >= 3 && wizardKnowsSpell(character, 'lightning-bolt') && slotsAt(character, 3) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'lightning-bolt', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; metrics.spellSlot3Used += 1; }
  } else if (enemyCount >= 2 && wizardKnowsSpell(character, 'burning-hands') && slotsAt(character, 1) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'burning-hands', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; metrics.spellSlot1Used += 1; }
  } else if (wizardKnowsSpell(character, 'magic-missile') && slotsAt(character, 1) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'magic-missile', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; metrics.spellSlot1Used += 1; }
  }
  if (!cast) {
    const r = castSpell({ roller, character, state, spellId: 'fire-bolt', targetId: target });
    if (r.cast) {
      state = r.state;
      character = r.character;
      metrics.fireBoltCasts += 1;
    }
  }
  metrics.damageDealt += damageDealtNow(state) - dealtBefore;
  return { roller, state, character, metrics };
}

function damageDealtNow(state: CombatState): number {
  // Return total damage dealt to monsters this combat by summing missing HP.
  return state.combatants.reduce((sum, c) => {
    if (c.kind !== 'monster') return sum;
    return sum + Math.max(0, c.instance.hp.max - c.instance.hp.current);
  }, 0);
}

function takeTurn(ctx: TurnCtx): TurnCtx {
  switch (ctx.character.classId) {
    case 'rogue': return rogueTurn(ctx);
    case 'fighter': return fighterTurn(ctx);
    case 'wizard': return wizardTurn(ctx);
    default: return ctx;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Per-encounter resolver — runs to completion, mutates the running metrics.
// ─────────────────────────────────────────────────────────────────────────

interface EncounterResult {
  character: Character;
  rounds: number;
  died: boolean;
  cause: string | null;
}

function runEncounter(
  roller: DiceRoller,
  character: Character,
  room: RoomSpec,
  metrics: LifeMetrics,
): EncounterResult {
  const monsterDefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def }));
  });
  const init = createCombat({ roller, character, monsters: monsterDefs });
  let s: CombatState = init.state;
  let ch: Character = init.character;
  const startRound = s.round;
  const charHpStart = ch.hp.current + ch.hp.temp;
  const monsterIds = init.state.combatants
    .filter((c) => c.kind === 'monster')
    .map((c) => c.id);

  let safety = 0;
  while (s.status === 'active' && safety < MAX_TURNS_PER_FIGHT * 8) {
    safety += 1;
    const cur = s.initiativeOrder[s.currentTurnIndex];
    if (cur === 'player') {
      if (ch.hp.current <= 0) break;
      const ctx = takeTurn({ roller, state: s, character: ch, metrics });
      s = ctx.state;
      ch = ctx.character;
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      const before = ch.hp.current + ch.hp.temp;
      const r = monsterAttack({ roller, character: ch, state: s }, cur);
      s = r.state;
      ch = r.character;
      const after = ch.hp.current + ch.hp.temp;
      if (after < before) metrics.damageTaken += before - after;
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }

  const died = s.status === 'player-defeat' || ch.hp.current <= 0;
  const rounds = Math.max(1, s.round - startRound + 1);
  let cause: string | null = null;
  if (died) {
    const stillUp = s.combatants.find(
      (c) => c.kind === 'monster' && c.instance.hp.current > 0 && monsterIds.includes(c.id),
    );
    cause =
      stillUp && stillUp.kind === 'monster'
        ? stillUp.instance.defId
        : (room.monsters ?? []).map((m) => m.defId).join('+');
  }
  // Reset per-encounter flags on win (next room).
  if (!died) {
    ch = {
      ...ch,
      nextAttackAdvantage: false,
      bonusAttackAvailable: false,
      poisonImmuneEncounter: false,
      incomingDamageReduction: 0,
    };
  }
  void charHpStart;
  return { character: ch, rounds, died, cause };
}

// ─────────────────────────────────────────────────────────────────────────
// Shrine AI — pick a defensively-priced blessing, same heuristic as rogueSim.
// ─────────────────────────────────────────────────────────────────────────

function scoreBlessing(id: string): number {
  try {
    const b = getBlessing(id);
    const m = b.modifiers ?? {};
    let s = 0;
    if (m.extraTempHpPerRoom) s += m.extraTempHpPerRoom * 10;
    if (m.acBonus) s += m.acBonus * 6;
    if (m.damageBonus) s += m.damageBonus * 4;
    if (m.holyDamageBonus) s += m.holyDamageBonus * 3;
    if (m.firstAttackDamage) s += m.firstAttackDamage * 2;
    if (m.firstAttackBonus) s += m.firstAttackBonus * 2;
    if (m.firstAttackAdvantage) s += 5;
    if (m.initiativeBonus) s += m.initiativeBonus * 1;
    if (m.critRangeBonus) s += m.critRangeBonus * 4;
    if (m.rerollMissesPerEncounter) s += m.rerollMissesPerEncounter * 3;
    return s;
  } catch {
    return -1;
  }
}

function pickShrineBlessing(character: Character, roller: DiceRoller): Character {
  const options = rollBlessingOptions(roller, 3);
  if (options.length === 0) return character;
  let best = options[0];
  let bestScore = scoreBlessing(best);
  for (const id of options.slice(1)) {
    const s = scoreBlessing(id);
    if (s > bestScore) { bestScore = s; best = id; }
  }
  if (character.blessings.includes(best)) return character;
  return { ...character, blessings: [...character.blessings, best] };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-life and per-run metrics
// ─────────────────────────────────────────────────────────────────────────

interface LifeMetrics {
  lifeIndex: number;
  startLevel: number;
  classId: SimClassId;
  chaptersCleared: number;
  encountersWon: number;
  encountersFought: number;
  combatRounds: number;
  damageDealt: number;
  damageTaken: number;
  hpHealedRest: number;
  hpHealedPotions: number;
  hpHealedSecondWind: number;
  goldAccumulated: number;
  potionsUsed: number;
  secondWindUses: number;
  actionSurgeUses: number;
  spellSlot1Used: number;
  spellSlot3Used: number;
  fireBoltCasts: number;
  died: boolean;
  deathChapter: number;
  deathRoomId: string | null;
  deathCause: string | null;
  finalLevel: number;
}

function newLifeMetrics(classId: SimClassId, lifeIndex: number, startLevel: number): LifeMetrics {
  return {
    lifeIndex,
    startLevel,
    classId,
    chaptersCleared: 0,
    encountersWon: 0,
    encountersFought: 0,
    combatRounds: 0,
    damageDealt: 0,
    damageTaken: 0,
    hpHealedRest: 0,
    hpHealedPotions: 0,
    hpHealedSecondWind: 0,
    goldAccumulated: 0,
    potionsUsed: 0,
    secondWindUses: 0,
    actionSurgeUses: 0,
    spellSlot1Used: 0,
    spellSlot3Used: 0,
    fireBoltCasts: 0,
    died: false,
    deathChapter: 0,
    deathRoomId: null,
    deathCause: null,
    finalLevel: startLevel,
  };
}

// Walk Ch1+Ch2 only (rooms 1..19; indices 0..18).
function chapterOfRoom(idx: number): number {
  return idx <= 9 ? 1 : 2;
}

function runOneLife(
  classId: SimClassId,
  startLevel: number,
  lifeIndex: number,
  seed: number,
): LifeMetrics {
  const m = newLifeMetrics(classId, lifeIndex, startLevel);
  const roller = createDiceRoller(seed);
  setActiveRoller(seed);
  const delve = createGodwakeDelve({ seed });
  let character = freshCharacter(classId, startLevel);

  for (let i = 0; i <= CHAPTER_LAST_ROOM_INDEX; i++) {
    const room = delve.rooms[i];
    const ch = chapterOfRoom(i);
    if (room.kind === 'combat' || room.kind === 'boss') {
      m.encountersFought += 1;
      const result = runEncounter(roller, character, room, m);
      character = result.character;
      m.combatRounds += result.rounds;
      if (result.died) {
        m.died = true;
        m.deathChapter = ch;
        m.deathRoomId = room.id;
        m.deathCause = result.cause;
        m.finalLevel = character.level;
        return m;
      }
      m.encountersWon += 1;
      const xp = room.xpReward ?? 0;
      if (xp > 0) character = { ...character, xp: character.xp + xp };
      const gold = room.goldReward ?? 0;
      if (gold > 0) {
        character = { ...character, goldInPocket: character.goldInPocket + gold };
        m.goldAccumulated += gold;
      }
      if (room.kind === 'boss') m.chaptersCleared = Math.max(m.chaptersCleared, ch);
    } else if (room.kind === 'rest') {
      const before = character.hp.current;
      const heal = Math.floor(character.hp.max * 0.7);
      character = shortRestHeal(character, heal);
      m.hpHealedRest += character.hp.current - before;
    } else if (room.kind === 'camp') {
      const before = character.hp.current;
      character = longRest(character);
      m.hpHealedRest += character.hp.current - before;
    } else if (room.kind === 'shrine') {
      character = pickShrineBlessing(character, roller);
    } else {
      // event: sim does not model player choice
    }
  }
  m.finalLevel = character.level;
  return m;
}

function runMatrixRun(classId: SimClassId, startLevel: number, runSeed: number): LifeMetrics[] {
  const lives: LifeMetrics[] = [];
  let seed = runSeed >>> 0;
  for (let l = 0; l < LIVES_PER_RUN; l++) {
    const life = runOneLife(classId, startLevel, l, seed);
    lives.push(life);
    if (!life.died) break;
    seed = (seed * 1664525 + 1013904223) >>> 0;
  }
  return lives;
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

interface CellSummary {
  classId: SimClassId;
  startLevel: number;
  runs: number;
  totalLives: number;
  lifeDeathRate: number; // % of lives that died
  runFullClearRate: number; // % of runs where at least one life cleared Ch2
  avgChaptersClearedPerLife: number;
  avgEncountersWonPerLife: number;
  avgRoundsPerCombat: number;
  avgDamageDealtPerLife: number;
  avgDamageTakenPerLife: number;
  avgHpHealedPerLife: number;
  avgGoldPerLife: number;
  avgSecondWindPerLife: number;
  avgSecondWindPerCombat: number;
  avgActionSurgePerLife: number;
  avgPotionsPerLife: number;
  avgSpell1PerLife: number;
  avgSpell3PerLife: number;
  avgFireBoltPerLife: number;
  deathByChapter: Record<number, number>;
  topDeathCauses: Array<{ cause: string; count: number }>;
  ch1DeathRate: number;
  ch2DeathRate: number;
  bossDeathRate: number;
}

function summarize(classId: SimClassId, startLevel: number, runs: LifeMetrics[][]): CellSummary {
  const lives = runs.flat();
  const n = lives.length;
  const sum = (sel: (l: LifeMetrics) => number) => lives.reduce((s, l) => s + sel(l), 0);
  const mean = (sel: (l: LifeMetrics) => number) => (n === 0 ? 0 : sum(sel) / n);
  const totalCombats = sum((l) => l.encountersFought);
  const totalRounds = sum((l) => l.combatRounds);
  const totalSW = sum((l) => l.secondWindUses);
  const deathByChapter: Record<number, number> = { 1: 0, 2: 0 };
  const causeCounts: Record<string, number> = {};
  let ch1Encounters = 0, ch1Deaths = 0, ch2Encounters = 0, ch2Deaths = 0;
  let bossEncounters = 0, bossDeaths = 0;
  for (const l of lives) {
    if (l.died) {
      deathByChapter[l.deathChapter] = (deathByChapter[l.deathChapter] ?? 0) + 1;
      if (l.deathCause) {
        causeCounts[l.deathCause] = (causeCounts[l.deathCause] ?? 0) + 1;
      }
    }
    // Approximate per-chapter encounter counts from how far the life got.
    // Ch1: rooms 1,4,6,8,10 = 5 combats. Ch2: rooms 12,15,17,19 = 4 combats.
    // We reconstruct by mapping encountersWon to chapter sequence.
    let won = l.encountersWon;
    const ch1Slots = 5;
    const ch1Wins = Math.min(won, ch1Slots);
    won -= ch1Wins;
    const ch2Wins = won;
    ch1Encounters += ch1Wins + (l.died && l.deathChapter === 1 ? 1 : 0);
    ch2Encounters += ch2Wins + (l.died && l.deathChapter === 2 ? 1 : 0);
    if (l.died && l.deathChapter === 1) ch1Deaths += 1;
    if (l.died && l.deathChapter === 2) ch2Deaths += 1;
    if (l.died && (l.deathRoomId === 'room-10' || l.deathRoomId === 'room-19')) {
      bossDeaths += 1;
    }
    // Boss encounters = chapters reached past the elite slot
    if (l.chaptersCleared >= 1 || l.deathRoomId === 'room-10') bossEncounters += 1;
    if (l.chaptersCleared >= 2 || l.deathRoomId === 'room-19') bossEncounters += 1;
  }
  const topCauses = Object.entries(causeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cause, count]) => ({ cause, count }));

  const fullClearRuns = runs.filter((r) => r.some((l) => l.chaptersCleared >= 2)).length;

  return {
    classId,
    startLevel,
    runs: runs.length,
    totalLives: n,
    lifeDeathRate: lives.filter((l) => l.died).length / n,
    runFullClearRate: fullClearRuns / runs.length,
    avgChaptersClearedPerLife: mean((l) => l.chaptersCleared),
    avgEncountersWonPerLife: mean((l) => l.encountersWon),
    avgRoundsPerCombat: totalCombats === 0 ? 0 : totalRounds / totalCombats,
    avgDamageDealtPerLife: mean((l) => l.damageDealt),
    avgDamageTakenPerLife: mean((l) => l.damageTaken),
    avgHpHealedPerLife: mean((l) => l.hpHealedRest + l.hpHealedPotions + l.hpHealedSecondWind),
    avgGoldPerLife: mean((l) => l.goldAccumulated),
    avgSecondWindPerLife: mean((l) => l.secondWindUses),
    avgSecondWindPerCombat: totalCombats === 0 ? 0 : totalSW / totalCombats,
    avgActionSurgePerLife: mean((l) => l.actionSurgeUses),
    avgPotionsPerLife: mean((l) => l.potionsUsed),
    avgSpell1PerLife: mean((l) => l.spellSlot1Used),
    avgSpell3PerLife: mean((l) => l.spellSlot3Used),
    avgFireBoltPerLife: mean((l) => l.fireBoltCasts),
    deathByChapter,
    topDeathCauses: topCauses,
    ch1DeathRate: ch1Encounters > 0 ? ch1Deaths / ch1Encounters : 0,
    ch2DeathRate: ch2Encounters > 0 ? ch2Deaths / ch2Encounters : 0,
    bossDeathRate: bossEncounters > 0 ? bossDeaths / bossEncounters : 0,
  };
}

function fmtPct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function fmtNum(n: number, d = 2): string { return n.toFixed(d); }

function renderMatrix(summaries: CellSummary[]): string {
  const lines: string[] = [];
  lines.push('# Class-tour early-game findings (Ch1 + Ch2)\n');
  lines.push('Generated by `scripts/sim-class-tour-early.ts`. Each cell is **');
  lines.push(`${RUNS_PER_CELL} runs × ${LIVES_PER_RUN} lives per run** = `);
  lines.push(`${RUNS_PER_CELL * LIVES_PER_RUN} max lives per cell. Numbers are per-life means unless noted.\n`);
  lines.push('Scope: rooms 1–19 only (Ilyich + Magistrate). Reincarnation = fresh char at the same start level after each death.\n');

  lines.push('## Per-life headline matrix\n');
  lines.push(
    '| Class | L | Lives | Death% | RunFullClear% | Ch1 death% | Ch2 death% | Boss death% | Chapters | Combats won | Rounds/combat | Dmg dealt | Dmg taken | HP healed | Gold |',
  );
  lines.push(
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  );
  for (const s of summaries) {
    lines.push(
      `| ${s.classId} | ${s.startLevel} | ${s.totalLives} | ${fmtPct(s.lifeDeathRate)} | ${fmtPct(s.runFullClearRate)} | ${fmtPct(s.ch1DeathRate)} | ${fmtPct(s.ch2DeathRate)} | ${fmtPct(s.bossDeathRate)} | ${fmtNum(s.avgChaptersClearedPerLife)} | ${fmtNum(s.avgEncountersWonPerLife, 1)} | ${fmtNum(s.avgRoundsPerCombat)} | ${fmtNum(s.avgDamageDealtPerLife, 0)} | ${fmtNum(s.avgDamageTakenPerLife, 0)} | ${fmtNum(s.avgHpHealedPerLife, 0)} | ${fmtNum(s.avgGoldPerLife, 0)} |`,
    );
  }
  lines.push('');

  lines.push('## Class-specific signals\n');
  lines.push('| Class | L | SW/life | SW/combat | AS/life | Potions/life | Spell L1/life | Spell L3/life | Fire Bolt/life |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const s of summaries) {
    lines.push(
      `| ${s.classId} | ${s.startLevel} | ${fmtNum(s.avgSecondWindPerLife)} | ${fmtNum(s.avgSecondWindPerCombat)} | ${fmtNum(s.avgActionSurgePerLife)} | ${fmtNum(s.avgPotionsPerLife)} | ${fmtNum(s.avgSpell1PerLife)} | ${fmtNum(s.avgSpell3PerLife)} | ${fmtNum(s.avgFireBoltPerLife)} |`,
    );
  }
  lines.push('');

  lines.push('## Death distribution\n');
  for (const s of summaries) {
    const top = s.topDeathCauses.map((c) => `${c.cause} (${c.count})`).join(', ');
    lines.push(
      `- **${s.classId} L${s.startLevel}** — Ch1: ${s.deathByChapter[1] ?? 0}, Ch2: ${s.deathByChapter[2] ?? 0}. Top causes: ${top || '—'}`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

interface CellInput { classId: SimClassId; startLevel: number; }

function runCell(input: CellInput, baseSeed: number): { summary: CellSummary; runs: LifeMetrics[][] } {
  const { classId, startLevel } = input;
  const runs: LifeMetrics[][] = [];
  for (let i = 0; i < RUNS_PER_CELL; i++) {
    const seed = (baseSeed ^ (startLevel * 1009) ^ (i * 7919) ^ classSeed(classId)) >>> 0;
    runs.push(runMatrixRun(classId, startLevel, seed));
  }
  return { summary: summarize(classId, startLevel, runs), runs };
}

function classSeed(c: SimClassId): number {
  if (c === 'rogue') return 0xa11ce;
  if (c === 'fighter') return 0xb0b1e;
  return 0xc1e0; // wizard
}

function main(): void {
  const classes: SimClassId[] = ['rogue', 'fighter', 'wizard'];
  const levels = [1, 3];
  const summaries: CellSummary[] = [];
  const baseSeed = 0x5eed5eed;
  for (const cls of classes) {
    for (const lvl of levels) {
      const t0 = Date.now();
      const { summary } = runCell({ classId: cls, startLevel: lvl }, baseSeed);
      const dt = Date.now() - t0;
      summaries.push(summary);
      console.log(
        `[done] ${cls} L${lvl} — ${summary.totalLives} lives, death ${fmtPct(summary.lifeDeathRate)}, fullClear ${fmtPct(summary.runFullClearRate)}, ${dt}ms`,
      );
    }
  }
  const out = renderMatrix(summaries);
  const path = resolve(process.cwd(), 'docs/playtest-findings/class-tour-early.matrix.md');
  writeFileSync(path, out, 'utf8');
  console.log(`\nWrote matrix → ${path}`);
}

main();
