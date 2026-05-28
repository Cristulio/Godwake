/**
 * Full-matrix validation harness — class × level × variant across the full
 * Godwake Ch1 → Ch4 chain. Post-Phase-1 sweep.
 *
 * Runs three classes (Rogue / Fighter / Wizard) through `createGodwakeDelve`
 * starting at L1 / L3 / L5 / L7, with N reincarnation lives per run.
 * Reuses each class's existing combat AI (transplanted from
 * scripts/sim-class-tour-late.ts) so cell results are comparable to the
 * pre-Phase-1 numbers in:
 *   - docs/playtest-findings/class-tour-early.matrix.md (L1, L3 — Ch1+Ch2 only)
 *   - docs/playtest-findings/class-tour-late-matrix.md (L5, L7 — Ch3+Ch4 only)
 *   - docs/sim-findings/wizard-balance.md (L1–L7 full chain, wizard-only)
 *
 * Differences vs the per-chapter tours:
 *   - Single delve walks all 37 rooms in one go; XP propagates so a soul that
 *     clears Ch1 can level up before Ch2 (matches real player progression).
 *   - Variants: `normal`, `rogue-no-uncanny-dodge`, `wizard-no-shield`.
 *     The two control variants suppress the player's reaction before each
 *     monster swing — same pattern as the late-tour no-UD cell.
 *   - Bare-soul: shrines/events skipped (no blessing picks, no event rewards)
 *     so the numbers isolate engine + boss tunings.
 *
 * Run:
 *   RUNS_PER_CELL=200 npx tsx scripts/sim-full-matrix.ts
 *   RUNS_PER_CELL=500 npx tsx scripts/sim-full-matrix.ts   # slower, tighter CI
 *
 * Writes raw matrix to docs/validation-findings/full-matrix.raw.md.
 * Curated analysis lives in docs/validation-findings/full-matrix.md.
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

// ─────────────────────────────────────────────────────────────────────────
// Matrix shape
// ─────────────────────────────────────────────────────────────────────────

type ClassId = 'rogue' | 'fighter' | 'wizard';
type Variant = 'normal' | 'rogue-no-uncanny-dodge' | 'wizard-no-shield';

interface CellSpec {
  classId: ClassId;
  startLevel: number;
  variant: Variant;
}

const MATRIX: CellSpec[] = [
  // Three classes × four start levels (normal variant).
  ...(['rogue', 'fighter', 'wizard'] as ClassId[]).flatMap((c) =>
    [1, 3, 5, 7].map((l) => ({ classId: c, startLevel: l, variant: 'normal' as Variant })),
  ),
  // Rogue Uncanny-Dodge control — only meaningful at L5+ (UD unlocks at L5).
  { classId: 'rogue', startLevel: 5, variant: 'rogue-no-uncanny-dodge' },
  { classId: 'rogue', startLevel: 7, variant: 'rogue-no-uncanny-dodge' },
  // Wizard Shield-as-reaction control — meaningful at every level (Shield is L1).
  { classId: 'wizard', startLevel: 1, variant: 'wizard-no-shield' },
  { classId: 'wizard', startLevel: 3, variant: 'wizard-no-shield' },
  { classId: 'wizard', startLevel: 5, variant: 'wizard-no-shield' },
  { classId: 'wizard', startLevel: 7, variant: 'wizard-no-shield' },
];

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 200);
const LIVES_PER_RUN = 3;
const MAX_TURNS_PER_FIGHT = 200;
const SEED_BASE = 0xfaceb007 >>> 0;

const BOSS_DEF_IDS = {
  ilyich: 'duergar-ilyich',
  magistrate: 'athkatla-magistrate',
  director: 'asylum-director',
  matron: 'drow-matron-mother',
} as const;

const BOSS_LABEL_BY_DEF: Record<string, string> = {
  [BOSS_DEF_IDS.ilyich]: 'Ilyich (Ch1)',
  [BOSS_DEF_IDS.magistrate]: 'Magistrate (Ch2)',
  [BOSS_DEF_IDS.director]: 'Director (Ch3)',
  [BOSS_DEF_IDS.matron]: 'Matron Mother (Ch4)',
};

const CHAPTER_OF_BOSS: Record<string, number> = {
  [BOSS_DEF_IDS.ilyich]: 1,
  [BOSS_DEF_IDS.magistrate]: 2,
  [BOSS_DEF_IDS.director]: 3,
  [BOSS_DEF_IDS.matron]: 4,
};

// ─────────────────────────────────────────────────────────────────────────
// Character builders — match the presets used in sim-class-tour-late.ts so
// the per-cell numbers are directly comparable.
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

function isBossEncounter(state: CombatState): boolean {
  return state.combatants.some(
    (c) => c.kind === 'monster' && CHAPTER_OF_BOSS[c.instance.defId] !== undefined,
  );
}

function findPotionIdx(c: Character): number {
  return c.inventory.findIndex((ref) => ref.itemId === 'potion-of-healing');
}

// ─────────────────────────────────────────────────────────────────────────
// Per-class turn AIs (transplanted from sim-class-tour-late.ts with minor
// pure-fn refactoring to keep this file standalone).
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
      stats.cunningUses += 1;
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
        if (state.lastAttack.hit) stats.hits += 1;
        if (state.lastAttack.crit) stats.crits += 1;
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
      stats.slot2Used += 1;
      stats.mistyStepCasts += 1;
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
        stats.spellDamage += dealt;
        state = r.state;
        character = r.character;
        stats.slot1Used += 1;
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
        stats.spellDamage += dealt;
        state = r.state;
        character = r.character;
        stats.slot1Used += 1;
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

// ─────────────────────────────────────────────────────────────────────────
// Combat driver
// ─────────────────────────────────────────────────────────────────────────

interface RunStats {
  classId: ClassId;
  startLevel: number;
  variant: Variant;
  // per-life accumulators (reset each life by re-allocating)
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
  shieldReactions: number;       // Wizard only — counted by detecting shieldActive change
  chaptersClearedTotal: number;
  // bosses
  bossesReached: Record<string, number>;
  bossesKilled: Record<string, number>;
  bossesDiedTo: Record<string, number>;
  bossDeathLastLife: string | null;
  // life outcomes
  lifeOutcomes: Array<{
    life: number;
    cleared: boolean;
    finalRoomIdx: number;
    finalChapter: number;
    finalLevel: number;
    deathCause: string | null;
  }>;
  deathsByRoom: Record<string, number>;
}

function emptyStats(classId: ClassId, startLevel: number, variant: Variant): RunStats {
  return {
    classId,
    startLevel,
    variant,
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
    shieldReactions: 0,
    chaptersClearedTotal: 0,
    bossesReached: {},
    bossesKilled: {},
    bossesDiedTo: {},
    bossDeathLastLife: null,
    lifeOutcomes: [],
    deathsByRoom: {},
  };
}

function roomChapter(idx: number): number {
  // GodwakeDelve room layout: rooms 0..9 = Ch1 (incl. Ilyich), camp@10,
  // 11..18 = Ch2 (incl. Magistrate), camp@19, 20..27 = Ch3 (incl. Director),
  // camp@28, 29..36 = Ch4 (incl. Matron).
  if (idx <= 9) return 1;
  if (idx === 10) return 1;          // camp after Ch1
  if (idx <= 18) return 2;
  if (idx === 19) return 2;          // camp after Ch2
  if (idx <= 27) return 3;
  if (idx === 28) return 3;          // camp after Ch3
  return 4;
}

function runCombat(
  roller: DiceRoller,
  classId: ClassId,
  characterIn: Character,
  room: RoomSpec,
  variant: Variant,
  stats: RunStats,
): { character: Character; victory: boolean; defIds: string[]; roundCount: number } {
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
  let shieldActiveLast = character.resources.shieldActive === true;

  while (state.status === 'active' && turnsTaken < MAX_TURNS_PER_FIGHT * 4) {
    if (isPlayerTurn(state)) {
      const hpBefore = character.hp.current;
      const turn = playerTurn(classId, { roller, state, character, stats });
      state = turn.state;
      character = turn.character;
      if (character.hp.current < hpBefore) stats.damageTaken += hpBefore - character.hp.current;
    } else {
      // Control variants: suppress class reactions by pre-burning reactionUsed
      // before the monster swing. Mirrors the no-uncanny-dodge pattern from
      // sim-class-tour-late.ts.
      const supressUd =
        variant === 'rogue-no-uncanny-dodge' && classId === 'rogue' && character.level >= 5;
      const suppressShield = variant === 'wizard-no-shield' && classId === 'wizard';
      if (supressUd || suppressShield) {
        character = patchActionEconomy(character, { reactionUsed: true });
      }
      const hpBefore = character.hp.current;
      const shieldBefore = character.resources.shieldActive === true;
      const r = monsterAttack(
        { roller, character, state },
        state.initiativeOrder[state.currentTurnIndex],
      );
      state = r.state;
      character = r.character;
      if (character.hp.current < hpBefore) stats.damageTaken += hpBefore - character.hp.current;
      // Detect a Shield reaction firing on this swing.
      if (!shieldBefore && character.resources.shieldActive === true) {
        stats.shieldReactions += 1;
      }
      shieldActiveLast = character.resources.shieldActive === true;
      if (state.status === 'active') {
        const ended = endTurn(state, character);
        state = ended.state;
        character = ended.character;
      }
    }
    turnsTaken += 1;
  }
  void shieldActiveLast;

  const rounds = Math.max(1, state.round - startRound + 1);
  stats.combatRoundsTotal += rounds;
  stats.encountersFoughtTotal += 1;
  const victory = state.status === 'player-victory';
  if (victory) {
    stats.encountersWonTotal += 1;
    stats.goldAccumulated += rollRoomGoldDrops(roller, defIds);
  }
  return { character, victory, defIds, roundCount: rounds };
}

function liveOneAttempt(
  roller: DiceRoller,
  classId: ClassId,
  startLevel: number,
  variant: Variant,
  stats: RunStats,
  lifeIdx: number,
): { cleared: boolean; finalRoomIdx: number; finalChapter: number; finalLevel: number; deathCause: string | null } {
  let character = freshCharacter(classId, startLevel);
  const delveSeed = ((roller.roll('1d100').total * 2654435761) ^ (lifeIdx * 7919) ^ classId.charCodeAt(0)) >>> 0;
  const delve = createGodwakeDelve({ seed: delveSeed });
  let lastChapterAdvanced = 0;
  let finalRoomIdx = 0;
  let deathCause: string | null = null;

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
      if (chapter > lastChapterAdvanced) {
        // Crossed a camp seam == cleared the chapter behind it.
        stats.chaptersClearedTotal += 1;
        lastChapterAdvanced = chapter;
      }
      continue;
    }
    if (room.kind === 'shrine' || room.kind === 'event') {
      // bare-soul: no blessing / event outcome
      continue;
    }

    const isBoss = room.kind === 'boss';
    let bossDefId: string | null = null;
    if (isBoss) {
      bossDefId = room.monsters?.[0]?.defId ?? null;
      if (bossDefId) {
        stats.bossesReached[bossDefId] = (stats.bossesReached[bossDefId] ?? 0) + 1;
      }
    }

    const result = runCombat(roller, classId, character, room, variant, stats);
    character = result.character;

    if (!result.victory) {
      stats.deathsByRoom[room.id] = (stats.deathsByRoom[room.id] ?? 0) + 1;
      if (isBoss && bossDefId) {
        stats.bossesDiedTo[bossDefId] = (stats.bossesDiedTo[bossDefId] ?? 0) + 1;
        stats.bossDeathLastLife = bossDefId;
        deathCause = bossDefId;
      } else {
        const living = result.defIds.find(
          (id) => true === !!id,
        );
        deathCause = living ?? room.id;
      }
      return {
        cleared: false,
        finalRoomIdx,
        finalChapter: chapter,
        finalLevel: character.level,
        deathCause,
      };
    }

    if (isBoss && bossDefId) {
      stats.bossesKilled[bossDefId] = (stats.bossesKilled[bossDefId] ?? 0) + 1;
    }

    // XP gain — combats include xpReward; boss xpReward is on the room itself.
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
    deathCause: null,
  };
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
      setActiveRoller(seed);
      const outcome = liveOneAttempt(roller, classId, startLevel, variant, stats, life);
      stats.lifeOutcomes.push({
        life,
        cleared: outcome.cleared,
        finalRoomIdx: outcome.finalRoomIdx,
        finalChapter: outcome.finalChapter,
        finalLevel: outcome.finalLevel,
        deathCause: outcome.deathCause,
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

interface BossStat {
  reached: number;
  killed: number;
  diedTo: number;
}

interface Aggregate {
  classId: ClassId;
  startLevel: number;
  variant: Variant;
  runs: number;
  lives: number;
  livesUsedMean: number;
  runWinRate: number;
  lifeClearRate: number;          // % of lives that beat the whole chain
  lifeDeathRate: number;          // 1 - lifeClearRate (mirrors early-tour)
  meanChaptersPerLife: number;
  meanEncountersPerLife: number;
  encounterWinRate: number;
  meanRoundsPerCombat: number;
  meanDmgDealtPerLife: number;
  meanDmgTakenPerLife: number;
  meanHpHealedPerLife: number;
  meanGoldPerLife: number;
  hitRate: number;
  critRate: number;
  meanSneakPerLife: number;
  meanCunningPerLife: number;
  meanSecondWindPerLife: number;
  meanActionSurgePerLife: number;
  meanSlot1PerLife: number;
  meanSlot2PerLife: number;
  meanSlot3PerLife: number;
  meanMistyStepPerLife: number;
  cantripShareOfDamage: number;
  fireBoltHitRate: number;
  meanPotionsPerLife: number;
  meanShieldReactionsPerLife: number;
  bosses: Record<string, BossStat>;
  // Convenience extracts for the post/pre comparison.
  ilyichDeathRate: number;
  magistrateDeathRate: number;
  directorDeathRate: number;
  matronDeathRate: number;
  ilyichReachRate: number;
  magistrateReachRate: number;
  directorReachRate: number;
  matronReachRate: number;
  deathsByRoom: Record<string, number>;
}

function aggregate(cell: RunStats[]): Aggregate {
  const totalLives = cell.reduce((s, r) => s + r.lifeOutcomes.length, 0);
  const totalCombats = cell.reduce((s, r) => s + r.encountersFoughtTotal, 0);
  const totalRounds = cell.reduce((s, r) => s + r.combatRoundsTotal, 0);
  const totalAttacks = cell.reduce((s, r) => s + r.attacks, 0);
  const totalHits = cell.reduce((s, r) => s + r.hits, 0);
  const totalCrits = cell.reduce((s, r) => s + r.crits, 0);
  const totalCantrip = cell.reduce((s, r) => s + r.cantripDamage, 0);
  const totalSpell = cell.reduce((s, r) => s + r.spellDamage, 0);
  const totalFbHits = cell.reduce((s, r) => s + r.fireBoltHits, 0);
  const totalFbMiss = cell.reduce((s, r) => s + r.fireBoltMisses, 0);
  const totalEncWon = cell.reduce((s, r) => s + r.encountersWonTotal, 0);

  const sumPerLife = (sel: (s: RunStats) => number) =>
    totalLives === 0 ? 0 : cell.reduce((s, r) => s + sel(r), 0) / totalLives;

  const bosses: Record<string, BossStat> = {};
  for (const r of cell) {
    for (const [k, v] of Object.entries(r.bossesReached)) {
      const b = (bosses[k] ??= { reached: 0, killed: 0, diedTo: 0 });
      b.reached += v;
    }
    for (const [k, v] of Object.entries(r.bossesKilled)) {
      const b = (bosses[k] ??= { reached: 0, killed: 0, diedTo: 0 });
      b.killed += v;
    }
    for (const [k, v] of Object.entries(r.bossesDiedTo)) {
      const b = (bosses[k] ??= { reached: 0, killed: 0, diedTo: 0 });
      b.diedTo += v;
    }
  }

  const deathsByRoom: Record<string, number> = {};
  for (const r of cell) {
    for (const [k, v] of Object.entries(r.deathsByRoom)) {
      deathsByRoom[k] = (deathsByRoom[k] ?? 0) + v;
    }
  }

  const deadLives = cell.reduce(
    (s, r) => s + r.lifeOutcomes.filter((l) => !l.cleared).length,
    0,
  );
  const clearedLives = totalLives - deadLives;
  const runsCleared = cell.filter((r) => r.lifeOutcomes.some((l) => l.cleared)).length;

  function deathRateAtBoss(id: string): number {
    const b = bosses[id];
    if (!b || b.reached === 0) return 0;
    return b.diedTo / b.reached;
  }
  function reachRate(id: string): number {
    const b = bosses[id];
    if (!b) return 0;
    return b.reached / totalLives;
  }

  return {
    classId: cell[0].classId,
    startLevel: cell[0].startLevel,
    variant: cell[0].variant,
    runs: cell.length,
    lives: totalLives,
    livesUsedMean: cell.reduce((s, r) => s + r.lifeOutcomes.length, 0) / Math.max(1, cell.length),
    runWinRate: runsCleared / Math.max(1, cell.length),
    lifeClearRate: totalLives === 0 ? 0 : clearedLives / totalLives,
    lifeDeathRate: totalLives === 0 ? 0 : deadLives / totalLives,
    meanChaptersPerLife: sumPerLife((s) => s.chaptersClearedTotal),
    meanEncountersPerLife: sumPerLife((s) => s.encountersWonTotal),
    encounterWinRate: totalCombats === 0 ? 0 : totalEncWon / totalCombats,
    meanRoundsPerCombat: totalCombats === 0 ? 0 : totalRounds / totalCombats,
    meanDmgDealtPerLife: sumPerLife((s) => s.damageDealt),
    meanDmgTakenPerLife: sumPerLife((s) => s.damageTaken),
    meanHpHealedPerLife: sumPerLife((s) => s.hpHealed),
    meanGoldPerLife: sumPerLife((s) => s.goldAccumulated),
    hitRate: totalAttacks === 0 ? 0 : totalHits / totalAttacks,
    critRate: totalAttacks === 0 ? 0 : totalCrits / totalAttacks,
    meanSneakPerLife: sumPerLife((s) => s.sneakAttacks),
    meanCunningPerLife: sumPerLife((s) => s.cunningUses),
    meanSecondWindPerLife: sumPerLife((s) => s.secondWindUses),
    meanActionSurgePerLife: sumPerLife((s) => s.actionSurgeUses),
    meanSlot1PerLife: sumPerLife((s) => s.slot1Used),
    meanSlot2PerLife: sumPerLife((s) => s.slot2Used),
    meanSlot3PerLife: sumPerLife((s) => s.slot3Used),
    meanMistyStepPerLife: sumPerLife((s) => s.mistyStepCasts),
    cantripShareOfDamage:
      totalCantrip + totalSpell > 0 ? totalCantrip / (totalCantrip + totalSpell) : 0,
    fireBoltHitRate: totalFbHits + totalFbMiss > 0 ? totalFbHits / (totalFbHits + totalFbMiss) : 0,
    meanPotionsPerLife: sumPerLife((s) => s.potionsUsed),
    meanShieldReactionsPerLife: sumPerLife((s) => s.shieldReactions),
    bosses,
    ilyichDeathRate: deathRateAtBoss(BOSS_DEF_IDS.ilyich),
    magistrateDeathRate: deathRateAtBoss(BOSS_DEF_IDS.magistrate),
    directorDeathRate: deathRateAtBoss(BOSS_DEF_IDS.director),
    matronDeathRate: deathRateAtBoss(BOSS_DEF_IDS.matron),
    ilyichReachRate: reachRate(BOSS_DEF_IDS.ilyich),
    magistrateReachRate: reachRate(BOSS_DEF_IDS.magistrate),
    directorReachRate: reachRate(BOSS_DEF_IDS.director),
    matronReachRate: reachRate(BOSS_DEF_IDS.matron),
    deathsByRoom,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => n.toFixed(d);

function renderHeadlineTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Class | L | Variant | Runs | Lives | Death% | RunClear% | Lives used | Chapters/life | EncWin% | TTK rds | Dmg dealt | Dmg taken | HP healed | Gold |',
  );
  lines.push(
    '|------|--:|--------|----:|-----:|------:|---------:|-----------:|-------------:|--------:|------:|---------:|---------:|---------:|----:|',
  );
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${a.startLevel} | ${a.variant} | ${a.runs} | ${a.lives} | ${pct(a.lifeDeathRate)} | ${pct(a.runWinRate)} | ${num(a.livesUsedMean)} | ${num(a.meanChaptersPerLife)} | ${pct(a.encounterWinRate)} | ${num(a.meanRoundsPerCombat)} | ${num(a.meanDmgDealtPerLife, 0)} | ${num(a.meanDmgTakenPerLife, 0)} | ${num(a.meanHpHealedPerLife, 0)} | ${num(a.meanGoldPerLife, 0)} |`,
    );
  }
  return lines.join('\n');
}

function renderBossTable(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Class | L | Variant | Ilyich reach / kill / death% | Magistrate r/k/d% | Director r/k/d% | Matron r/k/d% |',
  );
  lines.push('|------|--:|--------|--------------------------:|------------------:|---------------:|--------------:|');
  for (const a of aggs) {
    const fmt = (b?: BossStat, total = a.lives) => {
      if (!b || b.reached === 0)
        return `${(0).toFixed(0)} / ${(0).toFixed(0)} / —`;
      const dr = b.diedTo / b.reached;
      return `${b.reached}/${total} / ${b.killed}/${b.reached} / ${pct(dr)}`;
    };
    lines.push(
      `| ${a.classId} | ${a.startLevel} | ${a.variant} | ${fmt(a.bosses[BOSS_DEF_IDS.ilyich])} | ${fmt(a.bosses[BOSS_DEF_IDS.magistrate])} | ${fmt(a.bosses[BOSS_DEF_IDS.director])} | ${fmt(a.bosses[BOSS_DEF_IDS.matron])} |`,
    );
  }
  return lines.join('\n');
}

function renderClassDetail(aggs: Aggregate[]): string {
  const lines: string[] = [];
  lines.push(
    '| Class | L | Variant | Hit% | Crit% | Sneak/life | Cunning/life | SW/life | AS/life | Slot1/life | Slot2/life | Slot3/life | Misty/life | Shield/life | Cantrip share | FB hit% | Potions/life |',
  );
  lines.push(
    '|------|--:|--------|----:|-----:|----------:|------------:|--------:|--------:|----------:|----------:|----------:|----------:|------------:|--------------:|-------:|------------:|',
  );
  for (const a of aggs) {
    lines.push(
      `| ${a.classId} | ${a.startLevel} | ${a.variant} | ${pct(a.hitRate)} | ${pct(a.critRate)} | ${num(a.meanSneakPerLife)} | ${num(a.meanCunningPerLife)} | ${num(a.meanSecondWindPerLife)} | ${num(a.meanActionSurgePerLife)} | ${num(a.meanSlot1PerLife)} | ${num(a.meanSlot2PerLife)} | ${num(a.meanSlot3PerLife)} | ${num(a.meanMistyStepPerLife)} | ${num(a.meanShieldReactionsPerLife)} | ${pct(a.cantripShareOfDamage)} | ${pct(a.fireBoltHitRate)} | ${num(a.meanPotionsPerLife)} |`,
    );
  }
  return lines.join('\n');
}

function renderTopDeathRooms(aggs: Aggregate[]): string {
  const lines: string[] = [];
  for (const a of aggs) {
    const top = Object.entries(a.deathsByRoom)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 6)
      .map(([k, v]) => `${k}(${v})`)
      .join(', ');
    lines.push(`- **${a.classId} L${a.startLevel} ${a.variant}** — ${top || '—'}`);
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

function main(): void {
  const tWall0 = Date.now();
  console.log(
    `Full-matrix sweep — ${MATRIX.length} cells × ${RUNS_PER_CELL} runs/cell × ${LIVES_PER_RUN} lives\n`,
  );

  const aggs: Aggregate[] = [];
  for (const spec of MATRIX) {
    const t0 = Date.now();
    const cell = runMatrixCell(spec.classId, spec.startLevel, spec.variant, RUNS_PER_CELL, SEED_BASE);
    const agg = aggregate(cell);
    aggs.push(agg);
    const dt = Date.now() - t0;
    console.log(
      `${spec.classId.padEnd(7)} L${spec.startLevel} ${spec.variant.padEnd(24)} → death ${pct(agg.lifeDeathRate).padStart(6)}  runClr ${pct(agg.runWinRate).padStart(6)}  ch/life ${num(agg.meanChaptersPerLife)}  Ily/Mag/Dir/Mat d% ${pct(agg.ilyichDeathRate)}/${pct(agg.magistrateDeathRate)}/${pct(agg.directorDeathRate)}/${pct(agg.matronDeathRate)}  ${dt}ms`,
    );
  }

  const dtTotal = ((Date.now() - tWall0) / 1000).toFixed(1);
  const doc = renderRawDoc(aggs, dtTotal);
  const outPath = resolve(process.cwd(), 'docs/validation-findings/full-matrix.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote raw matrix → ${outPath}  (${dtTotal}s wall)`);
}

function renderRawDoc(aggs: Aggregate[], wallSec: string): string {
  return `# Full-matrix sweep — raw output

> Auto-generated by \`scripts/sim-full-matrix.ts\`. Re-run with
> \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-full-matrix.ts\`.
> Curated analysis with pre/post comparison lives in
> [\`full-matrix.md\`](./full-matrix.md).

**Cells:** ${aggs.length}.
**Runs / cell:** ${RUNS_PER_CELL}.
**Lives / run:** ${LIVES_PER_RUN}.
**Total lives simulated:** ${aggs.reduce((s, a) => s + a.lives, 0)}.
**Wall clock:** ${wallSec}s.
**Scope:** full \`createGodwakeDelve\` (Ch1 → Ch4, 37 rooms). Bare-soul:
shrines + events skipped; rest rooms heal 70 % HP; camps = long rest. XP
propagates through the chain so a soul that clears Ch1 can level up before
Ch2 (matches real-player progression).

## Headline matrix

${renderHeadlineTable(aggs)}

## Per-boss reach / kill / death-rate

\`reach\` = lives that arrived at the boss / total lives.
\`kill\` = lives that killed the boss / lives that reached.
\`death%\` = lives that *died to* the boss / lives that reached.

${renderBossTable(aggs)}

## Class-specific signals

${renderClassDetail(aggs)}

## Top death rooms per cell

${renderTopDeathRooms(aggs)}
`;
}

main();
