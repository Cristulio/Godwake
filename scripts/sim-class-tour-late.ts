/**
 * Late-game multi-class tour. Drives Rogue / Fighter / Wizard through the
 * Chapter 3 (Spellhold) + Chapter 4 (Ust Natha) side-delves at L5 and L7.
 * Each "run" is a single soul with N lives — on death, character resets to
 * the start level (reincarnation loop) and tries the chain again, up to N
 * lives. The matrix is class × startLevel × variant × N runs/cell.
 *
 * Reuses chapter pools (chapter3Pools / chapter4Pools) so the encounter mix
 * matches what live players see. Skips event/shrine choices — the sim is a
 * "bare-soul" floor, not an "optimal pick" ceiling.
 *
 * Run:
 *   npx tsx scripts/sim-class-tour-late.ts
 *
 * Outputs both console summaries and a Markdown findings file at
 *   docs/playtest-findings/class-tour-late.md
 *
 * Counterpart to scripts/sim-class-tour-early.ts (Ch1+Ch2 tour).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import {
  buildPlayerCharacter,
  SIR_BRICK_PRESET,
} from '../src/engine/character/defaultCharacter';
import { applyLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
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
import { patchActionEconomy } from '../src/engine/combat/types';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomMonster } from '../src/types/delve';

import {
  WARMUP_POOL as CH3_WARMUP,
  MID_POOL as CH3_MID,
  ELITE_POOL as CH3_ELITE,
  type EncounterEntry,
} from '../src/engine/delve/chapter3Pools';
import {
  WARMUP_POOL as CH4_WARMUP,
  EARLY_MID_POOL as CH4_EM,
  MID_POOL as CH4_MID,
  ELITE_POOL as CH4_ELITE,
} from '../src/engine/delve/chapter4Pools';

type Pool = EncounterEntry[];
type ClassId = 'rogue' | 'fighter' | 'wizard';
type Variant = 'normal' | 'no-uncanny-dodge';

interface Room {
  kind: 'combat' | 'boss' | 'rest';
  label: string;
  pool?: Pool;
  monsterId?: string;
  bossLabel?: string;
}

interface Chapter {
  name: string;
  rooms: Room[];
}

// Late-game chain: 8 rooms/chapter = 16 rooms total. Mirrors the live
// chapter3Pools / chapter4Pools slot ordering with shrines skipped (sim
// doesn't model blessing choice).
const PLAN: Chapter[] = [
  {
    name: 'Spellhold (Ch3)',
    rooms: [
      { kind: 'combat', label: 'Ch3-warmup', pool: CH3_WARMUP },
      { kind: 'combat', label: 'Ch3-mid', pool: CH3_MID },
      { kind: 'rest', label: 'Ch3-rest' },
      { kind: 'combat', label: 'Ch3-elite-a', pool: CH3_ELITE },
      { kind: 'combat', label: 'Ch3-elite-b', pool: CH3_ELITE },
      { kind: 'boss', label: 'Ch3-boss', monsterId: 'asylum-director', bossLabel: 'Asylum Director' },
    ],
  },
  {
    name: 'Ust Natha (Ch4)',
    rooms: [
      { kind: 'combat', label: 'Ch4-warmup', pool: CH4_WARMUP },
      { kind: 'combat', label: 'Ch4-em', pool: CH4_EM },
      { kind: 'rest', label: 'Ch4-rest' },
      { kind: 'combat', label: 'Ch4-mid', pool: CH4_MID },
      { kind: 'combat', label: 'Ch4-elite', pool: CH4_ELITE },
      { kind: 'boss', label: 'Ch4-boss', monsterId: 'drow-matron-mother', bossLabel: 'Matron Mother' },
    ],
  },
];

const MAX_TURNS_PER_FIGHT = 200;
const LIVES_PER_RUN = 3;

// -------- character builders --------

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

// -------- AI helpers --------

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
    (c) => c.kind === 'monster' && BOSS_IDS.has(c.instance.defId),
  );
}

const BOSS_IDS = new Set(['asylum-director', 'drow-matron-mother']);

function findPotionIdx(c: Character): number {
  return c.inventory.findIndex((ref) => ref.itemId === 'potion-of-healing');
}

// -------- per-class player turn --------

interface TurnCtx {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
  stats: RunStats;
}

function rogueTurn(ctx: TurnCtx): { state: CombatState; character: Character } {
  let { state, character } = ctx;
  const { roller, stats } = ctx;

  // Potion at < 35% HP.
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

  // Cunning Action: Disengage if low HP, else Hide for advantage.
  if (
    !character.actionEconomy.bonusActionUsed &&
    (character.resources.cunningActionUsesRemaining ?? 0) > 0 &&
    livingMonsters(state).length > 0
  ) {
    const hpPct = character.hp.current / character.hp.max;
    const choice = hpPct < 0.3 ? 'disengage' : (!character.nextAttackAdvantage ? 'hide' : null);
    if (choice) {
      const r = useCunningAction({ character, state, choice });
      state = r.state;
      character = r.character;
      stats.cunningUses += 1;
    }
  }

  // Attack — lowest HP target.
  if (!character.actionEconomy.actionUsed) {
    const target = pickLowestHpTarget(state);
    const weaponId = character.equipped.mainHand?.itemId;
    if (target && weaponId) {
      const monsterHpBefore = target.instance.hp.current;
      const sneakBefore = state.sneakAttackUsedThisTurn === true;
      const r = playerAttack({ roller, character, state }, target.id, weaponId);
      state = r.state;
      character = r.character;
      if (state.lastAttack) {
        stats.attacks += 1;
        if (state.lastAttack.hit) stats.hits += 1;
      }
      if (!sneakBefore && state.sneakAttackUsedThisTurn === true) stats.sneakAttacks += 1;
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

  // Second Wind at <= 50% HP (cheap clutch heal).
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
      stats.secondWindUses += 1;
      stats.hpHealed += character.hp.current - before;
    }
  }

  // Potion at <= 30% HP after Second Wind couldn't bridge the gap.
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

  // Attack chain (extra attack at L5+).
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

  // Action Surge if it would close a meaningful gap.
  if (
    (character.resources.actionSurgeRemaining ?? 0) > 0 &&
    character.actionEconomy.actionUsed &&
    state.status === 'active' &&
    livingMonsters(state).length > 0
  ) {
    const surgeWanted = isBossEncounter(state)
      ? character.hp.current <= character.hp.max * 0.7 &&
        livingMonsters(state)[0].instance.hp.current > livingMonsters(state)[0].instance.hp.max * 0.25
      : livingMonsters(state).length >= 2 || totalLivingHp(state) >= character.hp.max * 0.6;
    if (surgeWanted) {
      const r = useActionSurge({ state, character });
      if (!r.character.actionEconomy.actionUsed) {
        stats.actionSurgeUses += 1;
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

  // Potion at <= 35% HP if Misty Step won't fire (or already used).
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

  // Bonus action: Misty Step out of danger at low HP if a slot2 is available.
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
      stats.slot2Used += 1;
      stats.mistyStepCasts += 1;
    }
  }

  if (!character.actionEconomy.actionUsed) {
    const livingNow = livingMonsters(state);
    const hpBeforeAll = totalLivingHp(state);
    let cast = false;

    // AoE: Fireball / Lightning Bolt when 2+ enemies and slot3 available.
    if (
      livingNow.length >= 2 &&
      slotsAt(character, 3) > 0 &&
      canCastSpell(character, 'fireball').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'fireball' });
      if (r.cast) {
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
        stats.spellDamage += dealt;
        state = r.state;
        character = r.character;
        stats.slot3Used += 1;
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
        stats.spellDamage += dealt;
        state = r.state;
        character = r.character;
        stats.slot3Used += 1;
        cast = true;
      }
    }

    // Burning Hands when 2+ enemies and slot1 spare.
    if (!cast && livingNow.length >= 2 && slotsAt(character, 1) > 0 && canCastSpell(character, 'burning-hands').ok) {
      const r = castSpell({ roller, character, state, spellId: 'burning-hands' });
      if (r.cast) {
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
        stats.spellDamage += dealt;
        state = r.state;
        character = r.character;
        stats.slot1Used += 1;
        cast = true;
      }
    }

    // Hold Person on chunky single targets (>25 HP) with slot2.
    if (!cast && livingNow.length === 1 && livingNow[0].instance.hp.current > 25 && slotsAt(character, 2) > 0 && canCastSpell(character, 'hold-person').ok) {
      const r = castSpell({ roller, character, state, spellId: 'hold-person', targetId: livingNow[0].id });
      if (r.cast) {
        state = r.state;
        character = r.character;
        stats.slot2Used += 1;
        cast = true;
      }
    }

    // Magic Missile on tough target with spare slot1.
    if (!cast && slotsAt(character, 1) > 0 && livingNow.some((m) => m.instance.hp.current > 8) && canCastSpell(character, 'magic-missile').ok) {
      const target = pickHighestHpTarget(state)!;
      const r = castSpell({ roller, character, state, spellId: 'magic-missile', targetId: target.id });
      if (r.cast) {
        const dealt = Math.max(0, hpBeforeAll - totalLivingHp(r.state));
        stats.damageDealt += dealt;
        stats.spellDamage += dealt;
        state = r.state;
        character = r.character;
        stats.slot1Used += 1;
        cast = true;
      }
    }

    // Fire Bolt cantrip fallback.
    if (!cast) {
      const target = pickLowestHpTarget(state)!;
      const monsterHpBefore = target.instance.hp.current;
      const r = castSpell({ roller, character, state, spellId: 'fire-bolt', targetId: target.id });
      if (r.cast) {
        const after = r.state.combatants.find((c) => c.id === target.id);
        const dealt = after && after.kind === 'monster' ? Math.max(0, monsterHpBefore - after.instance.hp.current) : 0;
        stats.damageDealt += dealt;
        stats.cantripDamage += dealt;
        if (dealt > 0) stats.fireBoltHits += 1;
        else stats.fireBoltMisses += 1;
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

// -------- combat driver --------

interface RunStats {
  classId: ClassId;
  startLevel: number;
  variant: Variant;
  lifeIndex: number;
  chaptersClearedTotal: number;
  roomsClearedTotal: number;
  encountersFoughtTotal: number;
  encountersWonTotal: number;
  combatRoundsTotal: number;
  damageDealt: number;
  damageTaken: number;
  hpHealed: number;
  goldAccumulated: number;
  attacks: number;
  hits: number;
  crits: number;
  sneakAttacks: number;
  cunningUses: number;
  secondWindUses: number;
  actionSurgeUses: number;
  cantripDamage: number;
  spellDamage: number;
  slot1Used: number;
  slot2Used: number;
  slot3Used: number;
  mistyStepCasts: number;
  fireBoltHits: number;
  fireBoltMisses: number;
  potionsUsed: number;
  // Resource exhaustion flags — set during any encounter.
  ranOutOfSpellsInChapter: boolean;
  exhaustedCunningAtBoss: boolean;
  exhaustedSecondWindAtBoss: boolean;
  // Lives / deaths
  deaths: number;
  deathsByBoss: Record<string, number>;
  deathsByRoom: Record<string, number>;
  lifeOutcomes: Array<{
    life: number;
    cleared: boolean;
    lastRoom: string;
    lastBoss?: string;
    chaptersBeforeDeath: number;
  }>;
}

function emptyStats(classId: ClassId, startLevel: number, variant: Variant): RunStats {
  return {
    classId,
    startLevel,
    variant,
    lifeIndex: 0,
    chaptersClearedTotal: 0,
    roomsClearedTotal: 0,
    encountersFoughtTotal: 0,
    encountersWonTotal: 0,
    combatRoundsTotal: 0,
    damageDealt: 0,
    damageTaken: 0,
    hpHealed: 0,
    goldAccumulated: 0,
    attacks: 0,
    hits: 0,
    crits: 0,
    sneakAttacks: 0,
    cunningUses: 0,
    secondWindUses: 0,
    actionSurgeUses: 0,
    cantripDamage: 0,
    spellDamage: 0,
    slot1Used: 0,
    slot2Used: 0,
    slot3Used: 0,
    mistyStepCasts: 0,
    fireBoltHits: 0,
    fireBoltMisses: 0,
    potionsUsed: 0,
    ranOutOfSpellsInChapter: false,
    exhaustedCunningAtBoss: false,
    exhaustedSecondWindAtBoss: false,
    deaths: 0,
    deathsByBoss: {},
    deathsByRoom: {},
    lifeOutcomes: [],
  };
}

function pickEntry(roller: DiceRoller, pool: Pool): EncounterEntry {
  const idx = Math.floor(roller.roll('1d100').total % pool.length);
  return pool[idx];
}

function expandMonsters(monsters: RoomMonster[]): { def: ReturnType<typeof getMonster>; displayName?: string }[] {
  const out: { def: ReturnType<typeof getMonster>; displayName?: string }[] = [];
  for (const m of monsters) {
    for (let i = 0; i < m.count; i++) {
      out.push({
        def: getMonster(m.defId),
        displayName: m.displayPrefix ? `${m.displayPrefix} ${i + 1}` : undefined,
      });
    }
  }
  return out;
}

function runCombat(
  roller: DiceRoller,
  classId: ClassId,
  characterIn: Character,
  monsterRefs: { def: ReturnType<typeof getMonster>; displayName?: string }[],
  variant: Variant,
  stats: RunStats,
  roomLabel: string,
  isBossRoom: boolean,
): { character: Character; victory: boolean; defIds: string[] } {
  _resetMonsterInstanceCounter();
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
      // Uncanny-Dodge control variant: pre-set reactionUsed so the engine skips
      // the L5 rogue's damage-halving reaction. Lets us isolate Uncanny Dodge's
      // contribution to rogue survival vs the rest of the kit.
      if (variant === 'no-uncanny-dodge' && classId === 'rogue' && character.level >= 5) {
        character = patchActionEconomy(character, { reactionUsed: true });
      }
      const hpBefore = character.hp.current;
      const r = monsterAttack({ roller, character, state }, state.initiativeOrder[state.currentTurnIndex]);
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

  stats.combatRoundsTotal += Math.max(1, state.round - startRound + 1);
  stats.encountersFoughtTotal += 1;
  const victory = state.status === 'player-victory';
  if (victory) {
    stats.encountersWonTotal += 1;
    // gold
    stats.goldAccumulated += rollRoomGoldDrops(roller, defIds);
  }

  // Boss-room resource exhaustion flags (captured at end of combat).
  if (isBossRoom) {
    if (classId === 'rogue' && (character.resources.cunningActionUsesRemaining ?? 0) === 0) {
      stats.exhaustedCunningAtBoss = true;
    }
    if (classId === 'fighter' && !character.resources.secondWindAvailable) {
      stats.exhaustedSecondWindAtBoss = true;
    }
  }

  return { character, victory, defIds };
}

function liveOneAttempt(
  roller: DiceRoller,
  classId: ClassId,
  startLevel: number,
  variant: Variant,
  stats: RunStats,
): { cleared: boolean; lastRoom: string; lastBoss?: string; chapters: number } {
  let character = freshCharacter(classId, startLevel);
  let chaptersThisLife = 0;
  let lastRoom = 'start';
  let lastBoss: string | undefined;

  for (let chIdx = 0; chIdx < PLAN.length; chIdx++) {
    const ch = PLAN[chIdx];
    let chapterCleared = true;
    for (const room of ch.rooms) {
      lastRoom = room.label;
      if (room.kind === 'rest') {
        const before = character.hp.current;
        character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
        stats.hpHealed += character.hp.current - before;
        continue;
      }
      let roomXp = 0;
      let monsters: { def: ReturnType<typeof getMonster>; displayName?: string }[];
      if (room.kind === 'boss') {
        monsters = [{ def: getMonster(room.monsterId!) }];
        roomXp = chIdx === 0 ? 1100 : 1800;
      } else {
        const entry = pickEntry(roller, room.pool!);
        monsters = expandMonsters(entry.monsters);
        roomXp = entry.xpReward;
      }

      if (room.kind === 'boss') lastBoss = room.bossLabel;

      const result = runCombat(
        roller,
        classId,
        character,
        monsters,
        variant,
        stats,
        room.label,
        room.kind === 'boss',
      );
      character = result.character;
      stats.roomsClearedTotal += 1;

      if (!result.victory) {
        // Death cause attribution
        if (room.kind === 'boss' && room.bossLabel) {
          stats.deathsByBoss[room.bossLabel] = (stats.deathsByBoss[room.bossLabel] ?? 0) + 1;
        }
        stats.deathsByRoom[room.label] = (stats.deathsByRoom[room.label] ?? 0) + 1;
        stats.deaths += 1;
        chapterCleared = false;
        return { cleared: false, lastRoom: room.label, lastBoss, chapters: chaptersThisLife };
      }

      // XP gain (matches live game — pool entries carry xpReward, bosses get a fixed bonus).
      if (roomXp > 0) {
        character = { ...character, xp: character.xp + roomXp };
        while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
          character = applyLevelUp(character);
        }
      }

      // Per-class resource-exhaustion mid-chapter signal
      if (classId === 'wizard') {
        const noSlots = slotsAt(character, 1) === 0 && slotsAt(character, 2) === 0 && slotsAt(character, 3) === 0;
        if (noSlots) stats.ranOutOfSpellsInChapter = true;
      }
    }
    if (chapterCleared) {
      chaptersThisLife += 1;
      stats.chaptersClearedTotal += 1;
      // Long rest between chapters (camp).
      character = longRest(character);
    }
  }
  return { cleared: true, lastRoom, lastBoss, chapters: chaptersThisLife };
}

export function runMatrixCell(
  classId: ClassId,
  startLevel: number,
  variant: Variant,
  runsPerCell: number,
  seedBase: number,
): RunStats[] {
  const cell: RunStats[] = [];
  for (let runIdx = 0; runIdx < runsPerCell; runIdx++) {
    const stats = emptyStats(classId, startLevel, variant);
    for (let life = 0; life < LIVES_PER_RUN; life++) {
      const seed = ((seedBase + runIdx * 101 + life * 7919) ^ (startLevel * 1009)) >>> 0;
      const roller = createDiceRoller(seed);
      stats.lifeIndex = life;
      const outcome = liveOneAttempt(roller, classId, startLevel, variant, stats);
      stats.lifeOutcomes.push({
        life,
        cleared: outcome.cleared,
        lastRoom: outcome.lastRoom,
        lastBoss: outcome.lastBoss,
        chaptersBeforeDeath: outcome.chapters,
      });
      if (outcome.cleared) break;
    }
    cell.push(stats);
  }
  return cell;
}

// -------- aggregation --------

interface Aggregate {
  classId: ClassId;
  startLevel: number;
  variant: Variant;
  runs: number;
  livesPerRun: number;
  meanLivesUsed: number;
  runWinRate: number;
  encounterWinRate: number;
  meanTtkRounds: number;
  meanChaptersClearedPerLife: number;
  meanDmgDealtPerRun: number;
  meanDmgTakenPerRun: number;
  meanHpHealedPerRun: number;
  meanGoldPerRun: number;
  hitRate: number;
  critRate: number;
  ranOutOfSpellsRate: number;
  exhaustedCunningAtBossRate: number;
  exhaustedSecondWindAtBossRate: number;
  meanSneakAttacksPerLife: number;
  meanCunningPerLife: number;
  meanSecondWindPerLife: number;
  meanActionSurgePerLife: number;
  meanSlot1: number;
  meanSlot2: number;
  meanSlot3: number;
  cantripShareOfDamage: number;
  meanMistyStep: number;
  fireBoltHitRate: number;
  meanPotionsPerRun: number;
  deathsByBoss: Record<string, number>;
  deathsByRoom: Record<string, number>;
}

function aggregate(cell: RunStats[]): Aggregate {
  const n = cell.length;
  const sum = (sel: (s: RunStats) => number) => cell.reduce((a, s) => a + sel(s), 0);
  const mean = (sel: (s: RunStats) => number) => (n === 0 ? 0 : sum(sel) / n);
  const livesUsed = cell.map((s) => s.lifeOutcomes.length);
  const cleared = cell.filter((s) => s.lifeOutcomes.some((l) => l.cleared)).length;
  const totalLives = sum((s) => s.lifeOutcomes.length);
  const totalEnc = sum((s) => s.encountersFoughtTotal);
  const totalWon = sum((s) => s.encountersWonTotal);
  const totalRounds = sum((s) => s.combatRoundsTotal);
  const totalAttacks = sum((s) => s.attacks);
  const totalHits = sum((s) => s.hits);
  const totalCrits = sum((s) => s.crits);
  const totalCantrip = sum((s) => s.cantripDamage);
  const totalSpell = sum((s) => s.spellDamage);
  const totalFbHits = sum((s) => s.fireBoltHits);
  const totalFbMiss = sum((s) => s.fireBoltMisses);
  const deathsByBoss: Record<string, number> = {};
  const deathsByRoom: Record<string, number> = {};
  for (const s of cell) {
    for (const [k, v] of Object.entries(s.deathsByBoss)) deathsByBoss[k] = (deathsByBoss[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.deathsByRoom)) deathsByRoom[k] = (deathsByRoom[k] ?? 0) + v;
  }
  return {
    classId: cell[0].classId,
    startLevel: cell[0].startLevel,
    variant: cell[0].variant,
    runs: n,
    livesPerRun: LIVES_PER_RUN,
    meanLivesUsed: livesUsed.reduce((a, b) => a + b, 0) / Math.max(1, n),
    runWinRate: cleared / Math.max(1, n),
    encounterWinRate: totalEnc === 0 ? 0 : totalWon / totalEnc,
    meanTtkRounds: totalEnc === 0 ? 0 : totalRounds / totalEnc,
    meanChaptersClearedPerLife:
      totalLives === 0 ? 0 : sum((s) => s.chaptersClearedTotal) / totalLives,
    meanDmgDealtPerRun: mean((s) => s.damageDealt),
    meanDmgTakenPerRun: mean((s) => s.damageTaken),
    meanHpHealedPerRun: mean((s) => s.hpHealed),
    meanGoldPerRun: mean((s) => s.goldAccumulated),
    hitRate: totalAttacks === 0 ? 0 : totalHits / totalAttacks,
    critRate: totalAttacks === 0 ? 0 : totalCrits / totalAttacks,
    ranOutOfSpellsRate: cell.filter((s) => s.ranOutOfSpellsInChapter).length / Math.max(1, n),
    exhaustedCunningAtBossRate:
      cell.filter((s) => s.exhaustedCunningAtBoss).length / Math.max(1, n),
    exhaustedSecondWindAtBossRate:
      cell.filter((s) => s.exhaustedSecondWindAtBoss).length / Math.max(1, n),
    meanSneakAttacksPerLife: totalLives === 0 ? 0 : sum((s) => s.sneakAttacks) / totalLives,
    meanCunningPerLife: totalLives === 0 ? 0 : sum((s) => s.cunningUses) / totalLives,
    meanSecondWindPerLife: totalLives === 0 ? 0 : sum((s) => s.secondWindUses) / totalLives,
    meanActionSurgePerLife: totalLives === 0 ? 0 : sum((s) => s.actionSurgeUses) / totalLives,
    meanSlot1: mean((s) => s.slot1Used),
    meanSlot2: mean((s) => s.slot2Used),
    meanSlot3: mean((s) => s.slot3Used),
    cantripShareOfDamage:
      totalCantrip + totalSpell > 0 ? totalCantrip / (totalCantrip + totalSpell) : 0,
    meanMistyStep: mean((s) => s.mistyStepCasts),
    fireBoltHitRate: totalFbHits + totalFbMiss > 0 ? totalFbHits / (totalFbHits + totalFbMiss) : 0,
    meanPotionsPerRun: mean((s) => s.potionsUsed),
    deathsByBoss,
    deathsByRoom,
  };
}

// -------- rendering --------

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function num(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function renderMatrix(aggs: Aggregate[]): string {
  // Group by variant; emit one table per variant.
  const variants = Array.from(new Set(aggs.map((a) => a.variant)));
  const lines: string[] = [];
  for (const v of variants) {
    const rows = aggs.filter((a) => a.variant === v);
    lines.push(`### Variant: \`${v}\``);
    lines.push('');
    lines.push(
      '| Class | L | Runs | Run-win | Enc-win | Lives used | TTK rds | Hit % | Crit % | Dmg dealt | Dmg taken | HP healed | Gold |',
    );
    lines.push(
      '|------|--:|----:|-------:|-------:|----------:|------:|------:|------:|---------:|---------:|---------:|----:|',
    );
    for (const a of rows) {
      lines.push(
        `| ${a.classId} | ${a.startLevel} | ${a.runs} | ${pct(a.runWinRate)} | ${pct(a.encounterWinRate)} | ${num(a.meanLivesUsed)} / ${a.livesPerRun} | ${num(a.meanTtkRounds)} | ${pct(a.hitRate)} | ${pct(a.critRate)} | ${num(a.meanDmgDealtPerRun, 0)} | ${num(a.meanDmgTakenPerRun, 0)} | ${num(a.meanHpHealedPerRun, 0)} | ${num(a.meanGoldPerRun, 0)} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderResourceExhaustion(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | L | Variant | Out-of-spells (chapter) | Cunning empty at boss | Second Wind spent at boss |');
  lines.push('|------|--:|--------|-----------------------:|---------------------:|-------------------------:|');
  for (const a of aggs) {
    const oos = a.classId === 'wizard' ? pct(a.ranOutOfSpellsRate) : '—';
    const cun = a.classId === 'rogue' ? pct(a.exhaustedCunningAtBossRate) : '—';
    const sw = a.classId === 'fighter' ? pct(a.exhaustedSecondWindAtBossRate) : '—';
    lines.push(`| ${a.classId} | ${a.startLevel} | ${a.variant} | ${oos} | ${cun} | ${sw} |`);
  }
  return lines.join('\n');
}

function renderDeathsByBoss(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | L | Variant | Asylum Director | Matron Mother | Other (mid/elite/warmup) |');
  lines.push('|------|--:|--------|---------------:|--------------:|------------------------:|');
  for (const a of aggs) {
    const ad = a.deathsByBoss['Asylum Director'] ?? 0;
    const mm = a.deathsByBoss['Matron Mother'] ?? 0;
    const totalDeaths = Object.values(a.deathsByRoom).reduce((s, n) => s + n, 0);
    const other = totalDeaths - ad - mm;
    lines.push(`| ${a.classId} | ${a.startLevel} | ${a.variant} | ${ad} | ${mm} | ${other} |`);
  }
  return lines.join('\n');
}

function renderDeathRoomBreakdown(aggs: Aggregate[]): string {
  const lines: string[] = [];
  for (const a of aggs) {
    const top = Object.entries(a.deathsByRoom)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}(${v})`)
      .join(', ');
    lines.push(`- **${a.classId} L${a.startLevel} ${a.variant}**: ${top || '—'}`);
  }
  return lines.join('\n');
}

function renderClassDetails(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | L | Variant | Sneak/life | Cunning/life | SW/life | AS/life | Slot1/run | Slot2/run | Slot3/run | Cantrip-share | Misty/run | FireBolt hit% | Potions/run |');
  lines.push('|------|--:|--------|----------:|------------:|--------:|--------:|---------:|---------:|---------:|--------------:|---------:|-------------:|-----------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${a.startLevel} | ${a.variant} | ${num(a.meanSneakAttacksPerLife)} | ${num(a.meanCunningPerLife)} | ${num(a.meanSecondWindPerLife)} | ${num(a.meanActionSurgePerLife)} | ${num(a.meanSlot1)} | ${num(a.meanSlot2)} | ${num(a.meanSlot3)} | ${pct(a.cantripShareOfDamage)} | ${num(a.meanMistyStep)} | ${pct(a.fireBoltHitRate)} | ${num(a.meanPotionsPerRun)} |`,
    );
  }
  return lines.join('\n');
}

// -------- main --------

interface MatrixCellSpec {
  classId: ClassId;
  startLevel: number;
  variant: Variant;
}

const MATRIX: MatrixCellSpec[] = [
  // Three classes × two levels × normal variant
  { classId: 'rogue', startLevel: 5, variant: 'normal' },
  { classId: 'rogue', startLevel: 7, variant: 'normal' },
  { classId: 'fighter', startLevel: 5, variant: 'normal' },
  { classId: 'fighter', startLevel: 7, variant: 'normal' },
  { classId: 'wizard', startLevel: 5, variant: 'normal' },
  { classId: 'wizard', startLevel: 7, variant: 'normal' },
  // Rogue Uncanny-Dodge control: same cells with the dodge reaction suppressed.
  { classId: 'rogue', startLevel: 5, variant: 'no-uncanny-dodge' },
  { classId: 'rogue', startLevel: 7, variant: 'no-uncanny-dodge' },
];

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 50);
const SEED_BASE = 0x1a7e0f00 >>> 0;

function main(): void {
  console.log(`Late-game class tour — ${RUNS_PER_CELL} runs/cell × ${LIVES_PER_RUN} lives/run\n`);
  const aggs: Aggregate[] = [];
  for (const spec of MATRIX) {
    const t0 = Date.now();
    const cell = runMatrixCell(spec.classId, spec.startLevel, spec.variant, RUNS_PER_CELL, SEED_BASE);
    const agg = aggregate(cell);
    aggs.push(agg);
    const dt = Date.now() - t0;
    console.log(
      `${spec.classId.padEnd(7)} L${spec.startLevel} ${spec.variant.padEnd(18)} → run-win ${pct(agg.runWinRate).padStart(4)}  enc-win ${pct(agg.encounterWinRate)}  lives ${num(agg.meanLivesUsed)}/${LIVES_PER_RUN}  TTK ${num(agg.meanTtkRounds)} rds  (${dt}ms)`,
    );
  }

  const doc = renderRawMatrixDoc(aggs);
  const outPath = resolve(process.cwd(), 'docs/playtest-findings/class-tour-late-matrix.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw matrix → ${outPath}`);
  console.log('(Curated analysis lives in class-tour-late.md — edit by hand.)');
}

function renderRawMatrixDoc(aggs: Aggregate[]): string {
  return `# Late-game class tour — raw matrix

> Auto-generated by \`scripts/sim-class-tour-late.ts\`. Do not edit by hand —
> the curated analysis with diagnosis lives in
> [\`class-tour-late.md\`](./class-tour-late.md). Re-run with
> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-class-tour-late.ts\`.

**Date:** 2026-05-27
**Setup:** Three classes (Rogue / Fighter / Wizard) walked through the Spellhold
(Ch3) → Ust Natha (Ch4) chain at L5 and L7. Each "run" is a single soul with
${LIVES_PER_RUN} lives — on death the character resets to the start level and
tries again. ${RUNS_PER_CELL} runs/cell. Shrines / events skipped (bare-soul
floor). Rest rooms heal 70 %; camp between chapters = long rest. Player AI
mirrors each class's existing sim policy.

## Matrix

${renderMatrix(aggs)}

## Resource exhaustion at the boss

How often did each class arrive at the chapter boss with its signature lever empty?

${renderResourceExhaustion(aggs)}

## Per-boss death clustering

${renderDeathsByBoss(aggs)}

### Full death breakdown by room

${renderDeathRoomBreakdown(aggs)}

## Per-class detail (per life / per run)

${renderClassDetails(aggs)}
`;
}

main();
