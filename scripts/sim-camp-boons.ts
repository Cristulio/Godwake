/**
 * Camp-boons validation sim.
 *
 * For each (class × camp tier × boon) cell, we drop a character at the
 * camp under test — fresh, long-rested, levelled to the tier's start
 * level — apply the boon (or no boon for the control), and walk the
 * chapter that follows. We record death rate, damage taken, HP healed,
 * stabilise-charge consumption, and boss-clear rate for the chapter
 * after the camp, and compute a survivability LIFT vs the no-boon
 * control at the same (class, tier).
 *
 *   Start levels — match where a live player typically is at that camp:
 *     Camp 1 → L1   (just cleared Ilyich, has not levelled yet)
 *     Camp 2 → L3   (post-Magistrate)
 *     Camp 3 → L5   (post-Asylum-Director)
 *
 *   Flags:
 *     dominant   lift > +25 pp  (always pick → too good → nerf candidate)
 *     dud        lift <  +5 pp  (never worth taking → buff candidate)
 *     goldilocks +10..+20 pp    (real choice → ship as-is)
 *
 * Run:  RUNS_PER_CELL=150 npx tsx scripts/sim-camp-boons.ts
 *
 * Writes Markdown to docs/validation-findings/camp-boons.md.
 *
 * Caveats:
 *   - Sim skips events / shrines / blessings (deterministic bare-soul floor,
 *     same convention as sim-class-tour-early). Boon comparisons are still
 *     valid because the control uses the same skip policy.
 *   - "Eyes of the Lich" reveals boss stats to the *player*. The sim AI
 *     doesn't change behaviour from the reveal, so its measured lift is
 *     expected to be ~0 by construction. We flag it as informational and
 *     defer the verdict to human playtest.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createCharacter, STANDARD_ARRAY } from '../src/engine/character/initialize';
import { applyLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
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
import { getCampBoon, type CampBoonTier } from '../src/content/campBoons';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';
import type { ClassId, RaceId } from '../src/schemas/ids';

// ─── Knobs ──────────────────────────────────────────────────────────────

const RUNS_PER_CELL = Number(process.env.RUNS_PER_CELL ?? 150);
const MAX_TURNS_PER_FIGHT = 200;

// Godwake delve room indices (zero-based) for camps. The chapter that
// FOLLOWS each camp is the chapter we sim.
//   Camp 1 (room 10) → Chapter 2 = rooms 11..18 (Magistrate at 18)
//   Camp 2 (room 19) → Chapter 3 = rooms 20..27 (Asylum Director at 27)
//   Camp 3 (room 28) → Chapter 4 = rooms 29..36 (Matron Mother at 36)
const CAMP_ROOM_IDX: Record<CampBoonTier, number> = { 1: 10, 2: 19, 3: 28 };

// Start-level per tier. The brief gives L1/L3/L5 but a live player at the
// camp has already absorbed the chapter-boss XP (Ilyich 250, Magistrate 700,
// Director 1100), pushing them up one level. We follow live state: L2 / L4 / L6.
const START_LEVEL: Record<CampBoonTier, number> = { 1: 2, 2: 4, 3: 6 };

// Potion count per start-level — roughly what a live player carries.
const POTION_COUNT: Record<number, number> = { 2: 2, 4: 3, 6: 4 };

// ─── Classes & builders ─────────────────────────────────────────────────

type SimClassId = Extract<ClassId, 'rogue' | 'fighter' | 'wizard'>;

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
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
}

const BUILDERS: Record<SimClassId, () => Character> = {
  rogue: buildRogue,
  fighter: buildFighter,
  wizard: buildWizard,
};

function freshCharacter(classId: SimClassId, level: number): Character {
  let c = BUILDERS[classId]();
  // Level up to the start level by stamping XP and applying levels one by one.
  while (c.level < level) {
    c = applyLevelUp({ ...c, xp: 9_999_999 });
  }
  // Top up potion inventory to match what a player at this level usually has.
  const potions = POTION_COUNT[level] ?? 2;
  c = {
    ...c,
    inventory: [
      ...c.inventory,
      ...Array.from({ length: potions }, () => ({ itemId: 'potion-of-healing' })),
    ],
  };
  return longRest(c);
}

// ─── Boon application (mirrors delveStore.pickCampBoon) ─────────────────

function applyBoonAtCamp(character: Character, boonId: string | null): Character {
  if (boonId === null) return character;
  const boon = getCampBoon(boonId);
  let next: Character = {
    ...character,
    campBoons: [...(character.campBoons ?? []), boonId],
  };
  if (boon.id === 'vigor-of-the-road') {
    const bump = Math.max(1, Math.floor(next.hp.max * 0.05));
    next = { ...next, hp: { ...next.hp, max: next.hp.max + bump, current: next.hp.current + bump } };
  } else if (boon.id === 'mantle-of-the-slain') {
    const bump = next.level;
    next = { ...next, hp: { ...next.hp, max: next.hp.max + bump, current: next.hp.current + bump } };
  } else if (boon.id === 'patience-of-ilmater') {
    next = { ...next, delveStabiliseBonus: (next.delveStabiliseBonus ?? 0) + 1 };
  }
  // eyes-of-the-lich is informational only — see header caveat.
  return next;
}

// ─── Combat AI (lifted verbatim from sim-class-tour-early) ──────────────

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
  metrics: RunMetrics;
}

function maybeUsePotion(ctx: TurnCtx): TurnCtx {
  const { character, roller, state, metrics } = ctx;
  if (character.hp.current > character.hp.max * 0.3) return ctx;
  if (character.actionEconomy.actionUsed) return ctx;
  const idx = potionIdx(character);
  if (idx < 0) return ctx;
  const before = character.hp.current;
  const r = useConsumable({ roller, character, state }, idx);
  if (metrics.afterCamp) {
    metrics.hpHealedAfterCamp += r.character.hp.current - before;
    metrics.potionsUsedAfterCamp += 1;
  }
  return { ...ctx, state: r.state, character: r.character };
}

function rogueTurn(ctx: TurnCtx): TurnCtx {
  ctx = maybeUsePotion(ctx);
  let { roller, state, character, metrics } = ctx;
  const cunningLeft = character.resources.cunningActionUsesRemaining ?? 0;
  if (
    !character.actionEconomy.bonusActionUsed &&
    cunningLeft > 0 &&
    liveMonsters(state).length > 0
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
  const weaponId = character.equipped.mainHand?.itemId ?? 'dagger';
  for (let i = 0; i < 3; i++) {
    if (state.status !== 'active') break;
    if (liveMonsters(state).length === 0) break;
    if (character.actionEconomy.actionUsed && !character.bonusAttackAvailable) break;
    const tid = lowestHpId(state);
    if (!tid) break;
    const r = playerAttack({ roller, character, state }, tid, weaponId);
    state = r.state;
    character = r.character;
  }
  return { roller, state, character, metrics };
}

function fighterTurn(ctx: TurnCtx): TurnCtx {
  let { roller, state, character, metrics } = ctx;
  if (
    character.hp.current <= character.hp.max * 0.3 &&
    !character.actionEconomy.actionUsed &&
    potionIdx(character) >= 0
  ) {
    const idx = potionIdx(character);
    const before = character.hp.current;
    const r = useConsumable({ roller, character, state }, idx);
    if (metrics.afterCamp) {
      metrics.hpHealedAfterCamp += r.character.hp.current - before;
      metrics.potionsUsedAfterCamp += 1;
    }
    state = r.state;
    character = r.character;
  } else if (
    character.hp.current <= character.hp.max * 0.5 &&
    character.resources.secondWindAvailable === true &&
    !character.actionEconomy.bonusActionUsed
  ) {
    const before = character.hp.current;
    const r = useSecondWind({ roller, character, state });
    if (metrics.afterCamp && r.character.hp.current > before) {
      metrics.hpHealedAfterCamp += r.character.hp.current - before;
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
      const r = playerAttack({ roller, character, state }, tid, weaponId);
      state = r.state;
      character = r.character;
    }
    if (
      pass === 0 &&
      state.status === 'active' &&
      liveMonsters(state).length > 0 &&
      (character.resources.actionSurgeRemaining ?? 0) > 0 &&
      character.actionEconomy.actionUsed
    ) {
      const hurt = character.hp.current <= character.hp.max * 0.7;
      if (liveMonsters(state).length >= 2 || hurt) {
        const r = useActionSurge({ character, state });
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
    if (metrics.afterCamp) {
      metrics.hpHealedAfterCamp += r.character.hp.current - before;
      metrics.potionsUsedAfterCamp += 1;
    }
    state = r.state;
    character = r.character;
  }
  if (character.actionEconomy.actionUsed) return { roller, state, character, metrics };
  const enemyCount = liveMonsters(state).length;
  if (enemyCount === 0) return { roller, state, character, metrics };
  const target = lowestHpId(state);

  let cast = false;
  if (enemyCount >= 3 && wizardKnowsSpell(character, 'fireball') && slotsAt(character, 3) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'fireball', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; }
  } else if (enemyCount >= 3 && wizardKnowsSpell(character, 'lightning-bolt') && slotsAt(character, 3) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'lightning-bolt', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; }
  } else if (enemyCount >= 2 && wizardKnowsSpell(character, 'burning-hands') && slotsAt(character, 1) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'burning-hands', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; }
  } else if (wizardKnowsSpell(character, 'magic-missile') && slotsAt(character, 1) > 0) {
    const r = castSpell({ roller, character, state, spellId: 'magic-missile', targetId: target });
    if (r.cast) { state = r.state; character = r.character; cast = true; }
  }
  if (!cast) {
    const r = castSpell({ roller, character, state, spellId: 'fire-bolt', targetId: target });
    if (r.cast) { state = r.state; character = r.character; }
  }
  return { roller, state, character, metrics };
}

function takeTurn(ctx: TurnCtx): TurnCtx {
  switch (ctx.character.classId) {
    case 'rogue': return rogueTurn(ctx);
    case 'fighter': return fighterTurn(ctx);
    case 'wizard': return wizardTurn(ctx);
    default: return ctx;
  }
}

// ─── Encounter runner ───────────────────────────────────────────────────

interface EncounterResult {
  character: Character;
  died: boolean;
}

function runEncounter(
  roller: DiceRoller,
  character: Character,
  room: RoomSpec,
  metrics: RunMetrics,
): EncounterResult {
  const monsterDefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def }));
  });
  const init = createCombat({ roller, character, monsters: monsterDefs });
  let s: CombatState = init.state;
  let ch: Character = init.character;

  let safety = 0;
  while (s.status === 'active' && safety < MAX_TURNS_PER_FIGHT * 8) {
    safety += 1;
    const cur = s.turnOrder[s.currentTurnIndex];
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
      if (after < before && metrics.afterCamp) {
        metrics.damageTakenAfterCamp += before - after;
      }
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }

  const died = s.status === 'player-defeat' || ch.hp.current <= 0;
  if (!died) {
    ch = {
      ...ch,
      nextAttackAdvantage: false,
      bonusAttackAvailable: false,
      poisonImmuneEncounter: false,
      incomingDamageReduction: 0,
    };
  }
  return { character: ch, died };
}

// ─── Run-level metrics ──────────────────────────────────────────────────

interface RunMetrics {
  classId: SimClassId;
  tierUnderTest: CampBoonTier;
  boonId: string | null;
  reachedCamp: boolean;
  diedRoomIdx: number | null;
  diedChapter: number | null;
  clearedDelve: boolean;
  bossClearAfterCamp: Record<number, boolean>; // per-boss after the test camp
  bossAttempted: Record<number, boolean>;
  afterCamp: boolean; // flips true once we walk past the boon camp
  hpHealedAfterCamp: number;
  damageTakenAfterCamp: number;
  potionsUsedAfterCamp: number;
  stabilisesUsedAfterCamp: number;
  finalLevel: number;
}

function newMetrics(
  classId: SimClassId,
  tier: CampBoonTier,
  boonId: string | null,
): RunMetrics {
  return {
    classId,
    tierUnderTest: tier,
    boonId,
    reachedCamp: false,
    diedRoomIdx: null,
    diedChapter: null,
    clearedDelve: false,
    bossClearAfterCamp: {},
    bossAttempted: {},
    afterCamp: false,
    hpHealedAfterCamp: 0,
    damageTakenAfterCamp: 0,
    potionsUsedAfterCamp: 0,
    stabilisesUsedAfterCamp: 0,
    finalLevel: 1,
  };
}

function chapterOfRoom(idx: number): number {
  if (idx <= 9) return 1;
  if (idx <= 18) return 2;
  if (idx <= 27) return 3;
  return 4;
}

function runOne(
  classId: SimClassId,
  tier: CampBoonTier,
  boonId: string | null,
  seed: number,
): RunMetrics {
  const m = newMetrics(classId, tier, boonId);
  const roller = createDiceRoller(seed);
  setActiveRoller(seed);
  const delve = createGodwakeDelve({ seed });
  const campIdx = CAMP_ROOM_IDX[tier];
  const startLevel = START_LEVEL[tier];

  // Drop char at the camp under test, long-rested at the tier's start level.
  let character = freshCharacter(classId, startLevel);
  character = applyBoonAtCamp(character, boonId);

  m.afterCamp = true;
  m.reachedCamp = true;
  let stabBefore = character.delveBudgets?.stabilisesUsed ?? 0;

  // Walk the chapter that follows the camp. The chapter ends at the next
  // boss room (inclusive). Skipped rooms: shrines / events (sim doesn't
  // model choice). Rest rooms heal as usual.
  for (let i = campIdx + 1; i < delve.rooms.length; i++) {
    const room = delve.rooms[i];
    if (room.kind === 'combat' || room.kind === 'boss') {
      const result = runEncounter(roller, character, room, m);
      character = result.character;

      const stabAfter = character.delveBudgets?.stabilisesUsed ?? 0;
      m.stabilisesUsedAfterCamp += stabAfter - stabBefore;
      stabBefore = stabAfter;

      if (result.died) {
        m.diedRoomIdx = i;
        m.diedChapter = chapterOfRoom(i);
        m.finalLevel = character.level;
        if (room.kind === 'boss') {
          m.bossAttempted[chapterOfRoom(i)] = true;
          m.bossClearAfterCamp[chapterOfRoom(i)] = false;
        }
        return m;
      }
      if (room.kind === 'boss') {
        m.bossAttempted[chapterOfRoom(i)] = true;
        m.bossClearAfterCamp[chapterOfRoom(i)] = true;
        // The boon is meant to land us at the next-chapter boss. Stop the
        // sim at the boss kill so the chapter-after-camp win/loss is the
        // clean unit of measurement.
        m.clearedDelve = true;
        m.finalLevel = character.level;
        return m;
      }

      const xp = room.xpReward ?? 0;
      if (xp > 0) {
        let nextCh = { ...character, xp: character.xp + xp };
        while (canLevelUp(nextCh)) nextCh = applyLevelUp(nextCh);
        character = nextCh;
      }
      const gold = room.goldReward ?? 0;
      if (gold > 0) character = { ...character, goldInPocket: character.goldInPocket + gold };
    } else if (room.kind === 'rest') {
      const heal = Math.floor(character.hp.max * 0.7);
      character = shortRestHeal(character, heal);
    } else if (room.kind === 'camp') {
      // Downstream camps inside the walked window: ignore (sim's chapter
      // boundary is the boss kill above, so this branch is unreachable
      // for the next-chapter-only walk). Kept for safety.
      character = longRest(character);
    }
    // shrine / event → skip.
  }
  m.clearedDelve = true;
  m.finalLevel = character.level;
  return m;
}

function canLevelUp(c: Character): boolean {
  const next = c.level + 1;
  if (next > MAX_LEVEL) return false;
  return c.xp >= xpForLevel(next);
}

// ─── Aggregation ────────────────────────────────────────────────────────

interface CellSummary {
  classId: SimClassId;
  tier: CampBoonTier;
  boonId: string | null;
  boonName: string;
  runs: number;
  reachedCamp: number;
  reachedCampRate: number;
  // Of runs that reached the camp:
  deathsAfterCamp: number;
  deathRateAfterCamp: number;
  meanDmgTakenAfterCamp: number;
  meanHpHealedAfterCamp: number;
  meanPotionsAfterCamp: number;
  meanStabilisesAfterCamp: number;
  // Of runs that reached the boss for chapter (tier+1):
  bossAttempts: number;
  bossClears: number;
  bossClearRate: number;
  // Of runs that reached the camp:
  delveClearRate: number;
}

function summarize(cell: RunMetrics[]): CellSummary {
  const reached = cell.filter((m) => m.reachedCamp);
  const reachedN = reached.length;
  const deaths = reached.filter((m) => m.diedRoomIdx !== null).length;
  const cleared = reached.filter((m) => m.clearedDelve).length;
  const targetBossCh = (cell[0].tierUnderTest + 1) as 2 | 3 | 4;
  const bossAttempts = reached.filter((m) => m.bossAttempted[targetBossCh]).length;
  const bossClears = reached.filter((m) => m.bossClearAfterCamp[targetBossCh] === true).length;
  const sum = (sel: (m: RunMetrics) => number) =>
    reached.reduce((s, m) => s + sel(m), 0);
  const mean = (sel: (m: RunMetrics) => number) => (reachedN === 0 ? 0 : sum(sel) / reachedN);
  const boonName = cell[0].boonId ? getCampBoon(cell[0].boonId).name : '(no boon)';
  return {
    classId: cell[0].classId,
    tier: cell[0].tierUnderTest,
    boonId: cell[0].boonId,
    boonName,
    runs: cell.length,
    reachedCamp: reachedN,
    reachedCampRate: cell.length === 0 ? 0 : reachedN / cell.length,
    deathsAfterCamp: deaths,
    deathRateAfterCamp: reachedN === 0 ? 0 : deaths / reachedN,
    meanDmgTakenAfterCamp: mean((m) => m.damageTakenAfterCamp),
    meanHpHealedAfterCamp: mean((m) => m.hpHealedAfterCamp),
    meanPotionsAfterCamp: mean((m) => m.potionsUsedAfterCamp),
    meanStabilisesAfterCamp: mean((m) => m.stabilisesUsedAfterCamp),
    bossAttempts,
    bossClears,
    bossClearRate: bossAttempts === 0 ? 0 : bossClears / bossAttempts,
    delveClearRate: reachedN === 0 ? 0 : cleared / reachedN,
  };
}

// ─── Cells & runner ─────────────────────────────────────────────────────

interface CellSpec {
  classId: SimClassId;
  tier: CampBoonTier;
  boonId: string | null;
}

// Per-tier boon list, with class restriction (wizard sees Surge, others Might).
function boonsForCell(classId: SimClassId, tier: CampBoonTier): (string | null)[] {
  if (tier === 1) {
    return [null, 'vigor-of-the-road', 'eye-of-the-hawk', 'stillness-of-the-mind'];
  }
  if (tier === 2) {
    const middle = classId === 'wizard' ? 'surge-of-the-storm' : 'might-of-the-mountain';
    return [null, 'steel-of-the-brave', middle, 'patience-of-ilmater'];
  }
  return [null, 'mantle-of-the-slain', 'blade-of-the-vow', 'eyes-of-the-lich'];
}

function buildMatrix(): CellSpec[] {
  const out: CellSpec[] = [];
  const classes: SimClassId[] = ['rogue', 'fighter', 'wizard'];
  const tiers: CampBoonTier[] = [1, 2, 3];
  for (const cls of classes) {
    for (const t of tiers) {
      for (const boon of boonsForCell(cls, t)) {
        out.push({ classId: cls, tier: t, boonId: boon });
      }
    }
  }
  return out;
}

function classSeed(c: SimClassId): number {
  if (c === 'rogue') return 0xa11ce;
  if (c === 'fighter') return 0xb0b1e;
  return 0xc1e0;
}

function runCell(spec: CellSpec, baseSeed: number): CellSummary {
  const cell: RunMetrics[] = [];
  for (let i = 0; i < RUNS_PER_CELL; i++) {
    const seed =
      (baseSeed ^ classSeed(spec.classId) ^ (spec.tier * 1009) ^ (i * 7919) ^
        ((spec.boonId ? hash(spec.boonId) : 0) * 31)) >>>
      0;
    cell.push(runOne(spec.classId, spec.tier, spec.boonId, seed));
  }
  return summarize(cell);
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

// ─── Lift computation ───────────────────────────────────────────────────

interface BoonRow {
  classId: SimClassId;
  tier: CampBoonTier;
  boonId: string;
  boonName: string;
  controlDeathRate: number;
  boonDeathRate: number;
  liftPp: number;
  controlBossClear: number;
  boonBossClear: number;
  bossLiftPp: number;
  controlPotions: number;
  boonPotions: number;
  controlHpHealed: number;
  boonHpHealed: number;
  controlStabilises: number;
  boonStabilises: number;
  flag: 'dominant' | 'dud' | 'goldilocks' | 'mid';
}

function computeRows(summaries: CellSummary[]): BoonRow[] {
  const controls = new Map<string, CellSummary>();
  for (const s of summaries) {
    if (s.boonId === null) controls.set(`${s.classId}-${s.tier}`, s);
  }
  const rows: BoonRow[] = [];
  for (const s of summaries) {
    if (s.boonId === null) continue;
    const ctrl = controls.get(`${s.classId}-${s.tier}`);
    if (!ctrl) continue;
    const liftPp = (ctrl.deathRateAfterCamp - s.deathRateAfterCamp) * 100;
    const bossLiftPp = (s.bossClearRate - ctrl.bossClearRate) * 100;
    const flag: BoonRow['flag'] =
      liftPp > 25 ? 'dominant'
      : liftPp < 5 ? 'dud'
      : liftPp >= 10 ? 'goldilocks'
      : 'mid';
    rows.push({
      classId: s.classId,
      tier: s.tier,
      boonId: s.boonId,
      boonName: s.boonName,
      controlDeathRate: ctrl.deathRateAfterCamp,
      boonDeathRate: s.deathRateAfterCamp,
      liftPp,
      controlBossClear: ctrl.bossClearRate,
      boonBossClear: s.bossClearRate,
      bossLiftPp,
      controlPotions: ctrl.meanPotionsAfterCamp,
      boonPotions: s.meanPotionsAfterCamp,
      controlHpHealed: ctrl.meanHpHealedAfterCamp,
      boonHpHealed: s.meanHpHealedAfterCamp,
      controlStabilises: ctrl.meanStabilisesAfterCamp,
      boonStabilises: s.meanStabilisesAfterCamp,
      flag,
    });
  }
  return rows;
}

// ─── Rendering ──────────────────────────────────────────────────────────

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function num(n: number, d = 2): string { return n.toFixed(d); }
function pp(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}pp`;
}

function renderControlTable(summaries: CellSummary[]): string {
  const lines: string[] = [];
  lines.push('| Class | Camp | Runs | Reached camp | Death% (post-camp) | Boss-clear% (post-camp) | Delve clear% (post-camp) | Dmg taken | HP healed | Potions |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const s of summaries.filter((s) => s.boonId === null)) {
    lines.push(
      `| ${s.classId} | ${s.tier} | ${s.runs} | ${pct(s.reachedCampRate)} | ${pct(s.deathRateAfterCamp)} | ${pct(s.bossClearRate)} | ${pct(s.delveClearRate)} | ${num(s.meanDmgTakenAfterCamp, 0)} | ${num(s.meanHpHealedAfterCamp, 0)} | ${num(s.meanPotionsAfterCamp, 1)} |`,
    );
  }
  return lines.join('\n');
}

function renderBoonTable(rows: BoonRow[]): string {
  const lines: string[] = [];
  lines.push('| Class | Camp | Boon | Ctrl death% | Boon death% | Lift | Ctrl boss% | Boon boss% | Boss lift | Flag |');
  lines.push('|---|---:|---|---:|---:|---:|---:|---:|---:|---|');
  for (const r of rows) {
    lines.push(
      `| ${r.classId} | ${r.tier} | ${r.boonName} | ${pct(r.controlDeathRate)} | ${pct(r.boonDeathRate)} | ${pp(r.liftPp)} | ${pct(r.controlBossClear)} | ${pct(r.boonBossClear)} | ${pp(r.bossLiftPp)} | **${r.flag}** |`,
    );
  }
  return lines.join('\n');
}

function renderObservationTable(rows: BoonRow[]): string {
  const lines: string[] = [];
  lines.push('| Class | Camp | Boon | Ctrl potions | Boon potions | Ctrl heals | Boon heals | Ctrl stab | Boon stab |');
  lines.push('|---|---:|---|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) {
    lines.push(
      `| ${r.classId} | ${r.tier} | ${r.boonName} | ${num(r.controlPotions, 1)} | ${num(r.boonPotions, 1)} | ${num(r.controlHpHealed, 0)} | ${num(r.boonHpHealed, 0)} | ${num(r.controlStabilises, 2)} | ${num(r.boonStabilises, 2)} |`,
    );
  }
  return lines.join('\n');
}

function perBoonSummary(rows: BoonRow[]): string {
  // For each boon id, average lift across classes for its tier.
  const byBoon = new Map<string, BoonRow[]>();
  for (const r of rows) {
    const k = r.boonId;
    if (!byBoon.has(k)) byBoon.set(k, []);
    byBoon.get(k)!.push(r);
  }
  const lines: string[] = [];
  lines.push('| Boon | Tier | Cells | Mean lift | Min lift | Max lift | Verdict |');
  lines.push('|---|---:|---:|---:|---:|---:|---|');
  const entries = Array.from(byBoon.entries()).sort((a, b) => {
    const ta = a[1][0].tier, tb = b[1][0].tier;
    if (ta !== tb) return ta - tb;
    return a[0].localeCompare(b[0]);
  });
  for (const [boonId, list] of entries) {
    const lifts = list.map((r) => r.liftPp);
    const mean = lifts.reduce((a, b) => a + b, 0) / lifts.length;
    const min = Math.min(...lifts);
    const max = Math.max(...lifts);
    const verdict =
      mean > 25 ? '**dominant** — nerf candidate'
      : mean < 5 ? '**dud** — buff candidate'
      : mean >= 10 ? 'goldilocks (ship)'
      : 'mid (acceptable)';
    const name = getCampBoon(boonId).name;
    lines.push(`| ${name} | ${list[0].tier} | ${list.length} | ${pp(mean)} | ${pp(min)} | ${pp(max)} | ${verdict} |`);
  }
  return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────

function main(): void {
  const matrix = buildMatrix();
  console.log(`camp-boons sim — ${matrix.length} cells × ${RUNS_PER_CELL} runs/cell`);

  const baseSeed = 0xCAFEB00B >>> 0;
  const summaries: CellSummary[] = [];
  for (let i = 0; i < matrix.length; i++) {
    const spec = matrix[i];
    const t0 = Date.now();
    const s = runCell(spec, baseSeed);
    summaries.push(s);
    const dt = Date.now() - t0;
    const tag = spec.boonId ?? '(control)';
    console.log(
      `  [${i + 1}/${matrix.length}] ${spec.classId.padEnd(7)} camp ${spec.tier} ${tag.padEnd(24)} → reach ${pct(s.reachedCampRate)} death ${pct(s.deathRateAfterCamp)} (${dt}ms)`,
    );
  }

  const rows = computeRows(summaries);

  const doc = `# Camp boons — raw matrix

> Auto-generated by \`scripts/sim-camp-boons.ts\` (${RUNS_PER_CELL} runs/cell).
> Re-run with \`RUNS_PER_CELL=${RUNS_PER_CELL} npx tsx scripts/sim-camp-boons.ts\`.
> Curated analysis lives in [\`camp-boons.md\`](./camp-boons.md).
> Date: 2026-05-28.

## Setup

Fresh L1 ${'`rogue`/`fighter`/`wizard`'} walks the Godwake delve (Ch1 → Ch4)
${RUNS_PER_CELL} times per cell. At the camp under test we **apply the test
boon** (or no boon for the control); at all other camps we long-rest only.
Shrines / events / blessings skipped. Lift is computed only over runs that
**reached the camp under test**.

**Flags:**
- **dominant** → boon lift > +25 pp → always pick, nerf candidate
- **dud** → boon lift < +5 pp → never worth taking, buff candidate
- **goldilocks** → +10 to +20 pp → real choice → ship
- **mid** → +5 to +10 pp → acceptable but watch

## Per-boon survivability lift (death rate ↓ = good)

${renderBoonTable(rows)}

## Per-boon summary (averaged across classes)

${perBoonSummary(rows)}

## Auxiliary observations (post-camp)

${renderObservationTable(rows)}

## No-boon control (reference)

${renderControlTable(summaries)}

## Notes

- **Eyes of the Lich** — boon effect is informational (reveal the next boss's
  stat block). The sim AI doesn't read \`lichEyesAvailable\` so its measured
  lift is expected to land near zero. Player value comes from human
  decision-making (prepping spells / abilities for the encounter), which
  this sim doesn't model. Evaluate via playtest, not via lift.
- **Patience of Ilmater** — additional value is captured via "stabilises
  used" in the auxiliary observations table. If a class never falls to 0 HP
  enough times to consume the extra charge, the boon does no work for them
  even if the lift number is non-zero by noise.
- **Blade of the Vow** — single reroll per combat. Surfaces as a small dmg
  bump, mainly visible in long boss fights.
- **Surge of the Storm** — restricted to wizard cells at Camp 2.
`;

  const outPath = resolve(process.cwd(), 'docs/validation-findings/camp-boons-matrix.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote → ${outPath}`);

  // Stash machine-readable raw data alongside the doc for re-inspection.
  const raw = JSON.stringify({ summaries, rows, runsPerCell: RUNS_PER_CELL }, null, 2);
  writeFileSync(outPath.replace(/\.md$/, '.json'), raw, 'utf8');
}

main();
