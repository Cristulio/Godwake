/**
 * Wizard balance sim — runs Veyra (the Wizard preset) through a chained
 * Iron Cells → Athkatla → Spellhold → Ust Natha sequence, starting at a
 * fixed level. Tracks survivability + spell economy per run.
 *
 * Run:
 *   npx tsx scripts/sim-wizard.ts
 *
 * The script logs an aggregate per starting level. Each "run" is a fresh
 * Wizard at the matrix level walking the full chain until death or victory.
 * The decision policy is the same priority list for every level — letting
 * the sim isolate how slot access + cantrip floor scale.
 */
import { createCharacter, STANDARD_ARRAY } from '../src/engine/character/initialize';
import { applyLevelUp } from '../src/engine/character/leveling';
import { longRest, shortRestHeal } from '../src/engine/character/actions';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { castSpell, canCastSpell, slotsAt } from '../src/engine/combat/spells';
import { monsterAttack } from '../src/engine/combat/attack';
import { endTurn } from '../src/engine/combat/turn';
import { createDiceRoller, setActiveRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import {
  WARMUP_POOL as CH1_WARMUP,
  EARLY_MID_POOL as CH1_EM,
  MID_POOL as CH1_MID,
  ELITE_POOL as CH1_ELITE,
  type EncounterEntry,
} from '../src/engine/delve/chapter1Pools';
import {
  WARMUP_POOL as CH2_WARMUP,
  EARLY_MID_POOL as CH2_EM,
  MID_POOL as CH2_MID,
  ELITE_POOL as CH2_ELITE,
} from '../src/engine/delve/chapter2Pools';
import {
  WARMUP_POOL as CH3_WARMUP,
  MID_POOL as CH3_MID,
  ELITE_POOL as CH3_ELITE,
} from '../src/engine/delve/chapter3Pools';
import {
  WARMUP_POOL as CH4_WARMUP,
  EARLY_MID_POOL as CH4_EM,
  MID_POOL as CH4_MID,
  ELITE_POOL as CH4_ELITE,
} from '../src/engine/delve/chapter4Pools';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { Monster } from '../src/schemas/monster';

type Pool = EncounterEntry[];

interface ChapterPlan {
  name: string;
  rooms: Array<
    | { kind: 'combat'; pool: Pool }
    | { kind: 'boss'; monsterId: string }
    | { kind: 'rest' }
  >;
}

const PLAN: ChapterPlan[] = [
  {
    name: 'Iron Cells',
    rooms: [
      { kind: 'combat', pool: CH1_WARMUP },
      { kind: 'combat', pool: CH1_EM },
      { kind: 'rest' },
      { kind: 'combat', pool: CH1_MID },
      { kind: 'combat', pool: CH1_ELITE },
      { kind: 'boss', monsterId: 'duergar-ilyich' },
    ],
  },
  {
    name: 'Athkatla',
    rooms: [
      { kind: 'combat', pool: CH2_WARMUP },
      { kind: 'combat', pool: CH2_EM },
      { kind: 'rest' },
      { kind: 'combat', pool: CH2_MID },
      { kind: 'combat', pool: CH2_ELITE },
      { kind: 'boss', monsterId: 'athkatla-magistrate' },
    ],
  },
  {
    name: 'Spellhold',
    rooms: [
      { kind: 'combat', pool: CH3_WARMUP },
      { kind: 'combat', pool: CH3_MID },
      { kind: 'rest' },
      { kind: 'combat', pool: CH3_ELITE },
      { kind: 'boss', monsterId: 'asylum-director' },
    ],
  },
  {
    name: 'Ust Natha',
    rooms: [
      { kind: 'combat', pool: CH4_WARMUP },
      { kind: 'combat', pool: CH4_EM },
      { kind: 'rest' },
      { kind: 'combat', pool: CH4_MID },
      { kind: 'combat', pool: CH4_ELITE },
      { kind: 'boss', monsterId: 'drow-matron-mother' },
    ],
  },
];

function makeWizardAtLevel(level: number): Character {
  let w = createCharacter({
    id: 'sim-wizard',
    name: 'Veyra',
    raceId: 'tiefling',
    classId: 'wizard',
    baseAbilityScores: {
      str: 8,
      dex: STANDARD_ARRAY[3], // 12
      con: STANDARD_ARRAY[2], // 13
      int: STANDARD_ARRAY[0], // 15
      wis: STANDARD_ARRAY[1], // 14
      cha: STANDARD_ARRAY[5], // 8
    },
    skillProficiencies: ['arcana', 'history'],
  });
  w = {
    ...w,
    inventory: [{ itemId: 'dagger' }],
    equipped: { mainHand: { itemId: 'dagger' }, offHand: null, armor: null },
  };
  for (let l = 1; l < level; l++) w = applyLevelUp(w);
  // Long rest baseline (fresh slots + HP)
  w = longRest(w);
  return w;
}

interface RunStats {
  chaptersCleared: number;
  roomsCleared: number;
  died: boolean;
  deathChapter: number;
  deathRoom: number;
  deathRound: number;
  deathCause: string;
  slot1Used: number;
  slot2Used: number;
  slot3Used: number;
  cantripDamage: number;
  spellDamage: number;
  daggerDamage: number;
  mistyStepCasts: number;
  ranOutOfSpells: boolean;
  fireBoltMisses: number;
  fireBoltHits: number;
  combats: number;
}

function aliveMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];
}

function isPlayerTurn(state: CombatState): boolean {
  return state.initiativeOrder[state.currentTurnIndex] === 'player';
}

function totalMonsterHpAlive(state: CombatState): number {
  return aliveMonsters(state).reduce((s, m) => s + m.instance.hp.current, 0);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function expandMonsters(monsters: { defId: string; count: number; displayPrefix?: string }[]) {
  const out: { def: Monster; displayName?: string }[] = [];
  for (const m of monsters) {
    for (let i = 0; i < m.count; i++) {
      const def = getMonster(m.defId);
      out.push({ def, displayName: m.displayPrefix ? `${m.displayPrefix} ${i + 1}` : undefined });
    }
  }
  return out;
}

function simulateCombat(
  character: Character,
  monsters: { def: Monster; displayName?: string }[],
  stats: RunStats,
  ctx: { chapter: number; room: number },
  rollerSeed: number,
): { character: Character; died: boolean } {
  _resetMonsterInstanceCounter();
  const roller = createDiceRoller(rollerSeed);
  setActiveRoller(rollerSeed);
  const init = createCombat({ roller, character, monsters });
  let state: CombatState = init.state;
  let c: Character = init.character;
  stats.combats += 1;

  let safeIters = 0;
  while (state.status === 'active' && safeIters++ < 600) {
    if (isPlayerTurn(state)) {
      if (c.hp.current <= 0) {
        break;
      }
      // Action choice: prioritise high-impact spells, fall back to cantrip.
      const alive = aliveMonsters(state);
      if (alive.length === 0) break;
      // Bonus action: Misty Step when HP low and 2nd-level slot exists.
      if (
        c.hp.current * 2 <= c.hp.max &&
        slotsAt(c, 2) > 0 &&
        !c.actionEconomy.bonusActionUsed &&
        canCastSpell(c, 'misty-step').ok
      ) {
        const r = castSpell({ roller, character: c, state, spellId: 'misty-step' });
        if (r.cast) {
          state = r.state;
          c = r.character;
          stats.slot2Used += 1;
          stats.mistyStepCasts += 1;
        }
      }

      if (!c.actionEconomy.actionUsed) {
        const cantripHpBefore = totalMonsterHpAlive(state);
        const playerHpBefore = c.hp.current;
        void playerHpBefore;
        let cast = false;
        // AoE if 2+ alive and slot 3 available
        if (alive.length >= 2 && slotsAt(c, 3) > 0 && canCastSpell(c, 'fireball').ok) {
          const r = castSpell({ roller, character: c, state, spellId: 'fireball' });
          if (r.cast) {
            const dmg = cantripHpBefore - totalMonsterHpAlive(r.state);
            stats.spellDamage += Math.max(0, dmg);
            state = r.state;
            c = r.character;
            stats.slot3Used += 1;
            cast = true;
          }
        }
        // Burning Hands if 2+ alive and slot 1 available (cheap AoE)
        if (!cast && alive.length >= 2 && slotsAt(c, 1) > 0 && canCastSpell(c, 'burning-hands').ok) {
          const r = castSpell({ roller, character: c, state, spellId: 'burning-hands' });
          if (r.cast) {
            const dmg = cantripHpBefore - totalMonsterHpAlive(r.state);
            stats.spellDamage += Math.max(0, dmg);
            state = r.state;
            c = r.character;
            stats.slot1Used += 1;
            cast = true;
          }
        }
        // Hold Person on chunky single target (HP > 25) when slot 2 available
        if (!cast && alive.length === 1 && alive[0].instance.hp.current > 25 && slotsAt(c, 2) > 0 && canCastSpell(c, 'hold-person').ok) {
          const targetId = alive[0].id;
          const r = castSpell({ roller, character: c, state, spellId: 'hold-person', targetId });
          if (r.cast) {
            state = r.state;
            c = r.character;
            stats.slot2Used += 1;
            cast = true;
          }
        }
        // Magic Missile on tough target if 1st-level slot remaining
        if (!cast && slotsAt(c, 1) > 0 && alive.some((m) => m.instance.hp.current > 8) && canCastSpell(c, 'magic-missile').ok) {
          const target = alive.reduce((best, m) => (m.instance.hp.current > best.instance.hp.current ? m : best));
          const r = castSpell({ roller, character: c, state, spellId: 'magic-missile', targetId: target.id });
          if (r.cast) {
            const dmg = cantripHpBefore - totalMonsterHpAlive(r.state);
            stats.spellDamage += Math.max(0, dmg);
            state = r.state;
            c = r.character;
            stats.slot1Used += 1;
            cast = true;
          }
        }
        // Cantrip: Fire Bolt at lowest-HP enemy (finish them off / preserve actions)
        if (!cast) {
          const target = alive.reduce((best, m) => (m.instance.hp.current < best.instance.hp.current ? m : best));
          const hpBefore = target.instance.hp.current;
          const r = castSpell({ roller, character: c, state, spellId: 'fire-bolt', targetId: target.id });
          if (r.cast) {
            const after = r.state.combatants.find((x) => x.id === target.id);
            const hpAfter = after && after.kind === 'monster' ? after.instance.hp.current : 0;
            const dmg = Math.max(0, hpBefore - hpAfter);
            stats.cantripDamage += dmg;
            if (dmg > 0) stats.fireBoltHits += 1;
            else stats.fireBoltMisses += 1;
            state = r.state;
            c = r.character;
            cast = true;
          }
        }
        if (!cast) {
          // Should never happen — fallback safety
          break;
        }
      }
      const ended = endTurn(state, c);
      state = ended.state;
      c = ended.character;
    } else {
      const monsterId = state.initiativeOrder[state.currentTurnIndex];
      const r = monsterAttack({ roller, character: c, state }, monsterId);
      state = r.state;
      c = r.character;
      if (c.hp.current <= 0) {
        stats.deathChapter = ctx.chapter;
        stats.deathRoom = ctx.room;
        stats.deathRound = state.round;
        const last = state.combatants.find((x) => x.id === monsterId);
        stats.deathCause = last && last.kind === 'monster' ? last.instance.displayName : 'unknown';
        return { character: c, died: true };
      }
      if (state.status !== 'active') break;
      const ended = endTurn(state, c);
      state = ended.state;
      c = ended.character;
    }
  }

  return { character: c, died: c.hp.current <= 0 };
}

function simulateRun(level: number, seed: number): RunStats {
  const stats: RunStats = {
    chaptersCleared: 0,
    roomsCleared: 0,
    died: false,
    deathChapter: -1,
    deathRoom: -1,
    deathRound: -1,
    deathCause: '',
    slot1Used: 0,
    slot2Used: 0,
    slot3Used: 0,
    cantripDamage: 0,
    spellDamage: 0,
    daggerDamage: 0,
    mistyStepCasts: 0,
    ranOutOfSpells: false,
    fireBoltMisses: 0,
    fireBoltHits: 0,
    combats: 0,
  };

  let c = makeWizardAtLevel(level);
  let combatSeed = seed;

  for (let chIdx = 0; chIdx < PLAN.length; chIdx++) {
    const chap = PLAN[chIdx];
    let allCleared = true;
    for (let roomIdx = 0; roomIdx < chap.rooms.length; roomIdx++) {
      const room = chap.rooms[roomIdx];
      if (room.kind === 'rest') {
        const healAmt = Math.floor(c.hp.max * 0.7);
        c = shortRestHeal(c, healAmt);
        continue;
      }
      const monsters = room.kind === 'boss'
        ? [{ def: getMonster(room.monsterId) }]
        : expandMonsters(pick(room.pool).monsters);

      const result = simulateCombat(
        c,
        monsters,
        stats,
        { chapter: chIdx + 1, room: roomIdx + 1 },
        combatSeed++,
      );
      c = result.character;
      if (result.died) {
        stats.died = true;
        return stats;
      }
      stats.roomsCleared += 1;
      // Track ran-out-of-spells: by end of chapter, no slots left and still rooms ahead
      const noSlots = slotsAt(c, 1) === 0 && slotsAt(c, 2) === 0 && slotsAt(c, 3) === 0;
      const roomsAheadInChapter = roomIdx < chap.rooms.length - 1;
      if (noSlots && roomsAheadInChapter && !stats.ranOutOfSpells) {
        stats.ranOutOfSpells = true;
      }
    }
    if (allCleared) stats.chaptersCleared += 1;
    // Camp between chapters = long rest
    c = longRest(c);
    // Auto-level if XP allows (sim approximation — give modest xp per chapter)
    // We don't simulate XP awards because rooms grant xp via applyEventOutcome.
    // For accuracy, manually award xp from cleared rooms.
  }
  return stats;
}

interface Aggregate {
  level: number;
  runs: number;
  meanRoomsCleared: number;
  medianRoomsCleared: number;
  deathRate: number;
  meanCombats: number;
  meanSlot1: number;
  meanSlot2: number;
  meanSlot3: number;
  meanCantripDmg: number;
  meanSpellDmg: number;
  cantripShareOfDamage: number;
  meanMistyStep: number;
  ranOutOfSpellsRate: number;
  fireBoltHitRate: number;
  deathCauses: Record<string, number>;
  deathChapterHist: Record<number, number>;
}

function aggregate(level: number, runs: RunStats[]): Aggregate {
  const n = runs.length;
  const sorted = [...runs].sort((a, b) => a.roomsCleared - b.roomsCleared);
  const median = sorted[Math.floor(n / 2)].roomsCleared;
  const totalCantrip = runs.reduce((s, r) => s + r.cantripDamage, 0);
  const totalSpell = runs.reduce((s, r) => s + r.spellDamage, 0);
  const totalFbHits = runs.reduce((s, r) => s + r.fireBoltHits, 0);
  const totalFbMiss = runs.reduce((s, r) => s + r.fireBoltMisses, 0);
  const deathCauses: Record<string, number> = {};
  const deathChapterHist: Record<number, number> = {};
  for (const r of runs) {
    if (r.died) {
      deathCauses[r.deathCause] = (deathCauses[r.deathCause] ?? 0) + 1;
      deathChapterHist[r.deathChapter] = (deathChapterHist[r.deathChapter] ?? 0) + 1;
    }
  }
  return {
    level,
    runs: n,
    meanRoomsCleared: runs.reduce((s, r) => s + r.roomsCleared, 0) / n,
    medianRoomsCleared: median,
    deathRate: runs.filter((r) => r.died).length / n,
    meanCombats: runs.reduce((s, r) => s + r.combats, 0) / n,
    meanSlot1: runs.reduce((s, r) => s + r.slot1Used, 0) / n,
    meanSlot2: runs.reduce((s, r) => s + r.slot2Used, 0) / n,
    meanSlot3: runs.reduce((s, r) => s + r.slot3Used, 0) / n,
    meanCantripDmg: totalCantrip / n,
    meanSpellDmg: totalSpell / n,
    cantripShareOfDamage:
      totalCantrip + totalSpell > 0 ? totalCantrip / (totalCantrip + totalSpell) : 0,
    meanMistyStep: runs.reduce((s, r) => s + r.mistyStepCasts, 0) / n,
    ranOutOfSpellsRate: runs.filter((r) => r.ranOutOfSpells).length / n,
    fireBoltHitRate: totalFbHits + totalFbMiss > 0 ? totalFbHits / (totalFbHits + totalFbMiss) : 0,
    deathCauses,
    deathChapterHist,
  };
}

function printAggregate(a: Aggregate): void {
  console.log(`\n=== L${a.level} (${a.runs} runs) ===`);
  console.log(`  rooms cleared    mean=${a.meanRoomsCleared.toFixed(2)} median=${a.medianRoomsCleared}`);
  console.log(`  death rate       ${(a.deathRate * 100).toFixed(1)}%`);
  console.log(`  combats/run      ${a.meanCombats.toFixed(2)}`);
  console.log(`  slots/run        L1=${a.meanSlot1.toFixed(2)} L2=${a.meanSlot2.toFixed(2)} L3=${a.meanSlot3.toFixed(2)}`);
  console.log(`  damage/run       cantrip=${a.meanCantripDmg.toFixed(1)} spell=${a.meanSpellDmg.toFixed(1)}  cantrip-share=${(a.cantripShareOfDamage * 100).toFixed(1)}%`);
  console.log(`  Misty Step/run   ${a.meanMistyStep.toFixed(2)}`);
  console.log(`  ran-out-of-slots ${(a.ranOutOfSpellsRate * 100).toFixed(1)}%`);
  console.log(`  Fire Bolt hit%   ${(a.fireBoltHitRate * 100).toFixed(1)}%`);
  if (Object.keys(a.deathChapterHist).length > 0) {
    const chs = Object.keys(a.deathChapterHist).sort();
    console.log(`  deaths by chapter: ${chs.map((c) => `Ch${c}=${a.deathChapterHist[Number(c)]}`).join(' ')}`);
  }
  if (Object.keys(a.deathCauses).length > 0) {
    const causes = Object.entries(a.deathCauses).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`  top death causes: ${causes.map(([k, v]) => `${k}(${v})`).join(', ')}`);
  }
}

function main(): void {
  const LEVELS = [1, 3, 5, 7];
  const RUNS_PER_LEVEL = 50;
  const aggregates: Aggregate[] = [];
  for (const level of LEVELS) {
    const runs: RunStats[] = [];
    for (let i = 0; i < RUNS_PER_LEVEL; i++) {
      const seed = (level * 1000 + i) >>> 0;
      runs.push(simulateRun(level, seed));
    }
    const agg = aggregate(level, runs);
    aggregates.push(agg);
    printAggregate(agg);
  }
}

main();
