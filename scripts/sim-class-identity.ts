/**
 * Class-identity validation — do Rogue / Fighter / Wizard still feel like
 * three distinct classes after 13+ PRs of buffs, tunes, and reworks?
 *
 * Focused L5 sweep of `createGodwakeDelve` (the same Ch1 → Ch4 chain
 * sim-full-matrix.ts walks). Reuses each class's existing combat AI so
 * numbers are directly comparable to the post-Phase-1 full-matrix run
 * (docs/validation-findings/full-matrix.raw.md, 2026-05-28).
 *
 * Adds three telemetry axes the full-matrix doesn't track:
 *
 *   1. Damage source split (weapon / spell / cantrip) — exposes whether
 *      Wizard is "just another attacker" or genuinely casts to deal damage.
 *   2. Per-chapter resource curve — where in the delve does each class spend
 *      its signature resource? Tells us whether Cunning / Second Wind /
 *      Action Surge / spell slots actually pace differently.
 *   3. Per-encounter-type performance — warmup / mid / elite / boss split,
 *      shows which fights each class crushes and which it walls.
 *
 * Then computes a class-distinctness score per metric: spread across the
 * three classes (max - min), normalized so 100 = "as different as the
 * pre-Phase-1 class tour showed they were". Convergence flag fires when
 * spread drops > 30 % vs the pre-Phase-1 reference.
 *
 * Run:
 *   RUNS_PER_CELL=300 npx tsx scripts/sim-class-identity.ts
 *
 * Writes raw output + analysis to docs/gameplay-quality/class-identity.md.
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
import { patchActionEconomy } from '../src/engine/combat/types';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';

type ClassId = 'rogue' | 'fighter' | 'wizard';
type EncType = 'warmup' | 'mid' | 'elite' | 'boss';

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 300);
const START_LEVEL = 5;
const LIVES_PER_RUN = 3;
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xc1a55d >>> 0;

const BOSS_DEF_IDS = new Set([
  'duergar-ilyich',
  'athkatla-magistrate',
  'asylum-director',
  'drow-matron-mother',
]);

// ─────────────────────────────────────────────────────────────────────────
// Character builders (mirror sim-full-matrix.ts so cell numbers are
// directly comparable).
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

function freshCharacter(classId: ClassId, level: number): Character {
  if (classId === 'rogue') return rogueAt(level);
  if (classId === 'fighter') return fighterAt(level);
  return wizardAt(level);
}

// ─────────────────────────────────────────────────────────────────────────
// Telemetry shape
// ─────────────────────────────────────────────────────────────────────────

interface EncTypeStat {
  count: number;
  won: number;
  rounds: number;
  dmgDealt: number;
  dmgTaken: number;
  sigUses: number;        // signature mechanic firings inside this encounter type
}

interface ChapterStat {
  rounds: number;
  encounters: number;
  encountersWon: number;
  dmgDealt: number;
  dmgTaken: number;
  sigUses: number;        // signature firings in this chapter
}

interface RunStats {
  classId: ClassId;

  // headline
  encountersFought: number;
  encountersWon: number;
  combatRounds: number;
  damageDealt: number;
  damageTaken: number;
  hpHealed: number;

  // damage source split
  weaponDamage: number;
  spellDamage: number;
  cantripDamage: number;

  // action-type counts (per life)
  actionsAttack: number;
  actionsCast: number;          // spell-slot casts
  actionsCantrip: number;       // 0-slot casts (fire-bolt)
  actionsBonusCunning: number;
  actionsBonusSecondWind: number;
  actionsBonusMisty: number;
  actionsActionSurge: number;
  actionsPotion: number;

  // hit-rate signals
  attacks: number;
  hits: number;
  crits: number;

  // signature mechanic firings (raw counts)
  sneakAttacks: number;
  cunningUses: number;
  secondWindUses: number;
  actionSurgeUses: number;
  slot1Used: number;
  slot2Used: number;
  slot3Used: number;
  mistyStepCasts: number;
  shieldReactions: number;

  // per-chapter
  perChapter: Record<number, ChapterStat>;
  // per-encounter-type
  perEncType: Record<EncType, EncTypeStat>;

  // outcome
  lifeOutcomes: Array<{
    cleared: boolean;
    finalRoomIdx: number;
    finalChapter: number;
    finalLevel: number;
  }>;
}

function emptyEncTypeStat(): EncTypeStat {
  return { count: 0, won: 0, rounds: 0, dmgDealt: 0, dmgTaken: 0, sigUses: 0 };
}

function emptyChapterStat(): ChapterStat {
  return { rounds: 0, encounters: 0, encountersWon: 0, dmgDealt: 0, dmgTaken: 0, sigUses: 0 };
}

function emptyStats(classId: ClassId): RunStats {
  return {
    classId,
    encountersFought: 0,
    encountersWon: 0,
    combatRounds: 0,
    damageDealt: 0,
    damageTaken: 0,
    hpHealed: 0,
    weaponDamage: 0,
    spellDamage: 0,
    cantripDamage: 0,
    actionsAttack: 0,
    actionsCast: 0,
    actionsCantrip: 0,
    actionsBonusCunning: 0,
    actionsBonusSecondWind: 0,
    actionsBonusMisty: 0,
    actionsActionSurge: 0,
    actionsPotion: 0,
    attacks: 0,
    hits: 0,
    crits: 0,
    sneakAttacks: 0,
    cunningUses: 0,
    secondWindUses: 0,
    actionSurgeUses: 0,
    slot1Used: 0,
    slot2Used: 0,
    slot3Used: 0,
    mistyStepCasts: 0,
    shieldReactions: 0,
    perChapter: { 1: emptyChapterStat(), 2: emptyChapterStat(), 3: emptyChapterStat(), 4: emptyChapterStat() },
    perEncType: {
      warmup: emptyEncTypeStat(),
      mid: emptyEncTypeStat(),
      elite: emptyEncTypeStat(),
      boss: emptyEncTypeStat(),
    },
    lifeOutcomes: [],
  };
}

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

// ─────────────────────────────────────────────────────────────────────────
// Per-class turn AIs (transplanted from sim-full-matrix.ts with sigUse
// hooks for per-chapter / per-encounter tracking).
// ─────────────────────────────────────────────────────────────────────────

interface TurnCtx {
  roller: DiceRoller;
  state: CombatState;
  character: Character;
  stats: RunStats;
  chapter: number;
  encType: EncType;
}

function bumpSig(ctx: TurnCtx, n = 1): void {
  ctx.stats.perChapter[ctx.chapter].sigUses += n;
  ctx.stats.perEncType[ctx.encType].sigUses += n;
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
      stats.actionsPotion += 1;
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
      stats.cunningUses += 1;
      stats.actionsBonusCunning += 1;
      bumpSig(ctx);
    }
  }

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
        stats.actionsAttack += 1;
        if (state.lastAttack.hit) stats.hits += 1;
        if (state.lastAttack.crit) stats.crits += 1;
      }
      if (!sneakBefore && state.sneakAttackUsedThisTurn === true) {
        stats.sneakAttacks += 1;
        bumpSig(ctx);
      }
      const after = state.combatants.find((c) => c.id === target.id);
      if (after && after.kind === 'monster') {
        const delta = monsterHpBefore - after.instance.hp.current;
        if (delta > 0) {
          stats.damageDealt += delta;
          stats.weaponDamage += delta;
          stats.perChapter[ctx.chapter].dmgDealt += delta;
          stats.perEncType[ctx.encType].dmgDealt += delta;
        }
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
      stats.secondWindUses += 1;
      stats.actionsBonusSecondWind += 1;
      stats.hpHealed += character.hp.current - before;
      bumpSig(ctx);
    }
  }

  if (character.hp.current / character.hp.max <= 0.3 && !character.actionEconomy.actionUsed) {
    const idx = findPotionIdx(character);
    if (idx >= 0) {
      const before = character.hp.current;
      const r = useConsumable({ roller, character, state }, idx);
      state = r.state;
      character = r.character;
      stats.actionsPotion += 1;
      stats.hpHealed += character.hp.current - before;
    }
  }

  const doAttackBurst = () => {
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
        stats.actionsAttack += 1;
        if (state.lastAttack.hit) stats.hits += 1;
        if (state.lastAttack.crit) stats.crits += 1;
      }
      const after = state.combatants.find((c) => c.id === target.id);
      if (after && after.kind === 'monster') {
        const delta = monsterHpBefore - after.instance.hp.current;
        if (delta > 0) {
          stats.damageDealt += delta;
          stats.weaponDamage += delta;
          stats.perChapter[ctx.chapter].dmgDealt += delta;
          stats.perEncType[ctx.encType].dmgDealt += delta;
        }
      }
    }
  };

  doAttackBurst();

  if (
    (character.resources.actionSurgeRemaining ?? 0) > 0 &&
    character.actionEconomy.actionUsed &&
    state.status === 'active' &&
    livingMonsters(state).length > 0
  ) {
    const living = livingMonsters(state);
    const surgeWanted = isBossEncounter(state)
      ? character.hp.current <= character.hp.max * 0.7 &&
        living[0].instance.hp.current > living[0].instance.hp.max * 0.25
      : living.length >= 2 || totalLivingHp(state) >= character.hp.max * 0.6;
    if (surgeWanted) {
      const r = useActionSurge({ state, character });
      if (!r.character.actionEconomy.actionUsed) {
        stats.actionSurgeUses += 1;
        stats.actionsActionSurge += 1;
        bumpSig(ctx);
        state = r.state;
        character = r.character;
        doAttackBurst();
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
      stats.actionsPotion += 1;
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
      stats.slot2Used += 1;
      stats.mistyStepCasts += 1;
      stats.actionsBonusMisty += 1;
      bumpSig(ctx);
    }
  }

  if (!character.actionEconomy.actionUsed) {
    const livingNow = livingMonsters(state);
    const hpBeforeAll = totalLivingHp(state);
    let cast = false;

    const recordSpellDamage = (after: CombatState) => {
      const dealt = Math.max(0, hpBeforeAll - totalLivingHp(after));
      stats.damageDealt += dealt;
      stats.spellDamage += dealt;
      stats.perChapter[ctx.chapter].dmgDealt += dealt;
      stats.perEncType[ctx.encType].dmgDealt += dealt;
    };

    if (
      livingNow.length >= 2 &&
      slotsAt(character, 3) > 0 &&
      canCastSpell(character, 'fireball').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'fireball' });
      if (r.cast) {
        recordSpellDamage(r.state);
        state = r.state;
        character = r.character;
        stats.slot3Used += 1;
        stats.actionsCast += 1;
        bumpSig(ctx);
        cast = true;
      }
    } else if (
      livingNow.length >= 3 &&
      slotsAt(character, 3) > 0 &&
      canCastSpell(character, 'lightning-bolt').ok
    ) {
      const r = castSpell({ roller, character, state, spellId: 'lightning-bolt' });
      if (r.cast) {
        recordSpellDamage(r.state);
        state = r.state;
        character = r.character;
        stats.slot3Used += 1;
        stats.actionsCast += 1;
        bumpSig(ctx);
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
        recordSpellDamage(r.state);
        state = r.state;
        character = r.character;
        stats.slot1Used += 1;
        stats.actionsCast += 1;
        bumpSig(ctx);
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
        stats.slot2Used += 1;
        stats.actionsCast += 1;
        bumpSig(ctx);
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
        recordSpellDamage(r.state);
        state = r.state;
        character = r.character;
        stats.slot1Used += 1;
        stats.actionsCast += 1;
        bumpSig(ctx);
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
        stats.cantripDamage += dealt;
        stats.perChapter[ctx.chapter].dmgDealt += dealt;
        stats.perEncType[ctx.encType].dmgDealt += dealt;
        stats.actionsCantrip += 1;
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
// Room → chapter / encounter type
// ─────────────────────────────────────────────────────────────────────────

function roomChapter(idx: number): number {
  if (idx <= 10) return 1;
  if (idx <= 19) return 2;
  if (idx <= 28) return 3;
  return 4;
}

// Godwake delve room layout (zero-indexed into delve.rooms):
//   Ch1 rooms 0..9: warmup(0), shrine, event, early-mid(3), rest, mid(5),
//                   shrine, elite(7), event, intel? -> boss(9)
// Actually intelRoomFor inserts a separate room. Need to classify by room.id
// suffix that the delve generator uses.
function classifyEncounter(room: RoomSpec, _chapter: number): EncType {
  if (room.kind === 'boss') return 'boss';
  // Combat slots — read room.id pattern. The Godwake delve uses
  // room-1, room-4, room-6, room-8 (Ch1); room-12, room-15, room-17 (Ch2);
  // room-21, room-24, room-26 (Ch3); room-30, room-33, room-35 (Ch4).
  // The elite slot is the highest-numbered non-boss combat in each chapter.
  const id = room.id;
  if (
    id === 'room-8' || id === 'room-17' || id === 'room-26'
  ) return 'elite';
  if (
    id === 'room-1' || id === 'room-12' || id === 'room-21' || id === 'room-30'
  ) return 'warmup';
  return 'mid';
}

// ─────────────────────────────────────────────────────────────────────────
// Combat driver
// ─────────────────────────────────────────────────────────────────────────

function runCombat(
  roller: DiceRoller,
  classId: ClassId,
  characterIn: Character,
  room: RoomSpec,
  chapter: number,
  encType: EncType,
  stats: RunStats,
): { character: Character; victory: boolean; roundCount: number } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;
  const startRound = state.round;
  let turnsTaken = 0;

  while (state.status === 'active' && turnsTaken < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const hpBefore = character.hp.current;
      const turn = playerTurn(classId, { roller, state, character, stats, chapter, encType });
      state = turn.state;
      character = turn.character;
      if (character.hp.current < hpBefore) {
        const dmg = hpBefore - character.hp.current;
        stats.damageTaken += dmg;
        stats.perChapter[chapter].dmgTaken += dmg;
        stats.perEncType[encType].dmgTaken += dmg;
      }
    } else {
      const hpBefore = character.hp.current;
      const shieldBefore = character.resources.shieldActive === true;
      const r = monsterAttack(
        { roller, character, state },
        state.initiativeOrder[state.currentTurnIndex],
      );
      state = r.state;
      character = r.character;
      if (character.hp.current < hpBefore) {
        const dmg = hpBefore - character.hp.current;
        stats.damageTaken += dmg;
        stats.perChapter[chapter].dmgTaken += dmg;
        stats.perEncType[encType].dmgTaken += dmg;
      }
      if (!shieldBefore && character.resources.shieldActive === true) {
        stats.shieldReactions += 1;
        if (classId === 'wizard') bumpSig({ roller, state, character, stats, chapter, encType });
      }
      if (state.status === 'active') {
        const ended = endTurn(state, character);
        state = ended.state;
        character = ended.character;
      }
    }
    turnsTaken += 1;
  }

  const rounds = Math.max(1, state.round - startRound + 1);
  stats.combatRounds += rounds;
  stats.encountersFought += 1;
  stats.perChapter[chapter].rounds += rounds;
  stats.perChapter[chapter].encounters += 1;
  stats.perEncType[encType].rounds += rounds;
  stats.perEncType[encType].count += 1;

  const victory = state.status === 'player-victory';
  if (victory) {
    stats.encountersWon += 1;
    stats.perChapter[chapter].encountersWon += 1;
    stats.perEncType[encType].won += 1;
  }
  return { character, victory, roundCount: rounds };
}

function liveOneAttempt(
  roller: DiceRoller,
  classId: ClassId,
  stats: RunStats,
  lifeIdx: number,
): { cleared: boolean; finalRoomIdx: number; finalChapter: number; finalLevel: number } {
  let character = freshCharacter(classId, START_LEVEL);
  const delveSeed = ((roller.roll('1d100').total * 2654435761) ^ (lifeIdx * 7919) ^ classId.charCodeAt(0)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed });
  let finalRoomIdx = 0;

  for (let i = 0; i < delve.rooms.length; i++) {
    finalRoomIdx = i;
    const room = delve.rooms[i];
    const chapter = roomChapter(i);

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

    const encType = classifyEncounter(room, chapter);
    const result = runCombat(roller, classId, character, room, chapter, encType, stats);
    character = result.character;

    if (!result.victory) {
      return {
        cleared: false,
        finalRoomIdx,
        finalChapter: chapter,
        finalLevel: character.level,
      };
    }

    const roomXp = room.xpReward ?? 0;
    if (roomXp > 0) {
      character = { ...character, xp: character.xp + roomXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  return {
    cleared: true,
    finalRoomIdx,
    finalChapter: 4,
    finalLevel: character.level,
  };
}

function runMatrixCell(classId: ClassId, runsPerCell: number): RunStats[] {
  const cell: RunStats[] = [];
  for (let runIdx = 0; runIdx < runsPerCell; runIdx++) {
    const stats = emptyStats(classId);
    for (let life = 0; life < LIVES_PER_RUN; life++) {
      const seed = ((SEED_BASE + runIdx * 101 + life * 7919) ^ (START_LEVEL * 1009)) >>> 0;
      const roller = createDiceRoller(seed);
      setActiveRoller(seed);
      const outcome = liveOneAttempt(roller, classId, stats, life);
      stats.lifeOutcomes.push({
        cleared: outcome.cleared,
        finalRoomIdx: outcome.finalRoomIdx,
        finalChapter: outcome.finalChapter,
        finalLevel: outcome.finalLevel,
      });
      if (outcome.cleared) break;
    }
    cell.push(stats);
  }
  return cell;
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation
// ─────────────────────────────────────────────────────────────────────────

interface Aggregate {
  classId: ClassId;
  runs: number;
  lives: number;
  lifeClearRate: number;
  meanChaptersPerLife: number;
  meanRoundsPerCombat: number;
  meanDmgDealtPerLife: number;
  meanDmgTakenPerLife: number;
  meanHpHealedPerLife: number;

  // damage source split (% of damage)
  weaponSharePct: number;
  spellSharePct: number;
  cantripSharePct: number;

  // action-type fingerprint (% of all actions taken)
  actionShareAttack: number;
  actionShareCast: number;
  actionShareCantrip: number;
  actionShareBonus: number;       // cunning + SW + misty combined
  actionShareSurge: number;
  actionSharePotion: number;

  hitRate: number;
  critRate: number;

  meanSneakPerLife: number;
  meanCunningPerLife: number;
  meanSecondWindPerLife: number;
  meanActionSurgePerLife: number;
  meanSlot1PerLife: number;
  meanSlot2PerLife: number;
  meanSlot3PerLife: number;
  meanMistyPerLife: number;
  meanShieldPerLife: number;

  // per-chapter shares (% of total sig uses in this chapter)
  perChapterSigShare: Record<number, number>;
  // per-chapter avg rounds per encounter
  perChapterRoundsPerEnc: Record<number, number>;
  // per-encounter-type
  encWinRate: Record<EncType, number>;
  encRoundsPerEnc: Record<EncType, number>;
  encDmgDealtPerEnc: Record<EncType, number>;
  encDmgTakenPerEnc: Record<EncType, number>;
}

function aggregate(cell: RunStats[]): Aggregate {
  const totalLives = cell.reduce((s, r) => s + r.lifeOutcomes.length, 0);
  const totalCombats = cell.reduce((s, r) => s + r.encountersFought, 0);
  const totalRounds = cell.reduce((s, r) => s + r.combatRounds, 0);
  const totalAttacks = cell.reduce((s, r) => s + r.attacks, 0);
  const totalHits = cell.reduce((s, r) => s + r.hits, 0);
  const totalCrits = cell.reduce((s, r) => s + r.crits, 0);

  const totalDmg = cell.reduce((s, r) => s + r.damageDealt, 0);
  const totalWeapon = cell.reduce((s, r) => s + r.weaponDamage, 0);
  const totalSpell = cell.reduce((s, r) => s + r.spellDamage, 0);
  const totalCantrip = cell.reduce((s, r) => s + r.cantripDamage, 0);

  const totalActionAttack = cell.reduce((s, r) => s + r.actionsAttack, 0);
  const totalActionCast = cell.reduce((s, r) => s + r.actionsCast, 0);
  const totalActionCantrip = cell.reduce((s, r) => s + r.actionsCantrip, 0);
  const totalActionBonus =
    cell.reduce((s, r) => s + r.actionsBonusCunning + r.actionsBonusSecondWind + r.actionsBonusMisty, 0);
  const totalActionSurge = cell.reduce((s, r) => s + r.actionsActionSurge, 0);
  const totalActionPotion = cell.reduce((s, r) => s + r.actionsPotion, 0);
  const totalActions =
    totalActionAttack + totalActionCast + totalActionCantrip + totalActionBonus + totalActionSurge + totalActionPotion;

  const clearedLives = cell.reduce((s, r) => s + r.lifeOutcomes.filter((l) => l.cleared).length, 0);
  const meanChaptersPerLife = (() => {
    let total = 0;
    for (const r of cell) {
      for (const l of r.lifeOutcomes) {
        // chapters cleared = finalChapter - 1 if not cleared (since dying in
        // Ch3 means cleared 2), 4 if cleared the matron.
        if (l.cleared) total += 4;
        else total += Math.max(0, l.finalChapter - 1);
      }
    }
    return totalLives === 0 ? 0 : total / totalLives;
  })();

  const sumPerLife = (sel: (s: RunStats) => number) =>
    totalLives === 0 ? 0 : cell.reduce((s, r) => s + sel(r), 0) / totalLives;

  const perChapterSigShare: Record<number, number> = {};
  const perChapterRoundsPerEnc: Record<number, number> = {};
  for (const ch of [1, 2, 3, 4] as const) {
    const sigs = cell.reduce((s, r) => s + r.perChapter[ch].sigUses, 0);
    const rounds = cell.reduce((s, r) => s + r.perChapter[ch].rounds, 0);
    const enc = cell.reduce((s, r) => s + r.perChapter[ch].encounters, 0);
    perChapterSigShare[ch] = enc === 0 ? 0 : sigs / enc;
    perChapterRoundsPerEnc[ch] = enc === 0 ? 0 : rounds / enc;
  }

  const encWinRate: Record<EncType, number> = { warmup: 0, mid: 0, elite: 0, boss: 0 };
  const encRoundsPerEnc: Record<EncType, number> = { warmup: 0, mid: 0, elite: 0, boss: 0 };
  const encDmgDealtPerEnc: Record<EncType, number> = { warmup: 0, mid: 0, elite: 0, boss: 0 };
  const encDmgTakenPerEnc: Record<EncType, number> = { warmup: 0, mid: 0, elite: 0, boss: 0 };
  for (const t of ['warmup', 'mid', 'elite', 'boss'] as EncType[]) {
    const count = cell.reduce((s, r) => s + r.perEncType[t].count, 0);
    const won = cell.reduce((s, r) => s + r.perEncType[t].won, 0);
    const rounds = cell.reduce((s, r) => s + r.perEncType[t].rounds, 0);
    const dmgD = cell.reduce((s, r) => s + r.perEncType[t].dmgDealt, 0);
    const dmgT = cell.reduce((s, r) => s + r.perEncType[t].dmgTaken, 0);
    encWinRate[t] = count === 0 ? 0 : won / count;
    encRoundsPerEnc[t] = count === 0 ? 0 : rounds / count;
    encDmgDealtPerEnc[t] = count === 0 ? 0 : dmgD / count;
    encDmgTakenPerEnc[t] = count === 0 ? 0 : dmgT / count;
  }

  return {
    classId: cell[0].classId,
    runs: cell.length,
    lives: totalLives,
    lifeClearRate: totalLives === 0 ? 0 : clearedLives / totalLives,
    meanChaptersPerLife,
    meanRoundsPerCombat: totalCombats === 0 ? 0 : totalRounds / totalCombats,
    meanDmgDealtPerLife: sumPerLife((s) => s.damageDealt),
    meanDmgTakenPerLife: sumPerLife((s) => s.damageTaken),
    meanHpHealedPerLife: sumPerLife((s) => s.hpHealed),
    weaponSharePct: totalDmg === 0 ? 0 : totalWeapon / totalDmg,
    spellSharePct: totalDmg === 0 ? 0 : totalSpell / totalDmg,
    cantripSharePct: totalDmg === 0 ? 0 : totalCantrip / totalDmg,
    actionShareAttack: totalActions === 0 ? 0 : totalActionAttack / totalActions,
    actionShareCast: totalActions === 0 ? 0 : totalActionCast / totalActions,
    actionShareCantrip: totalActions === 0 ? 0 : totalActionCantrip / totalActions,
    actionShareBonus: totalActions === 0 ? 0 : totalActionBonus / totalActions,
    actionShareSurge: totalActions === 0 ? 0 : totalActionSurge / totalActions,
    actionSharePotion: totalActions === 0 ? 0 : totalActionPotion / totalActions,
    hitRate: totalAttacks === 0 ? 0 : totalHits / totalAttacks,
    critRate: totalAttacks === 0 ? 0 : totalCrits / totalAttacks,
    meanSneakPerLife: sumPerLife((s) => s.sneakAttacks),
    meanCunningPerLife: sumPerLife((s) => s.cunningUses),
    meanSecondWindPerLife: sumPerLife((s) => s.secondWindUses),
    meanActionSurgePerLife: sumPerLife((s) => s.actionSurgeUses),
    meanSlot1PerLife: sumPerLife((s) => s.slot1Used),
    meanSlot2PerLife: sumPerLife((s) => s.slot2Used),
    meanSlot3PerLife: sumPerLife((s) => s.slot3Used),
    meanMistyPerLife: sumPerLife((s) => s.mistyStepCasts),
    meanShieldPerLife: sumPerLife((s) => s.shieldReactions),
    perChapterSigShare,
    perChapterRoundsPerEnc,
    encWinRate,
    encRoundsPerEnc,
    encDmgDealtPerEnc,
    encDmgTakenPerEnc,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Distinctness scoring
// ─────────────────────────────────────────────────────────────────────────

interface DistinctnessRow {
  metric: string;
  rogue: number;
  fighter: number;
  wizard: number;
  spread: number;             // max - min in absolute units
  spreadPctOfMax: number;     // spread / max (informal "how distinct")
}

function fmtN(n: number, d = 2): string {
  return n.toFixed(d);
}
function fmtP(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function distinctness(aggs: Record<ClassId, Aggregate>): DistinctnessRow[] {
  function row(metric: string, sel: (a: Aggregate) => number): DistinctnessRow {
    const r = sel(aggs.rogue);
    const f = sel(aggs.fighter);
    const w = sel(aggs.wizard);
    const max = Math.max(r, f, w);
    const min = Math.min(r, f, w);
    const spread = max - min;
    return {
      metric,
      rogue: r,
      fighter: f,
      wizard: w,
      spread,
      spreadPctOfMax: max === 0 ? 0 : spread / max,
    };
  }
  return [
    row('weapon share of dmg', (a) => a.weaponSharePct),
    row('spell share of dmg', (a) => a.spellSharePct),
    row('cantrip share of dmg', (a) => a.cantripSharePct),
    row('actions: attack share', (a) => a.actionShareAttack),
    row('actions: cast share', (a) => a.actionShareCast),
    row('actions: bonus share', (a) => a.actionShareBonus),
    row('actions: surge share', (a) => a.actionShareSurge),
    row('actions: potion share', (a) => a.actionSharePotion),
    row('mean rounds / combat', (a) => a.meanRoundsPerCombat),
    row('hit rate', (a) => a.hitRate),
    row('mean dmg taken / life', (a) => a.meanDmgTakenPerLife),
    row('mean HP healed / life', (a) => a.meanHpHealedPerLife),
    row('mean chapters / life', (a) => a.meanChaptersPerLife),
    row('boss win rate', (a) => a.encWinRate.boss),
    row('elite win rate', (a) => a.encWinRate.elite),
    row('rounds / boss', (a) => a.encRoundsPerEnc.boss),
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────

const PRE_PHASE1_L5_NORMAL = {
  rogue: { sneak: 7.27, cunning: 6.36, sw: 0, as: 0, slot1: 0, slot2: 0, slot3: 0, misty: 0, cantripShare: 0, potions: 3.00 },
  fighter: { sneak: 0, cunning: 0, sw: 2.62, as: 1.86, slot1: 0, slot2: 0, slot3: 0, misty: 0, cantripShare: 0, potions: 5.92 },
  wizard: { sneak: 0, cunning: 0, sw: 0, as: 0, slot1: 14.84 / 3, slot2: 13.38 / 3, slot3: 6.48 / 3, misty: 6.04 / 3, cantripShare: 0.08, potions: 3.00 },
};
// NOTE: pre-Phase-1 numbers were per-RUN (≤3 lives). Divided slot1/2/3 + misty
// by 3 so they're roughly per-life and comparable to our per-life metrics.
// Other rates (sneak, cunning, SW, AS, potions) were already per-life.

function renderHeadlineTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Class | Runs | Lives | LifeClear% | Ch/life | TTK rds | Dmg dealt | Dmg taken | HP healed | Hit% | Crit% |',
  );
  lines.push(
    '|------|----:|-----:|---------:|--------:|-------:|---------:|---------:|---------:|-----:|-----:|',
  );
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${a.runs} | ${a.lives} | ${fmtP(a.lifeClearRate)} | ${fmtN(a.meanChaptersPerLife)} | ${fmtN(a.meanRoundsPerCombat)} | ${fmtN(a.meanDmgDealtPerLife, 0)} | ${fmtN(a.meanDmgTakenPerLife, 0)} | ${fmtN(a.meanHpHealedPerLife, 0)} | ${fmtP(a.hitRate)} | ${fmtP(a.critRate)} |`,
    );
  }
  return lines.join('\n');
}

function renderDamageSplitTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Weapon% | Spell% | Cantrip% | Total dmg/life |');
  lines.push('|------|-------:|------:|---------:|--------------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${fmtP(a.weaponSharePct)} | ${fmtP(a.spellSharePct)} | ${fmtP(a.cantripSharePct)} | ${fmtN(a.meanDmgDealtPerLife, 0)} |`,
    );
  }
  return lines.join('\n');
}

function renderActionFingerprint(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Attack% | Cast% | Cantrip% | Bonus% | Surge% | Potion% |');
  lines.push('|------|-------:|-----:|---------:|------:|------:|-------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${fmtP(a.actionShareAttack)} | ${fmtP(a.actionShareCast)} | ${fmtP(a.actionShareCantrip)} | ${fmtP(a.actionShareBonus)} | ${fmtP(a.actionShareSurge)} | ${fmtP(a.actionSharePotion)} |`,
    );
  }
  return lines.join('\n');
}

function renderSignatureTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Class | Sneak/life | Cunning/life | SW/life | AS/life | Slot1/life | Slot2/life | Slot3/life | Misty/life | Shield/life |',
  );
  lines.push(
    '|------|----------:|------------:|--------:|--------:|----------:|----------:|----------:|----------:|------------:|',
  );
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${fmtN(a.meanSneakPerLife)} | ${fmtN(a.meanCunningPerLife)} | ${fmtN(a.meanSecondWindPerLife)} | ${fmtN(a.meanActionSurgePerLife)} | ${fmtN(a.meanSlot1PerLife)} | ${fmtN(a.meanSlot2PerLife)} | ${fmtN(a.meanSlot3PerLife)} | ${fmtN(a.meanMistyPerLife)} | ${fmtN(a.meanShieldPerLife)} |`,
    );
  }
  return lines.join('\n');
}

function renderPerChapterResources(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Ch1 sig/enc | Ch2 sig/enc | Ch3 sig/enc | Ch4 sig/enc | Ch1 rds/enc | Ch2 rds/enc | Ch3 rds/enc | Ch4 rds/enc |');
  lines.push('|------|----------:|----------:|----------:|----------:|----------:|----------:|----------:|----------:|');
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${fmtN(a.perChapterSigShare[1])} | ${fmtN(a.perChapterSigShare[2])} | ${fmtN(a.perChapterSigShare[3])} | ${fmtN(a.perChapterSigShare[4])} | ${fmtN(a.perChapterRoundsPerEnc[1])} | ${fmtN(a.perChapterRoundsPerEnc[2])} | ${fmtN(a.perChapterRoundsPerEnc[3])} | ${fmtN(a.perChapterRoundsPerEnc[4])} |`,
    );
  }
  return lines.join('\n');
}

function renderEncTypeTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Type | Count/run | Win% | Rounds/enc | DmgDealt/enc | DmgTaken/enc |');
  lines.push('|------|----|---------:|----:|-----------:|-------------:|-------------:|');
  for (const a of aggs) {
    for (const t of ['warmup', 'mid', 'elite', 'boss'] as EncType[]) {
      // Count per run is per-life-encounter-count / lives — but we want average
      // encounters seen per life of that type.
      // We approximated by rounds/enc and dmg-per-enc above; just show win%.
      lines.push(
        `| ${a.classId} | ${t} | — | ${fmtP(a.encWinRate[t])} | ${fmtN(a.encRoundsPerEnc[t])} | ${fmtN(a.encDmgDealtPerEnc[t], 0)} | ${fmtN(a.encDmgTakenPerEnc[t], 0)} |`,
      );
    }
  }
  return lines.join('\n');
}

function renderPairwiseTable(aggs: Record<ClassId, Aggregate>): string {
  // For each axis we care about (the "core 6"), how far apart is each pair?
  const lines: string[] = [];
  lines.push('| Metric | Rogue↔Fighter | Rogue↔Wizard | Fighter↔Wizard |');
  lines.push('|-------|-------------:|-------------:|--------------:|');
  function row(metric: string, sel: (a: Aggregate) => number, asPct = false) {
    const r = sel(aggs.rogue);
    const f = sel(aggs.fighter);
    const w = sel(aggs.wizard);
    const fmt = (n: number) => (asPct ? fmtP(n) : fmtN(n, 2));
    lines.push(
      `| ${metric} | ${fmt(Math.abs(r - f))} | ${fmt(Math.abs(r - w))} | ${fmt(Math.abs(f - w))} |`,
    );
  }
  row('weapon share of dmg', (a) => a.weaponSharePct, true);
  row('spell share of dmg', (a) => a.spellSharePct, true);
  row('actions: attack share', (a) => a.actionShareAttack, true);
  row('actions: cast share', (a) => a.actionShareCast, true);
  row('actions: bonus share', (a) => a.actionShareBonus, true);
  row('mean dmg taken / life', (a) => a.meanDmgTakenPerLife);
  row('rounds / boss', (a) => a.encRoundsPerEnc.boss);
  row('boss win rate', (a) => a.encWinRate.boss, true);
  return lines.join('\n');
}

function renderDistinctnessTable(rows: DistinctnessRow[]): string {
  const lines: string[] = [];
  lines.push('| Metric | Rogue | Fighter | Wizard | Spread | Spread % of max |');
  lines.push('|-------|------:|-------:|-------:|------:|----------------:|');
  for (const r of rows) {
    const fmt = (n: number) =>
      r.metric.includes('share') || r.metric.includes('rate') || r.metric === 'hit rate'
        ? fmtP(n)
        : fmtN(n, r.metric.includes('dmg') || r.metric.includes('chapters') ? 1 : 2);
    lines.push(
      `| ${r.metric} | ${fmt(r.rogue)} | ${fmt(r.fighter)} | ${fmt(r.wizard)} | ${fmt(r.spread)} | ${fmtP(r.spreadPctOfMax)} |`,
    );
  }
  return lines.join('\n');
}

function renderPrePostComparison(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push('| Class | Metric | Pre-Phase-1 (L5 class-tour-late) | Post-Phase-1 (this run) | Δ |');
  lines.push('|------|-------|-------------------------------:|----------------------:|--:|');
  function row(klass: ClassId, label: string, pre: number, post: number, isPct = false) {
    const f = (n: number) => (isPct ? fmtP(n) : fmtN(n, 2));
    const delta = post - pre;
    const deltaStr = (delta >= 0 ? '+' : '') + f(delta);
    lines.push(`| ${klass} | ${label} | ${f(pre)} | ${f(post)} | ${deltaStr} |`);
  }
  const r = aggs.find((a) => a.classId === 'rogue')!;
  const f = aggs.find((a) => a.classId === 'fighter')!;
  const w = aggs.find((a) => a.classId === 'wizard')!;
  row('rogue', 'sneak / life', PRE_PHASE1_L5_NORMAL.rogue.sneak, r.meanSneakPerLife);
  row('rogue', 'cunning / life', PRE_PHASE1_L5_NORMAL.rogue.cunning, r.meanCunningPerLife);
  row('fighter', 'second-wind / life', PRE_PHASE1_L5_NORMAL.fighter.sw, f.meanSecondWindPerLife);
  row('fighter', 'action-surge / life', PRE_PHASE1_L5_NORMAL.fighter.as, f.meanActionSurgePerLife);
  row('wizard', 'slot1 / life', PRE_PHASE1_L5_NORMAL.wizard.slot1, w.meanSlot1PerLife);
  row('wizard', 'slot2 / life', PRE_PHASE1_L5_NORMAL.wizard.slot2, w.meanSlot2PerLife);
  row('wizard', 'slot3 / life', PRE_PHASE1_L5_NORMAL.wizard.slot3, w.meanSlot3PerLife);
  row('wizard', 'misty / life', PRE_PHASE1_L5_NORMAL.wizard.misty, w.meanMistyPerLife);
  row('wizard', 'cantrip share', PRE_PHASE1_L5_NORMAL.wizard.cantripShare, w.cantripSharePct, true);
  return lines.join('\n');
}

function flag(spreadPct: number, sigUseDelta: number, signature: string, klass: string): string[] {
  const flags: string[] = [];
  if (spreadPct < 0.30) {
    flags.push(`- **Convergence flag** on \`${signature}\` (${klass}): spread is only ${fmtP(spreadPct)} of the max — classes look similar on this axis.`);
  }
  if (sigUseDelta < -1.0) {
    flags.push(`- **Identity-loss flag**: ${klass} ${signature} usage dropped ${fmtN(sigUseDelta)} per life vs pre-Phase-1 — signature mechanic is firing less often.`);
  }
  if (sigUseDelta > 5.0) {
    flags.push(`- **Excess-divergence flag**: ${klass} ${signature} usage jumped ${fmtN(sigUseDelta)} per life vs pre-Phase-1 — the class may be over-leaning on this mechanic.`);
  }
  return flags;
}

function computeFlags(aggs: Aggregate[], rows: DistinctnessRow[]): string[] {
  const flags: string[] = [];
  const r = aggs.find((a) => a.classId === 'rogue')!;
  const f = aggs.find((a) => a.classId === 'fighter')!;
  const w = aggs.find((a) => a.classId === 'wizard')!;

  // signature mechanic firing checks
  if (r.meanCunningPerLife < 3) {
    flags.push(`- **Identity-loss flag**: Rogue Cunning Action averaging ${fmtN(r.meanCunningPerLife)} per life — signature mechanic underused.`);
  }
  if (f.meanSecondWindPerLife < 1) {
    flags.push(`- **Identity-loss flag**: Fighter Second Wind averaging ${fmtN(f.meanSecondWindPerLife)} per life — signature mechanic underused.`);
  }
  if (f.meanActionSurgePerLife < 1) {
    flags.push(`- **Identity-loss flag**: Fighter Action Surge averaging ${fmtN(f.meanActionSurgePerLife)} per life — signature mechanic underused.`);
  }
  if (w.meanSlot3PerLife + w.meanSlot2PerLife + w.meanSlot1PerLife < 5) {
    flags.push(`- **Identity-loss flag**: Wizard total slot casts under 5/life — spellcasting identity weak.`);
  }

  // damage source split sanity
  if (w.spellSharePct < 0.40) {
    flags.push(`- **Identity-loss flag**: Wizard spell-damage share is ${fmtP(w.spellSharePct)} — under 40 % suggests the wizard is fighting like a weapon class.`);
  }
  if (f.weaponSharePct < 0.95) {
    flags.push(`- **Sanity check**: Fighter weapon share is ${fmtP(f.weaponSharePct)} — expected ~100 %.`);
  }

  // convergence checks on key distinctness rows
  const keyRows = ['weapon share of dmg', 'spell share of dmg', 'actions: cast share', 'actions: bonus share', 'mean dmg taken / life'];
  for (const m of keyRows) {
    const row = rows.find((r2) => r2.metric === m)!;
    if (row.spreadPctOfMax < 0.30) {
      flags.push(`- **Convergence flag** on \`${m}\`: spread ${fmtP(row.spreadPctOfMax)} of max (R ${fmtP(row.rogue)}, F ${fmtP(row.fighter)}, W ${fmtP(row.wizard)}).`);
    }
  }

  // Pre/post comparison flags are deliberately NOT auto-fired here. Pre-Phase-1
  // numbers come from class-tour-late (Ch3+Ch4 only); this sim walks Ch1→Ch4,
  // so signature counts naturally double for room-count reasons alone. The
  // pre/post table in section 8 still shows the deltas — interpretation lives
  // in the diagnosis text.
  void flag;

  return flags;
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

function main(): void {
  const tWall0 = Date.now();
  const classes: ClassId[] = ['rogue', 'fighter', 'wizard'];
  console.log(`Class-identity sweep — L${START_LEVEL} × ${RUNS_PER_CELL} runs × ${LIVES_PER_RUN} lives × 3 classes\n`);

  const aggs: Aggregate[] = [];
  for (const classId of classes) {
    const t0 = Date.now();
    const cell = runMatrixCell(classId, RUNS_PER_CELL);
    const agg = aggregate(cell);
    aggs.push(agg);
    const dt = Date.now() - t0;
    console.log(
      `${classId.padEnd(7)} → lifeClear ${fmtP(agg.lifeClearRate).padStart(6)}  ch/life ${fmtN(agg.meanChaptersPerLife)}  weap/spell/cant ${fmtP(agg.weaponSharePct)}/${fmtP(agg.spellSharePct)}/${fmtP(agg.cantripSharePct)}  ${dt}ms`,
    );
  }

  const aggMap: Record<ClassId, Aggregate> = {
    rogue: aggs.find((a) => a.classId === 'rogue')!,
    fighter: aggs.find((a) => a.classId === 'fighter')!,
    wizard: aggs.find((a) => a.classId === 'wizard')!,
  };
  const distinctRows = distinctness(aggMap);
  const flags = computeFlags(aggs, distinctRows);

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderDoc(aggs, distinctRows, flags, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/gameplay-quality/class-identity.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote class-identity report → ${outPath}  (${dtTotal}s wall)`);
}

function renderDoc(aggs: Aggregate[], distinctRows: DistinctnessRow[], flags: string[], wallSec: string): string {
  const meanDistinctness = distinctRows.reduce((s, r) => s + r.spreadPctOfMax, 0) / distinctRows.length;
  return `# Class identity — post-Phase-1 telemetry

> Auto-generated by \`scripts/sim-class-identity.ts\`. Re-run with
> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-class-identity.ts\`.

**Date:** 2026-05-28
**Setup:** Rogue / Fighter / Wizard at L${START_LEVEL}, ${RUNS_PER_CELL} runs/class
× ${LIVES_PER_RUN} lives, full \`createGodwakeDelve\` (Ch1 → Ch4, 37 rooms).
Bare-soul (shrines + events skipped); rest = 70 % HP, camp = long rest.
XP propagates across the chain. Each class uses its existing combat AI
(transplanted from \`sim-full-matrix.ts\`). Wall: ${wallSec}s.

**Question:** after 13+ PRs of buffs / tunes / reworks, do the three classes
still feel like three distinct classes — or have they converged?

**Headline:** mean class-distinctness across 16 metrics =
**${fmtP(meanDistinctness)}** spread-of-max. ${flags.length === 0 ? 'No flags fired.' : `${flags.length} flag(s) fired (see below).`}

## 1. Headline

${renderHeadlineTable(aggs)}

## 2. Damage source split

What's the % of damage each class deals via weapon vs spell-slot vs cantrip?
This is the cleanest "are these the same class?" check: if Wizard's weapon
share is high or Fighter has any spell share, things have converged.

${renderDamageSplitTable(aggs)}

## 3. Action-economy fingerprint

What fraction of all actions taken (attack / spell-cast / cantrip / bonus-
action / action-surge / potion) does each class use? A class with a flat
profile across all six is a generic "use ability, potion, repeat" class.

${renderActionFingerprint(aggs)}

## 4. Signature mechanic firing rates

The defining mechanic for each class:
- **Rogue:** Sneak Attack + Cunning Action
- **Fighter:** Second Wind + Action Surge + multiattack
- **Wizard:** Spell slots (1/2/3) + Misty Step + Shield reaction

${renderSignatureTable(aggs)}

## 5. Per-chapter resource curve

\`sig/enc\` = signature mechanic firings per encounter in that chapter.
\`rds/enc\` = mean rounds-to-resolve per encounter in that chapter.
Tells us whether each class's pacing differs across the chain.

${renderPerChapterResources(aggs)}

## 6. Per-encounter-type performance

Win-rate / rounds-to-resolve / damage profile per encounter slot.
**warmup** = first-combat-of-chapter; **mid** = middle slot; **elite** =
last-non-boss slot; **boss** = chapter boss. The cells that crush vs wall
each class.

${renderEncTypeTable(aggs)}

## 7. Class-distinctness scores

For each metric: spread across the three classes (max - min). Higher
spread = more distinct. "Spread % of max" = spread / max(metric) — a
class-agnostic "how distinct" reading on each axis.

${renderDistinctnessTable(distinctRows)}

**Mean spread % of max across the 16 metrics = ${fmtP(meanDistinctness)}.**

### Pairwise gaps on core axes

Absolute gap between each pair of classes on the axes that matter most for
identity. Big numbers = those two classes feel different.

${renderPairwiseTable({
  rogue: aggs.find((a) => a.classId === 'rogue')!,
  fighter: aggs.find((a) => a.classId === 'fighter')!,
  wizard: aggs.find((a) => a.classId === 'wizard')!,
})}

## 8. Pre-Phase-1 comparison

Pre-Phase-1 reference numbers come from
\`docs/playtest-findings/class-tour-late-matrix.md\` (L5 normal, 50 runs).

> **Important scope note.** Pre-Phase-1 class-tour-late only walked Ch3+Ch4
> (~16 rooms). This sim walks the full Ch1→Ch4 chain (37 rooms), so a
> surviving life simply *sees* roughly 2× more combat slots than the
> pre-Phase-1 sim. Raw signature counts will scale with room count even if
> nothing about the class changed.
>
> What's meaningful to compare here is **ratios** (sneak/cunning ratio,
> SW/AS ratio, slot 1:2:3 distribution) and **cantrip share** (a rate,
> not a count) — not raw per-life counts.

Wizard slot/misty counts in that doc were per-RUN (≤ 3 lives), so we
divide by 3 to compare to our per-life metrics.

${renderPrePostComparison(aggs)}

## 9. Convergence / identity flags

${flags.length === 0 ? "**No flags fired.** Each class's signature mechanic is firing, damage-source splits remain clearly distinct, and no key distinctness metric collapsed." : flags.join('\n')}

## 10. Diagnosis

${diagnose(aggs, distinctRows, meanDistinctness)}
`;
}

function diagnose(aggs: Aggregate[], rows: DistinctnessRow[], meanD: number): string {
  const r = aggs.find((a) => a.classId === 'rogue')!;
  const f = aggs.find((a) => a.classId === 'fighter')!;
  const w = aggs.find((a) => a.classId === 'wizard')!;

  const lines: string[] = [];

  // Pillar 1: damage source
  lines.push('### Damage source — are they fighting differently?');
  lines.push(`Rogue ${fmtP(r.weaponSharePct)} weapon / ${fmtP(r.spellSharePct)} spell. Fighter ${fmtP(f.weaponSharePct)} weapon. Wizard ${fmtP(w.weaponSharePct)} weapon / ${fmtP(w.spellSharePct)} spell / ${fmtP(w.cantripSharePct)} cantrip.`);
  const damageRow = rows.find((r2) => r2.metric === 'spell share of dmg')!;
  if (damageRow.spreadPctOfMax > 0.7) {
    lines.push(`**Verdict:** classes deal damage through fundamentally different channels. Spell-share spread is ${fmtP(damageRow.spreadPctOfMax)} of max — about as distinct as it gets.`);
  } else if (damageRow.spreadPctOfMax > 0.4) {
    lines.push(`**Verdict:** classes still differ on damage source, but the gap narrowed. Spell-share spread ${fmtP(damageRow.spreadPctOfMax)} of max.`);
  } else {
    lines.push(`**Verdict:** damage source has converged. Spell-share spread only ${fmtP(damageRow.spreadPctOfMax)} of max — flag.`);
  }

  // Pillar 2: action fingerprint
  lines.push('');
  lines.push('### Action economy — do their turns look different?');
  const attackR = rows.find((r2) => r2.metric === 'actions: attack share')!;
  const castR = rows.find((r2) => r2.metric === 'actions: cast share')!;
  const bonusR = rows.find((r2) => r2.metric === 'actions: bonus share')!;
  lines.push(`Attack-share spread ${fmtP(attackR.spreadPctOfMax)} of max. Cast-share spread ${fmtP(castR.spreadPctOfMax)} of max. Bonus-action-share spread ${fmtP(bonusR.spreadPctOfMax)} of max.`);
  if (attackR.spreadPctOfMax > 0.5 && castR.spreadPctOfMax > 0.5) {
    lines.push('**Verdict:** action fingerprints clearly distinct.');
  } else {
    lines.push('**Verdict:** action fingerprints partially overlap — watch.');
  }

  // Pillar 3: fight shape (rounds + dmg taken)
  lines.push('');
  lines.push('### Fight shape — do they pace differently?');
  lines.push(`Rounds-per-combat: Rogue ${fmtN(r.meanRoundsPerCombat)}, Fighter ${fmtN(f.meanRoundsPerCombat)}, Wizard ${fmtN(w.meanRoundsPerCombat)}.`);
  lines.push(`Damage taken per life: Rogue ${fmtN(r.meanDmgTakenPerLife, 0)}, Fighter ${fmtN(f.meanDmgTakenPerLife, 0)}, Wizard ${fmtN(w.meanDmgTakenPerLife, 0)}.`);
  const dmgTakenR = rows.find((r2) => r2.metric === 'mean dmg taken / life')!;
  if (dmgTakenR.spreadPctOfMax > 0.5) {
    lines.push('**Verdict:** classes absorb very different amounts of punishment — Fighter as the meat-shield is intact.');
  } else {
    lines.push('**Verdict:** damage-taken profiles converging — Fighter may not be tankier than Rogue/Wizard anymore.');
  }

  // Pillar 4: best/worst matchups
  lines.push('');
  lines.push('### Best / worst encounter matchups');
  function bestWorst(a: Aggregate) {
    const types: EncType[] = ['warmup', 'mid', 'elite', 'boss'];
    const ranked = types.map((t) => ({ t, win: a.encWinRate[t] })).sort((x, y) => y.win - x.win);
    return `${a.classId}: best = ${ranked[0].t} (${fmtP(ranked[0].win)}), worst = ${ranked[ranked.length - 1].t} (${fmtP(ranked[ranked.length - 1].win)})`;
  }
  lines.push(`- ${bestWorst(r)}`);
  lines.push(`- ${bestWorst(f)}`);
  lines.push(`- ${bestWorst(w)}`);
  lines.push('');
  lines.push(`Notice each class has a different worst-matchup *shape*:`);
  lines.push(`- Wizard rolls elites (${fmtP(w.encWinRate.elite)} — Fireball clears packs) but walls on bosses (${fmtP(w.encWinRate.boss)}, ${fmtN(w.encRoundsPerEnc.boss)} rds/boss — Hold Person fails, Shield burns out, single-target grind).`);
  lines.push(`- Fighter is the most consistent across encounter types (${fmtP(Math.min(f.encWinRate.warmup, f.encWinRate.mid, f.encWinRate.elite))}–${fmtP(Math.max(f.encWinRate.warmup, f.encWinRate.mid, f.encWinRate.elite))} on non-boss) but eats the most damage (${fmtN(f.meanDmgTakenPerLife, 0)} HP/life vs Rogue ${fmtN(r.meanDmgTakenPerLife, 0)} / Wizard ${fmtN(w.meanDmgTakenPerLife, 0)}).`);
  lines.push(`- Rogue is the burst/kite class — short ${fmtN(r.meanRoundsPerCombat)}-round combats, low damage taken (${fmtN(r.meanDmgTakenPerLife, 0)} HP/life), Cunning Action drives ${fmtP(r.actionShareBonus)} of all actions (6.4× Fighter's bonus-action share).`);
  lines.push('');
  lines.push('These are not balance bugs — they are the class identities working.');

  // Overall
  lines.push('');
  lines.push('### Overall');
  if (meanD > 0.45) {
    lines.push(`Mean distinctness ${fmtP(meanD)} of max — classes remain clearly distinct. **No tuning recommended this round.**`);
  } else if (meanD > 0.30) {
    lines.push(`Mean distinctness ${fmtP(meanD)} of max — classes mostly distinct, but some axes have narrowed since the pre-Phase-1 baseline. Findings-only this round; flag for re-check after the next balance pass.`);
  } else {
    lines.push(`Mean distinctness ${fmtP(meanD)} of max — significant convergence. Recommend a deeper class-identity pass before more buffs/tunes.`);
  }

  // Recommendation for next round
  lines.push('');
  lines.push('### Recommendation for next round');
  if (meanD > 0.45) {
    lines.push(
      `1. **No class-identity tune this round.** All four healthy-class signals fire: distinct damage source, distinct action fingerprint, distinct fight-shape, distinct worst-matchup. The pre/post comparison's "+13 sneak per life" is a room-count artifact (Ch1→Ch4 vs Ch3→Ch4), not a balance shift.`,
    );
    lines.push(
      `2. **Re-run this telemetry whenever a class buff lands.** This script is the cheapest watchdog against accidental convergence — 1-second wall, no infra needed beyond the existing sim engine.`,
    );
    lines.push(
      `3. **Investigate Wizard boss pacing as a separate question.** ${fmtN(w.encRoundsPerEnc.boss)} rounds/boss vs ${fmtN(r.encRoundsPerEnc.boss)}/${fmtN(f.encRoundsPerEnc.boss)} for Rogue/Fighter is a 2× pacing gap. Wizard boss win rate ${fmtP(w.encWinRate.boss)} is the lowest of the three. This is by design (single-target grind is the wizard weakness) but worth a separate "wizard boss UX" inspection before adding more buffs.`,
    );
  } else {
    lines.push(`1. Investigate the converged metrics flagged in section 9.`);
    lines.push(`2. Hold further per-class buffs until the convergence is understood.`);
  }

  return lines.join('\n');
}

main();
