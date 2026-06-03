import type { DelveState, RoomSpec } from '../../types/delve';
import { createRng, randomSeed } from '../dice/rng';
import { clampAscension, ascensionEliteVariants, ascensionDungeonTwists } from './ascension';
import { rollRoomTwist } from './twists';
import { ASCENDANT_ELITE_POOL } from './ascensionElitePool';
import { eventsForChapter } from '../../content/events';
import { intelEventIdFor, getBossIntelCard } from '../../content/bossIntel';
import type { EventTemplate } from '../../schemas/event';
import {
  WARMUP_POOL,
  EARLY_MID_POOL,
  MID_POOL,
  ELITE_POOL,
  type EncounterEntry,
} from './chapter1Pools';
import {
  WARMUP_POOL as ATH_WARMUP_POOL,
  EARLY_MID_POOL as ATH_EARLY_MID_POOL,
  MID_POOL as ATH_MID_POOL,
  ELITE_POOL as ATH_ELITE_POOL,
} from './chapter2Pools';
import {
  WARMUP_POOL as SPH_WARMUP_POOL,
  EARLY_MID_POOL as SPH_EARLY_MID_POOL,
  MID_POOL as SPH_MID_POOL,
  ELITE_POOL as SPH_ELITE_POOL,
} from './chapter3Pools';
import {
  WARMUP_POOL as UN_WARMUP_POOL,
  EARLY_MID_POOL as UN_EARLY_MID_POOL,
  MID_POOL as UN_MID_POOL,
  ELITE_POOL as UN_ELITE_POOL,
} from './chapter4Pools';
import {
  WARMUP_POOL as GW_WARMUP_POOL,
  EARLY_MID_POOL as GW_EARLY_MID_POOL,
  MID_POOL as GW_MID_POOL,
  ELITE_POOL as GW_ELITE_POOL,
} from './chapter5Pools';
import {
  WARMUP_POOL as LOOM_WARMUP_POOL,
  EARLY_MID_POOL as LOOM_EARLY_MID_POOL,
  MID_POOL as LOOM_MID_POOL,
  ELITE_POOL as LOOM_ELITE_POOL,
  CHAPTER6_FLAVOR,
} from './chapter6Pools';
// ─── Chapter 7 · The Drowned Archive (first chapter of the L20 expansion) ──
import {
  WARMUP_POOL as ARCHIVE_WARMUP_POOL,
  EARLY_MID_POOL as ARCHIVE_EARLY_MID_POOL,
  MID_POOL as ARCHIVE_MID_POOL,
  ELITE_POOL as ARCHIVE_ELITE_POOL,
  CHAPTER7_FLAVOR,
} from './chapter7Pools';
// ─── Chapter 8 · The Ashfall March ──────────────────────────────────────
import {
  WARMUP_POOL as ASH_WARMUP_POOL,
  EARLY_MID_POOL as ASH_EARLY_MID_POOL,
  MID_POOL as ASH_MID_POOL,
  ELITE_POOL as ASH_ELITE_POOL,
  CHAPTER8_FLAVOR,
} from './chapter8Pools';
// ─── Chapter 9 · The Court of Masks ──────────────────────────────────────
import {
  WARMUP_POOL as MASK_WARMUP_POOL,
  EARLY_MID_POOL as MASK_EARLY_MID_POOL,
  MID_POOL as MASK_MID_POOL,
  ELITE_POOL as MASK_ELITE_POOL,
  CHAPTER9_FLAVOR,
} from './chapter9Pools';
// ─── Chapter 10 · Suldanessellar (the Tree of Life) ───────────────────────
import {
  WARMUP_POOL as SULD_WARMUP_POOL,
  EARLY_MID_POOL as SULD_EARLY_MID_POOL,
  MID_POOL as SULD_MID_POOL,
  ELITE_POOL as SULD_ELITE_POOL,
  CHAPTER10_FLAVOR,
} from './chapter10Pools';
// ─── Chapter 11 · The Trials of the Pit (Hell + Irenicus) ─────────────────
import {
  WARMUP_POOL as PIT_WARMUP_POOL,
  EARLY_MID_POOL as PIT_EARLY_MID_POOL,
  MID_POOL as PIT_MID_POOL,
  ELITE_POOL as PIT_ELITE_POOL,
  CHAPTER11_FLAVOR,
} from './chapter11Pools';
// ─── Chapter 12 · The Siege of Saradush (Yaga-Shura) ──────────────────────
import {
  WARMUP_POOL as SARA_WARMUP_POOL,
  EARLY_MID_POOL as SARA_EARLY_MID_POOL,
  MID_POOL as SARA_MID_POOL,
  ELITE_POOL as SARA_ELITE_POOL,
  CHAPTER12_FLAVOR,
} from './chapter12Pools';
// ─── Chapter 13 · The Last of the Five (Sendai + Abazigal) ────────────────
import {
  WARMUP_POOL as FIVE_WARMUP_POOL,
  EARLY_MID_POOL as FIVE_EARLY_MID_POOL,
  MID_POOL as FIVE_MID_POOL,
  ELITE_POOL as FIVE_ELITE_POOL,
  CHAPTER13_FLAVOR,
} from './chapter13Pools';
// ─── Chapter 14 · The Throne of Bhaal (Melissan) — the L20 finale ─────────
import {
  WARMUP_POOL as THRONE_WARMUP_POOL,
  EARLY_MID_POOL as THRONE_EARLY_MID_POOL,
  MID_POOL as THRONE_MID_POOL,
  ELITE_POOL as THRONE_ELITE_POOL,
  CHAPTER14_FLAVOR,
} from './chapter14Pools';

interface Rng {
  next(): number;
}

/**
 * Draw `count` distinct entries from a pool via the seeded RNG. Used by the
 * longer Ch2–4 spans, which fill a fifth combat slot from the mid-tier pool and
 * must not repeat a composition within the same chapter. Only allows a repeat
 * if the pool is smaller than `count` (it isn't — every pool holds six entries).
 */
function pickN<T>(rng: Rng, pool: T[], count: number): T[] {
  if (pool.length === 0) throw new Error('Empty encounter pool');
  const remaining = [...pool];
  const out: T[] = [];
  for (let k = 0; k < count; k++) {
    if (remaining.length === 0) remaining.push(...pool);
    const idx = Math.floor(rng.next() * remaining.length);
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}

function combatRoom(id: string, e: EncounterEntry): RoomSpec {
  return {
    id,
    kind: 'combat',
    title: e.title,
    flavorText: e.flavorText,
    monsters: e.monsters,
    xpReward: e.xpReward,
    goldReward: e.goldReward,
  };
}

/**
 * Pick an event template from the pool of events available at or below the
 * given chapter, then wrap it as an event-kind RoomSpec. Used by the chained
 * Godwake delve to drop 1+ narrative beats per chapter. Picks via the same
 * seeded RNG that composes the combat slots, so a delve seed locks events too.
 */
function eventRoom(id: string, rng: Rng, chapter: number, excludeIds: Set<string>): { room: RoomSpec; templateId: string } {
  const eligible = eventsForChapter(chapter);
  const pool = eligible.filter((e) => !excludeIds.has(e.id));
  // Fall back to the unfiltered chapter pool if exclusion empties it (small chapter pools).
  const tpl = pickEventByRecency(rng, pool.length > 0 ? pool : eligible, chapter);
  return { room: eventRoomFromTemplate(id, tpl), templateId: tpl.id };
}

/**
 * Weighted draw that prefers events authored for the current chapter band over
 * older ones. `eventsForChapter` is cumulative (every event at or below the
 * chapter is eligible), so without this a Throne-of-Bhaal event room would
 * mostly serve Ch1 roadside fare by sheer count. Weight halves per chapter of
 * age (`2^-(chapter - minChapter)`), so the deep endgame is dominated by
 * deep-chapter events while the early game still mixes its small pools freely.
 */
function pickEventByRecency(rng: Rng, pool: EventTemplate[], chapter: number): EventTemplate {
  if (pool.length === 0) throw new Error('Empty event pool');
  const weights = pool.map((e) => 2 ** -(chapter - (e.minChapter ?? 1)));
  const total = weights.reduce((a, w) => a + w, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function eventRoomFromTemplate(id: string, tpl: EventTemplate): RoomSpec {
  return {
    id,
    kind: 'event',
    title: tpl.title,
    flavorText: tpl.flavor,
    eventTemplateId: tpl.id,
  };
}

/**
 * Build the deterministic intel room placed 1 step before each chapter boss.
 * The event template is pulled by boss def id, so the player walks into the
 * same intel beat every run — preparation, not surprise.
 */
function intelRoomFor(id: string, bossDefId: string): RoomSpec {
  const card = getBossIntelCard(bossDefId);
  if (!card) throw new Error(`No intel card for boss ${bossDefId}`);
  return {
    id,
    kind: 'event',
    title: card.roomTitle,
    flavorText: card.roomFlavor,
    eventTemplateId: intelEventIdFor(bossDefId),
  };
}

/**
 * Godwake — the single continuous run, now a BRANCHING node map. Each of the
 * six chapters is a small layered DAG: parallel nodes the player routes
 * between (fight / shrine / rest / shop / elite / event), all converging on the
 * pre-boss intel beat and then the chapter boss. The camps remain the seams
 * between chapters.
 *
 *   Ch1 Iron Cells → Camp → Ch2 Athkatla → Camp → Ch3 Spellhold → Camp →
 *     Ch4 Ust Natha → Camp → Ch5 The Godwake → Camp → Ch6 Beyond the Godwake.
 *     Ends at the Unmade, the still centre of the wheel.
 *
 * The flat `rooms` array holds every node in chapter-major, layer-minor order
 * (boss last in each chapter, camp right after), so the renown/boss bookkeeping
 * in `finishDelve` — which slices `rooms` up to `currentRoomIdx` — still counts
 * the convergence bosses correctly. The whole map — encounters, event picks AND
 * the per-chapter topology (column count, widths, kind placement, edges) — is
 * rolled from one seeded RNG, so a delve seed locks the entire road, but each
 * new run draws a genuinely different shape.
 */
export interface GodwakeDelveOptions {
  /** Seed for the encounter pool RNG. */
  seed?: number;
  /** Ascension level to play this run at (0 = base). Scales enemies + payout. */
  ascension?: number;
  /**
   * Whether elite nodes are unlocked for this soul. When false, elite nodes are
   * still laid out and rendered — greyed and unselectable (`locked`) — rather
   * than hidden or swapped, so the player sees what is there and routes around
   * it. The generator guarantees a selectable alternate at every step.
   */
  elitesEnabled?: boolean;
}

/** A chapter-map column slot. Combat slots draw from the chapter's themed pools. */
type SlotKind =
  | 'warmup'
  | 'earlyMid'
  | 'mid'
  | 'elite'
  | 'shop'
  | 'rest'
  | 'shrine'
  | 'event'
  | 'intel'
  | 'boss';

/**
 * Sane bounds for the procedurally-laid-out chapter. Every chapter is always
 * entry(warmup) → [middle columns] → intel → boss; only the middle varies by
 * seed — its column count, each column's width, which kinds sit where, and the
 * edge fan between columns. The special beats sit on a fixed budget plus a pad
 * of extra fights, so fights stay the majority and the count invariants
 * (≥2 shrines, ≥1 rest, ≥1 event, a shop and an elite per chapter) always hold.
 */
const FORK_MIN_WIDTH = 2; // the chapter entry must open onto a real choice
const COLUMN_MAX_WIDTH = 3; // widest parallel column on the map
const COMBAT_PAD_MIN = 3; // extra fights beyond the special budget
const COMBAT_PAD_MAX = 4;

/** Inclusive integer roll in [min, max] off the seeded RNG. */
function roll(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

interface SlotBudget {
  eliteCount: number;
  restCount: number;
  eventCount: number;
  shrineCount: number;
  shopCount: number;
}

/**
 * Procedurally lay out one chapter's columns for the given seed-state RNG.
 * Returns rows of slot kinds (row = column on the map, multiple entries =
 * parallel nodes the player routes between). The first row is the lone warmup
 * entry and the last two are the intel→boss convergence; everything between is
 * randomized in width, kind placement and (later, via wireLayers) edge fan, so
 * each seed draws a genuinely different road.
 *
 * Budget per chapter: 2 shrines, 1–2 rests, 1 shop, 1–2 elites, 1–2 events,
 * the rest fights. Elites and the shop sit late (risk ramps toward the boss); a
 * shrine is seeded early so an opening route always has an altar in reach.
 */
function generateChapterPlan(rng: Rng): SlotKind[][] {
  const budget: SlotBudget = {
    eliteCount: roll(rng, 1, 2),
    restCount: roll(rng, 1, 2),
    eventCount: roll(rng, 1, 2),
    shrineCount: 2,
    shopCount: 1,
  };
  const specials =
    budget.eliteCount +
    budget.restCount +
    budget.eventCount +
    budget.shrineCount +
    budget.shopCount;
  const middle = specials + roll(rng, COMBAT_PAD_MIN, COMBAT_PAD_MAX);

  // Every middle column is at least FORK_MIN_WIDTH wide, so the player can always
  // route around any single node (an elite especially) — no forced bottleneck.
  const widths = rollColumnWidths(rng, middle);

  const kinds = assignSlotKinds(rng, middle, budget);
  const middleColumns: SlotKind[][] = [];
  let cursor = 0;
  for (const w of widths) {
    middleColumns.push(kinds.slice(cursor, cursor + w));
    cursor += w;
  }

  // At most one elite per column: with elites locked (new souls) a node renders
  // greyed, and two greyed elites sharing a column could leave it with nothing
  // selectable. Relocate any surplus onto a plain combat slot elsewhere.
  spreadElites(middleColumns);

  const plan: SlotKind[][] = [['warmup'], ...middleColumns, ['intel'], ['boss']];

  // No two same-kind non-combat rooms back-to-back along an edge, and none
  // sharing a column (parallel choices must differ). Fights (warmup/earlyMid/
  // mid/elite) are exempt and may repeat both ways.
  dedupeRoomKinds(plan);

  return plan;
}

/**
 * The forward edges wireLayers draws between a column of `a` nodes and the next
 * of `b`: `targets[i]` is the list of next-column indices prev node `i` points
 * at. Single source of truth shared by the actual wiring and the adjacency
 * dedupe, so the two can never disagree on what counts as adjacent.
 */
function layerEdges(a: number, b: number): number[][] {
  const targets: number[][] = [];
  for (let i = 0; i < a; i++) {
    const j = Math.min(b - 1, Math.floor((i * b) / a));
    const t = [j];
    if (b >= 2) t.push(j + 1 < b ? j + 1 : j - 1);
    targets.push(t);
  }
  for (let j = 0; j < b; j++) {
    if (targets.some((t) => t.includes(j))) continue;
    const i = b === 1 ? a - 1 : Math.min(a - 1, Math.floor((j * a) / b));
    targets[i].push(j);
  }
  return targets;
}

/** Combat/fight slots — exempt from the no-repeat rule (fight→fight is fine). */
const COMBAT_SLOTS: ReadonlySet<SlotKind> = new Set<SlotKind>([
  'warmup',
  'earlyMid',
  'mid',
  'elite',
]);
/**
 * Slots the dedupe may move when breaking a same-kind adjacency. Plain combat
 * and the non-combat specials are all fair game; warmup (the fixed entry),
 * elite (held to one-per-column by spreadElites), and the intel→boss
 * convergence stay put so the layout invariants are untouched.
 */
const MOVABLE_SLOTS: ReadonlySet<SlotKind> = new Set<SlotKind>([
  'earlyMid',
  'mid',
  'shop',
  'rest',
  'shrine',
  'event',
]);

/**
 * The kind two adjacent rooms are compared on. Combat slots collapse to null
 * (exempt). `intel` rooms are built as `event`-kind RoomSpecs, so they share the
 * comparison kind of an `event` — an event sitting just before the intel beat
 * would otherwise read as two events in a row.
 */
function adjacencyKind(slot: SlotKind): SlotKind | null {
  if (COMBAT_SLOTS.has(slot)) return null;
  return slot === 'intel' ? 'event' : slot;
}

/** Positions of every node sharing an edge with column `l`, slot `idx`. */
function neighborPositions(plan: SlotKind[][], l: number, idx: number): [number, number][] {
  const out: [number, number][] = [];
  if (l > 0) {
    const back = layerEdges(plan[l - 1].length, plan[l].length);
    for (let i = 0; i < plan[l - 1].length; i++) {
      if (back[i].includes(idx)) out.push([l - 1, i]);
    }
  }
  if (l < plan.length - 1) {
    const fwd = layerEdges(plan[l].length, plan[l + 1].length);
    for (const j of fwd[idx]) out.push([l + 1, j]);
  }
  return out;
}

/** Adjacency kinds of every node sharing an edge with column `l`, slot `idx`. */
function neighborKinds(plan: SlotKind[][], l: number, idx: number): Set<SlotKind> {
  const out = new Set<SlotKind>();
  for (const [nl, ni] of neighborPositions(plan, l, idx)) {
    const k = adjacencyKind(plan[nl][ni]);
    if (k !== null) out.add(k);
  }
  return out;
}

/** True if dropping `kind` into (l, idx) sits it beside a same-kind room. */
function conflictsAt(plan: SlotKind[][], l: number, idx: number, kind: SlotKind): boolean {
  const ak = adjacencyKind(kind);
  return ak !== null && neighborKinds(plan, l, idx).has(ak);
}

/**
 * True if dropping `kind` into column `l` puts a second node of the same
 * non-combat kind in that one column — i.e. the parallel choices at the step
 * would offer two identical non-combat rooms. Combat kinds collapse to null and
 * are exempt (a column may hold several fights/elites).
 */
function columnConflictsAt(plan: SlotKind[][], l: number, idx: number, kind: SlotKind): boolean {
  const ak = adjacencyKind(kind);
  if (ak === null) return false;
  for (let i = 0; i < plan[l].length; i++) {
    if (i === idx) continue;
    if (adjacencyKind(plan[l][i]) === ak) return true;
  }
  return false;
}

/**
 * Resolve a same-kind clash by swapping the non-combat special at (cl, ci) with
 * another movable slot, so the room mix and per-kind counts are unchanged.
 * Accepts a swap that leaves both endpoints clear of the edge rule AND the
 * column rule — a plain-combat partner trivially satisfies both at its own end,
 * so combat is the usual landing spot; a special↔special swap covers the tighter
 * maps. When the destination's only remaining edge conflict is a movable
 * same-kind neighbour (e.g. the duplicate's own sibling fanning into the same
 * next column, so every direct landing is event-adjacent), it recursively pushes
 * that blocker aside first — so a clash that genuinely needs two moves still
 * resolves. `frozen` holds the positions mid-relocation, which both breaks
 * cycles and bounds the recursion. Returns false only if no chain clears it.
 */
function relocateSpecial(
  plan: SlotKind[][],
  cl: number,
  ci: number,
  frozen: Set<string> = new Set(),
): boolean {
  const kind = plan[cl][ci];
  const srcKey = `${cl},${ci}`;
  frozen.add(srcKey);
  for (let tl = 0; tl < plan.length; tl++) {
    for (let ti = 0; ti < plan[tl].length; ti++) {
      if (frozen.has(`${tl},${ti}`)) continue;
      if (!MOVABLE_SLOTS.has(plan[tl][ti])) continue;
      const other = plan[tl][ti];
      if (other === kind) continue;
      plan[cl][ci] = other;
      plan[tl][ti] = kind;
      // The vacated source endpoint takes `other`; it must end clean outright
      // (no chaining on the side we are trying to settle), and neither endpoint
      // may break the column rule.
      const srcClean =
        !conflictsAt(plan, cl, ci, other) &&
        !columnConflictsAt(plan, cl, ci, other) &&
        !columnConflictsAt(plan, tl, ti, kind);
      if (srcClean && clearEdgeByChaining(plan, tl, ti, frozen)) {
        frozen.delete(srcKey);
        return true;
      }
      plan[cl][ci] = kind;
      plan[tl][ti] = other;
    }
  }
  frozen.delete(srcKey);
  return false;
}

/**
 * Make the node now sitting at (l, idx) satisfy the edge rule, recursively
 * relocating any movable same-kind neighbour that blocks it. Returns true once
 * no same-kind neighbour remains (trivially true when there were none).
 */
function clearEdgeByChaining(
  plan: SlotKind[][],
  l: number,
  idx: number,
  frozen: Set<string>,
): boolean {
  const ak = adjacencyKind(plan[l][idx]);
  if (ak === null) return true;
  const selfKey = `${l},${idx}`;
  frozen.add(selfKey);
  for (const [nl, ni] of neighborPositions(plan, l, idx)) {
    if (adjacencyKind(plan[nl][ni]) !== ak) continue;
    if (frozen.has(`${nl},${ni}`) || !MOVABLE_SLOTS.has(plan[nl][ni]) || !relocateSpecial(plan, nl, ni, frozen)) {
      frozen.delete(selfKey);
      return false;
    }
  }
  frozen.delete(selfKey);
  return !conflictsAt(plan, l, idx, plan[l][idx]);
}

/**
 * One sweep of the edge rule: for every edge A→B in the column DAG, A and B
 * must not be the same non-combat kind (fights exempt). On a violation,
 * relocates the movable endpoint onto a plain-combat slot (preserving the mix).
 * The intel beat is fixed in place, so a conflict against it is resolved by
 * moving the offending upstream event instead. Returns whether anything moved.
 */
function dedupeAdjacentNonCombatPass(plan: SlotKind[][]): boolean {
  let changed = false;
  for (let l = 0; l < plan.length - 1; l++) {
    const edges = layerEdges(plan[l].length, plan[l + 1].length);
    for (let i = 0; i < plan[l].length; i++) {
      const ki = adjacencyKind(plan[l][i]);
      if (ki === null) continue;
      for (const j of edges[i]) {
        if (adjacencyKind(plan[l + 1][j]) !== ki) continue;
        // Prefer moving the downstream node; if it is the fixed intel beat,
        // move the upstream event instead.
        const moved =
          plan[l + 1][j] === 'intel'
            ? relocateSpecial(plan, l, i)
            : relocateSpecial(plan, l + 1, j) || relocateSpecial(plan, l, i);
        if (moved) changed = true;
      }
    }
  }
  return changed;
}

/**
 * One sweep of the column rule: within a single column, no two nodes may be the
 * same non-combat kind — the parallel choices at a step must differ (two rests
 * side by side is a fake choice). Combat is exempt (a column may hold several
 * fights/elites). On a duplicate, relocates the second occurrence onto a movable
 * slot elsewhere. Returns whether anything moved.
 */
function dedupeSameColumnNonCombatPass(plan: SlotKind[][]): boolean {
  let changed = false;
  for (let l = 0; l < plan.length; l++) {
    const seen = new Set<SlotKind>();
    for (let i = 0; i < plan[l].length; i++) {
      const k = adjacencyKind(plan[l][i]);
      if (k === null) continue;
      if (!seen.has(k)) {
        seen.add(k);
        continue;
      }
      if (relocateSpecial(plan, l, i)) {
        // The swapped-in kind may itself now collide; rescan this column.
        changed = true;
        seen.clear();
        i = -1;
      }
    }
  }
  return changed;
}

/**
 * Enforce both room-sequencing rules together until the layout is stable: no
 * two same-kind non-combat rooms back-to-back along an edge (#348), and no two
 * same-kind non-combat rooms sharing a column (the parallel-choice complement).
 * Each successful relocation passes both checks at both endpoints, so it removes
 * one violation and introduces neither kind — the two passes converge jointly
 * and the bounded sweep always terminates.
 */
function dedupeRoomKinds(plan: SlotKind[][]): void {
  for (let pass = 0; pass < plan.length * 8; pass++) {
    const edgeChanged = dedupeAdjacentNonCombatPass(plan);
    const columnChanged = dedupeSameColumnNonCombatPass(plan);
    if (!edgeChanged && !columnChanged) return;
  }
}

/**
 * Split `total` middle slots into columns, each at least FORK_MIN_WIDTH wide and
 * at most COLUMN_MAX_WIDTH, summing exactly to `total`. The minimum-2 floor is
 * the alternate-route guarantee: no middle column is ever a single forced node.
 * Column count is rolled within the bounds that keep the floor satisfiable, then
 * the surplus over the floor is sprinkled across random columns.
 */
function rollColumnWidths(rng: Rng, total: number): number[] {
  const minCols = Math.max(1, Math.ceil(total / COLUMN_MAX_WIDTH));
  const maxCols = Math.max(1, Math.floor(total / FORK_MIN_WIDTH));
  const cols = roll(rng, minCols, maxCols);
  const widths = new Array<number>(cols).fill(FORK_MIN_WIDTH);
  let extra = total - FORK_MIN_WIDTH * cols;
  const order = [...widths.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const c of order) {
    if (extra <= 0) break;
    const add = Math.min(COLUMN_MAX_WIDTH - widths[c], extra);
    widths[c] += add;
    extra -= add;
  }
  return widths;
}

/**
 * Move any surplus elite past the first in a column onto a plain combat slot in
 * an elite-free column, so no column holds more than one elite. Preserves the
 * total elite and combat counts — only swaps which slot is which.
 */
function spreadElites(columns: SlotKind[][]): void {
  const hasElite = (col: SlotKind[]): boolean => col.some((s) => s === 'elite');
  for (const col of columns) {
    while (col.filter((s) => s === 'elite').length > 1) {
      const surplusIdx = col.indexOf('elite', col.indexOf('elite') + 1);
      const target = columns.find(
        (c) => c !== col && !hasElite(c) && c.some((s) => s === 'earlyMid' || s === 'mid'),
      );
      if (!target) break;
      const slotIdx = target.findIndex((s) => s === 'earlyMid' || s === 'mid');
      col[surplusIdx] = target[slotIdx];
      target[slotIdx] = 'elite';
    }
  }
}

/**
 * Place the special beats into `n` flat middle slots (slot 0 sits just after
 * the entry, slot n-1 just before intel), then fill the rest with fights graded
 * by position: early slots draw the early-mid pool, later slots the mid pool.
 * Each beat reserves a slot inside a position window so the difficulty ramp
 * roughly holds; a full window falls back to any open slot so the whole budget
 * always lands (n is sized to leave plenty of room).
 */
function assignSlotKinds(rng: Rng, n: number, budget: SlotBudget): SlotKind[] {
  const slots: (SlotKind | null)[] = new Array(n).fill(null);

  const reserve = (loFrac: number, hiFrac: number, kind: SlotKind): void => {
    const lo = Math.floor(loFrac * n);
    const hi = Math.min(n - 1, Math.max(lo, Math.ceil(hiFrac * n) - 1));
    const free: number[] = [];
    for (let i = lo; i <= hi; i++) if (slots[i] === null) free.push(i);
    if (free.length === 0) for (let i = 0; i < n; i++) if (slots[i] === null) free.push(i);
    if (free.length === 0) return;
    slots[free[Math.floor(rng.next() * free.length)]] = kind;
  };

  for (let k = 0; k < budget.eliteCount; k++) reserve(0.55, 1, 'elite');
  for (let k = 0; k < budget.shopCount; k++) reserve(0.4, 0.95, 'shop');
  for (let k = 0; k < budget.shrineCount; k++) reserve(k === 0 ? 0 : 0.45, k === 0 ? 0.55 : 1, 'shrine');
  for (let k = 0; k < budget.restCount; k++) reserve(0.2, 0.85, 'rest');
  for (let k = 0; k < budget.eventCount; k++) reserve(0.1, 0.9, 'event');

  for (let i = 0; i < n; i++) {
    if (slots[i] === null) slots[i] = i / n < 0.45 ? 'earlyMid' : 'mid';
  }
  return slots as SlotKind[];
}

interface RoomFlavor {
  title: string;
  flavorText: string;
}

function shrineRoom(id: string, f: RoomFlavor): RoomSpec {
  return { id, kind: 'shrine', title: f.title, flavorText: f.flavorText };
}

function restRoomNode(id: string, f: RoomFlavor): RoomSpec {
  return { id, kind: 'rest', title: f.title, flavorText: f.flavorText, restType: 'short' };
}

function shopRoom(id: string, f: RoomFlavor): RoomSpec {
  return { id, kind: 'shop', title: f.title, flavorText: f.flavorText };
}

/**
 * Elite node: a tougher pull from the chapter's ELITE pool, sweetened with extra
 * coin so the detour reads as risk-for-reward on the map. Spawns like ordinary
 * combat (no boss mechanic), just harder and richer.
 */
function eliteRoom(id: string, e: EncounterEntry, chapter: number): RoomSpec {
  return {
    id,
    kind: 'elite',
    title: e.title,
    flavorText: e.flavorText,
    monsters: e.monsters,
    xpReward: e.xpReward,
    goldReward: (e.goldReward ?? 0) + 20 + chapter * 10,
  };
}

function campNode(id: string, chapter: number, f: RoomFlavor): RoomSpec {
  return { id, kind: 'camp', title: f.title, flavorText: f.flavorText, chapter };
}

function bossRoomNode(id: string, content: ChapterContent): RoomSpec {
  return {
    id,
    kind: 'boss',
    title: content.boss.title,
    flavorText: content.boss.flavorText,
    monsters: [{ defId: content.bossDefId, count: 1 }],
    xpReward: content.boss.xpReward,
    ...(content.boss.goldReward !== undefined ? { goldReward: content.boss.goldReward } : {}),
  };
}

/**
 * Wire two adjacent map columns into a forward-fanning DAG. Each prev node
 * connects to its aligned next node and one neighbour, so paths fan out without
 * crossing (Slay-the-Spire style); a coverage pass guarantees every next node is
 * reachable and the column stays fully connected to the boss.
 *
 * Whenever the next column has 2+ nodes, every prev node gets two distinct
 * targets (the last node fans left instead of right), so no node ever offers a
 * single forced step except at the intel→boss convergence (width 1). Combined
 * with the at-most-one-elite-per-column rule, that means at least one of a prev
 * node's targets is always a selectable (non-locked) node — a locked elite can
 * never be the only way forward.
 */
function wireLayers(prev: RoomSpec[], next: RoomSpec[]): void {
  const targets = layerEdges(prev.length, next.length);
  for (let i = 0; i < prev.length; i++) {
    prev[i].next = targets[i].map((t) => next[t].id);
  }
}

interface ChapterContent {
  chapter: number;
  prefix: string;
  pools: {
    warmup: EncounterEntry[];
    earlyMid: EncounterEntry[];
    mid: EncounterEntry[];
    elite: EncounterEntry[];
  };
  shrines: RoomFlavor[];
  rests: RoomFlavor[];
  shop: RoomFlavor;
  bossDefId: string;
  boss: { title: string; flavorText: string; xpReward: number; goldReward?: number };
}

/**
 * Build one chapter's branching node graph: roll a fresh layout for the chapter
 * (column count, widths, kind placement), draw exactly as many distinct combat
 * compositions per tier as the layout calls for (so a chapter never repeats a
 * fight unless its pool is exhausted), set `layer`/`chapter` for the map, then
 * wire the columns into a forward-fanning DAG. The boss's outgoing edge is left
 * for the caller to point at the camp (or terminal for the final chapter).
 * Returned flat in chapter-major, column-minor order.
 */
function buildChapterNodes(
  rng: Rng,
  content: ChapterContent,
  nextEvent: (id: string, chapter: number) => RoomSpec,
  elitesEnabled = true,
  ascension = 0,
): RoomSpec[] {
  const plan = generateChapterPlan(rng);
  const slotCount = (kind: SlotKind): number =>
    plan.reduce((sum, col) => sum + col.filter((s) => s === kind).length, 0);

  const warmupQ = pickN(rng, content.pools.warmup, slotCount('warmup'));
  const emQ = pickN(rng, content.pools.earlyMid, slotCount('earlyMid'));
  const eliteSlots = slotCount('elite');
  const midQ = pickN(rng, content.pools.mid, slotCount('mid'));
  // At Ascension ≥ 2 the ascendant horrors are mixed INTO the chapter's own elite
  // pool (augment, never replace), so an elite detour can now field a tougher,
  // chapter-agnostic threat — ascension changes what you fight, not just its HP.
  const elitePool = ascensionEliteVariants(ascension)
    ? [...content.pools.elite, ...ASCENDANT_ELITE_POOL]
    : content.pools.elite;
  // Elite slots are always laid out and filled; when the elite-reveal unlock has
  // not fired for this soul they render greyed (locked) rather than vanishing or
  // being swapped for another room type. The map is byte-identical either way —
  // only the `locked` flag differs — so the route never silently reshapes.
  const eliteQ = pickN(rng, elitePool, eliteSlots);
  // Ascension dungeon twists ride a fraction of the routed combat rooms only at
  // Ascension >= 4. The roll consumes RNG only when twists are live, so low-
  // ascension maps draw the exact same stream they always did.
  const twistsLive = ascensionDungeonTwists(ascension);
  let shrineI = 0;
  let restI = 0;

  const layers: RoomSpec[][] = plan.map((slots, layer) =>
    slots.map((slot, slotIdx) => {
      const id = `${content.prefix}-l${layer}-s${slotIdx}`;
      let node: RoomSpec;
      switch (slot) {
        case 'warmup':
          node = combatRoom(id, warmupQ.shift()!);
          break;
        case 'earlyMid':
          node = combatRoom(id, emQ.shift()!);
          break;
        case 'mid':
          node = combatRoom(id, midQ.shift()!);
          break;
        case 'elite':
          node = eliteRoom(id, eliteQ.shift()!, content.chapter);
          if (!elitesEnabled) node.locked = true;
          break;
        case 'shop':
          node = shopRoom(id, content.shop);
          break;
        case 'rest':
          node = restRoomNode(id, content.rests[restI++ % content.rests.length]);
          break;
        case 'shrine':
          node = shrineRoom(id, content.shrines[shrineI++ % content.shrines.length]);
          break;
        case 'event':
          node = nextEvent(id, content.chapter);
          break;
        case 'intel':
          node = intelRoomFor(id, content.bossDefId);
          break;
        case 'boss':
          node = bossRoomNode(id, content);
          break;
        default:
          throw new Error(`Unknown slot kind: ${slot as string}`);
      }
      node.layer = layer;
      node.chapter = content.chapter;
      // Twist the routed mid-road fights (not the warmup opener, elites or the
      // boss), so a chapter holds a few telegraphed hazard rooms.
      if (twistsLive && (slot === 'earlyMid' || slot === 'mid')) {
        const twistId = rollRoomTwist(rng);
        if (twistId) node.twistId = twistId;
      }
      return node;
    }),
  );

  for (let l = 0; l < layers.length - 1; l++) wireLayers(layers[l], layers[l + 1]);
  return layers.flat();
}

// ── Per-chapter content: pools + map flavor reused from the chapter delves ──

const GODWAKE_CHAPTERS: ChapterContent[] = [
  {
    chapter: 1,
    prefix: 'c1',
    pools: {
      warmup: WARMUP_POOL,
      earlyMid: EARLY_MID_POOL,
      mid: MID_POOL,
      elite: ELITE_POOL,
    },
    shrines: [
      {
        title: 'A Forgotten Altar',
        flavorText:
          'An altar of weathered stone, three sigils flickering as you approach. The labs above never sealed this off — gods bleed through cracks the master cannot find.',
      },
      {
        title: 'The Cracked Sigil',
        flavorText:
          'A second altar, half-buried in rubble. Someone tried to chisel the sigils out — and someone else, later, deepened them again. The god is still listening.',
      },
    ],
    rests: [
      {
        title: 'A Quiet Alcove',
        flavorText:
          'A side-passage with a broken lantern. The walls are scratched with prayers in a language you almost know.',
      },
      {
        title: 'A Collapsed Stairwell',
        flavorText:
          'A stretch of stair the ceiling came down on, sealing the corridor behind you. For a little while, at least, nothing can follow.',
      },
    ],
    shop: {
      title: 'A Fence in the Dark',
      flavorText:
        "A trembling prisoner the slavers kept as a quartermaster has a stash behind a loose stone — arms stripped from the dead, draughts skimmed from the labs. He wants coin, not company.",
    },
    bossDefId: 'duergar-ilyich',
    boss: {
      title: "Ilyich's Hall",
      flavorText:
        'The duergar slaver waits at the centre of a wide stone hall. He spits on the floor when he sees you. "Another of his pets, are you? Walking. Tch. We\'ll see how long."',
      xpReward: 250,
    },
  },
  {
    chapter: 2,
    prefix: 'c2',
    pools: {
      warmup: ATH_WARMUP_POOL,
      earlyMid: ATH_EARLY_MID_POOL,
      mid: ATH_MID_POOL,
      elite: ATH_ELITE_POOL,
    },
    shrines: [
      {
        title: 'A Curbside Shrine to Waukeen',
        flavorText:
          "A pillar of guilded sandstone, four niches at the base. Athkatla's merchant queen does not promise gold — only that the scale will tip true. Coins clink at the bottom of the basin.",
      },
      {
        title: 'A Plague-Worn Altar to Ilmater',
        flavorText:
          "Even Athkatla cannot stamp out the Crying God. A cracked stone basin half-hidden in a brick recess — Ilmater's red knot scratched in chalk and re-chalked a hundred times. Bandages hang dry on a nail.",
      },
    ],
    rests: [
      {
        title: 'A Festhall Backroom',
        flavorText:
          "A back room of the Bronze Lion, its proprietor pretending not to see. A jug of watered wine and a stool by the brazier.",
      },
      {
        title: "A Shuttered Notary's Office",
        flavorText:
          "A notary's back office with the shutters drawn and the day's warrants still drying on a line. Whoever worked here left in a hurry. The cot in the corner is narrow, but the door bolts from the inside.",
      },
    ],
    shop: {
      title: 'A Coin-Lender at the Curb',
      flavorText:
        "A Waukeenar coin-lender keeps a folding stall in the colonnade, scales out, ledger open. In Athkatla everything is for sale and the only sin is a debt unpaid. He weighs your purse before he weighs his words.",
    },
    bossDefId: 'athkatla-magistrate',
    boss: {
      title: "The Magistrate's Hall",
      flavorText:
        "A vaulted chamber, marble underfoot, a high bench at the far end. The Magistrate is already seated. He looks up from a warrant and folds it once. \"You are not on the docket. The exception is easily corrected.\"",
      xpReward: 700,
      goldReward: 80,
    },
  },
  {
    chapter: 3,
    prefix: 'c3',
    pools: {
      warmup: SPH_WARMUP_POOL,
      earlyMid: SPH_EARLY_MID_POOL,
      mid: SPH_MID_POOL,
      elite: SPH_ELITE_POOL,
    },
    shrines: [
      {
        title: 'A Smuggled Shrine to Mystra',
        flavorText:
          "Half-hidden behind a moved bookcase in a side-cell — a chalk circle around a star of seven points, and a stub of candle burned by hand-shielding rather than by holder. The Weave is thin in here, but Mystra's silver hand still reaches.",
      },
      {
        title: "The Crying God's Mark",
        flavorText:
          "A red-knotted bandage hangs on a nail above a cracked basin in a warden's washroom. Someone has been smuggling Ilmater's mercy into Spellhold one prayer at a time. The basin is still wet.",
      },
    ],
    rests: [
      {
        title: 'The Disused Cell-Block',
        flavorText:
          "A row of cells the wardens stopped using after the last riot — doors hanging open, straw mouldering on the floors. Quiet enough to sit down.",
      },
      {
        title: 'A Water-Stained Observation Gallery',
        flavorText:
          "A gallery the wardens once used to watch the cells below — the glass long since cracked, the floor warped with old flood-water. Nothing watches you here.",
      },
    ],
    shop: {
      title: "A Warden's Confiscations-Locker",
      flavorText:
        "A bent warden has left the contraband-locker ajar and himself conveniently elsewhere. Inmates' gear, smuggled draughts, a blade or two the asylum never logged — all of it yours, for the right weight of coin in his pocket.",
    },
    bossDefId: 'asylum-director',
    boss: {
      title: "The Director's Chamber",
      flavorText:
        "A long vaulted room at the heart of the warden's wing — a desk at the far end with the asylum's ledgers stacked in perfect order, and behind it, in the silver-trim robe and the small round monocle, the man who has been signing the warrants. He does not look surprised. \"You will be still while I work.\"",
      xpReward: 1100,
      goldReward: 140,
    },
  },
  {
    chapter: 4,
    prefix: 'c4',
    pools: {
      warmup: UN_WARMUP_POOL,
      earlyMid: UN_EARLY_MID_POOL,
      mid: UN_MID_POOL,
      elite: UN_ELITE_POOL,
    },
    shrines: [
      {
        title: 'A Faerzress Sigil to Eilistraee',
        flavorText:
          "Hidden behind a fallen slab in the lower tunnels — a circle scratched in chalk, a moon-and-sword glyph at its centre. The drow goddess of the dance, the one Lolth's priestesses have a standing kill-order on. The bone-light flickers green here in a way that is not entirely natural.",
      },
      {
        title: "A Surface-Smuggled Altar to Selûne",
        flavorText:
          "A scrap of silver-moon tapestry pinned to a niche wall, half a candle-stub still warm. Some surface-elf slave from a previous caravan smuggled the moon-mother down here a prayer at a time. The drow priestesses have not yet found this one. The Lady is still listening.",
      },
    ],
    rests: [
      {
        title: 'A Disused Slave-Pen',
        flavorText:
          "A cage-tier the slavers have not stocked this season — the chains hang slack, the straw is old. The faerzress glow is dim enough here that the corridor-watch will not look in.",
      },
      {
        title: 'A Cold Faerzress Hollow',
        flavorText:
          "A pocket in the rock where the faerzress has guttered out — no glow, no warmth, and for that reason no drow patrol bothers to sweep it. The dark is total and, for once, on your side.",
      },
    ],
    shop: {
      title: "A Surface-Smuggler's Cache",
      flavorText:
        "A duergar smuggler runs surface-goods past the Lolthite tithe-takers and has a tarp of them spread on the stone — steel that doesn't crumble in the deep damp, draughts the priestesses would burn him for. He trades fast and watches the tunnel-mouth the whole time.",
    },
    bossDefId: 'drow-matron-mother',
    boss: {
      title: "The Matron Mother's Audience",
      flavorText:
        "The inner temple of Lolth — black basalt, eight-legged sigils in arterial red along the walls, the air thick with the resin-smoke the priestesses burn for visions. At the centre, on a low throne carved from a single spider's egg-case, the Matron Mother does not rise. \"You are not on the slave-roll. The exception is easily corrected.\"",
      xpReward: 1650,
      goldReward: 220,
    },
  },
  // Ch5 · The Godwake — past the Underdark, into the dead god of dawns that
  // could not let anything stay ended. Non-combat flavor authored here; the
  // chapter5Pools file ships only the encounter pools + threshold flavor.
  {
    chapter: 5,
    prefix: 'c5',
    pools: {
      warmup: GW_WARMUP_POOL,
      earlyMid: GW_EARLY_MID_POOL,
      mid: GW_MID_POOL,
      elite: GW_ELITE_POOL,
    },
    shrines: [
      {
        title: 'A Reliquary of Borrowed Mornings',
        flavorText:
          "A niche in the pale stone holds the dawn-god's cast-offs: a phial of the first light there ever was, gone cold and still; a sun-disc worn smooth by ten thousand grasping hands. The relics remember being holy. Press your palm to the cold glass, and for a moment so do you.",
      },
      {
        title: 'The Last Honest Altar',
        flavorText:
          "Some pilgrim who climbed this far before you scratched a true god's sign into the bleached floor — not the dawn that will not end, but one of the small surface gods who let their dead stay dead. The chalk is faint. The mercy in it is not. Kneel, while the kneeling still means something.",
      },
    ],
    rests: [
      {
        title: 'A Stair the Light Scoured White',
        flavorText:
          "A flight of steps the dawn has burned bone-pale, the corridor above fallen in behind you. Nothing reborn climbs this way — the cycle does not waste its risen on stairs that go nowhere. Sit. The light here is steady, and for once it asks nothing back.",
      },
      {
        title: 'The Lee of a Toppled Seraph',
        flavorText:
          "A hollow seraph fell here long enough ago that the light has bleached its armour to bone, and in the long shadow it throws the warmth of you is hidden from the song. For a little while the cycle's choir cannot find the tune of you, and you can close your eyes.",
      },
    ],
    shop: {
      title: "A Pilgrim's Cast-Off Cache",
      flavorText:
        "The dawn-god kept the coin and gear of every soul it ever turned and sent back, heaped where the climb steepens. Something that was once a pilgrim and is now only a habit sits the hoard, trading the dead's possessions for coin it has no more use for than they did. It does not haggle. It only counts.",
    },
    bossDefId: 'hollow-dawn',
    boss: {
      title: 'Where the Morning Will Not Break',
      flavorText:
        "The climb ends in a vault of fixed, sourceless dawn — no sun, no horizon, only the first light there ever was, held forever at the instant before it falls. At the centre of it Aurelach waits, luminous and vast and unspeakably tired, and as you cross the threshold it says your name — the one you wore before your first death, the one you do not remember — and adds, almost gently, \"You have come the whole way round again. Be still. Let the morning break on you as it has broken on all the others.\"",
      xpReward: 2000,
      goldReward: 280,
    },
  },
  // Ch6 · Beyond the Godwake — the Loom of Souls, the wheel itself, terminal
  // chapter. All non-combat flavor + the boss ship ready-to-wire in
  // CHAPTER6_FLAVOR; this entry only binds them to the pools.
  {
    chapter: CHAPTER6_FLAVOR.chapter,
    prefix: CHAPTER6_FLAVOR.prefix,
    pools: {
      warmup: LOOM_WARMUP_POOL,
      earlyMid: LOOM_EARLY_MID_POOL,
      mid: LOOM_MID_POOL,
      elite: LOOM_ELITE_POOL,
    },
    shrines: CHAPTER6_FLAVOR.shrines,
    rests: CHAPTER6_FLAVOR.rests,
    shop: CHAPTER6_FLAVOR.shop,
    bossDefId: CHAPTER6_FLAVOR.bossDefId,
    boss: CHAPTER6_FLAVOR.boss,
  },
  // ─── Chapter 7 · The Drowned Archive — the flooded vault of forbidden
  // knowledge that opens the L20 descent toward the captor, sunk below the
  // wheel. All non-combat flavor + the boss ship ready-to-wire in
  // CHAPTER7_FLAVOR; this entry only binds them to the pools. (Append-only:
  // sibling Ch8/Ch9 lanes add their entries after this one — keep-both.)
  {
    chapter: CHAPTER7_FLAVOR.chapter,
    prefix: CHAPTER7_FLAVOR.prefix,
    pools: {
      warmup: ARCHIVE_WARMUP_POOL,
      earlyMid: ARCHIVE_EARLY_MID_POOL,
      mid: ARCHIVE_MID_POOL,
      elite: ARCHIVE_ELITE_POOL,
    },
    shrines: CHAPTER7_FLAVOR.shrines,
    rests: CHAPTER7_FLAVOR.rests,
    shop: CHAPTER7_FLAVOR.shop,
    bossDefId: CHAPTER7_FLAVOR.bossDefId,
    boss: CHAPTER7_FLAVOR.boss,
  },
  // Ch8 · The Ashfall March — the war-burnt waste further down the descent
  // toward the captor, past the drowned archive. All non-combat flavor + the
  // boss ship ready-to-wire in CHAPTER8_FLAVOR; this entry only binds them to
  // the pools. (Sibling Ch9 lane appends after this one — keep-both, no reorder.)
  {
    chapter: CHAPTER8_FLAVOR.chapter,
    prefix: CHAPTER8_FLAVOR.prefix,
    pools: {
      warmup: ASH_WARMUP_POOL,
      earlyMid: ASH_EARLY_MID_POOL,
      mid: ASH_MID_POOL,
      elite: ASH_ELITE_POOL,
    },
    shrines: CHAPTER8_FLAVOR.shrines,
    rests: CHAPTER8_FLAVOR.rests,
    shop: CHAPTER8_FLAVOR.shop,
    bossDefId: CHAPTER8_FLAVOR.bossDefId,
    boss: CHAPTER8_FLAVOR.boss,
  },
  // Ch9 · The Court of Masks — the captor's fallen seat of liars and illusions,
  // deeper still on the descent: a ruined hall where nothing wears its true face.
  // All non-combat flavor + the boss ship ready-to-wire in CHAPTER9_FLAVOR; this
  // entry only binds them to the pools.
  {
    chapter: CHAPTER9_FLAVOR.chapter,
    prefix: CHAPTER9_FLAVOR.prefix,
    pools: {
      warmup: MASK_WARMUP_POOL,
      earlyMid: MASK_EARLY_MID_POOL,
      mid: MASK_MID_POOL,
      elite: MASK_ELITE_POOL,
    },
    shrines: CHAPTER9_FLAVOR.shrines,
    rests: CHAPTER9_FLAVOR.rests,
    shop: CHAPTER9_FLAVOR.shop,
    bossDefId: CHAPTER9_FLAVOR.bossDefId,
    boss: CHAPTER9_FLAVOR.boss,
  },
  // Ch10 · Suldanessellar — the hidden elven city stormed and burning as the
  // player climbs it toward the Tree of Life; Irenicus's green dragon guards the
  // last stair. All non-combat flavor + the boss ship in CHAPTER10_FLAVOR.
  {
    chapter: CHAPTER10_FLAVOR.chapter,
    prefix: CHAPTER10_FLAVOR.prefix,
    pools: {
      warmup: SULD_WARMUP_POOL,
      earlyMid: SULD_EARLY_MID_POOL,
      mid: SULD_MID_POOL,
      elite: SULD_ELITE_POOL,
    },
    shrines: CHAPTER10_FLAVOR.shrines,
    rests: CHAPTER10_FLAVOR.rests,
    shop: CHAPTER10_FLAVOR.shop,
    bossDefId: CHAPTER10_FLAVOR.bossDefId,
    boss: CHAPTER10_FLAVOR.boss,
  },
  // Ch11 · The Trials of the Pit — Irenicus's hells, each trial a sin made flesh,
  // ending in the captor himself (the SoA climax). Flavor + boss in CHAPTER11_FLAVOR.
  {
    chapter: CHAPTER11_FLAVOR.chapter,
    prefix: CHAPTER11_FLAVOR.prefix,
    pools: {
      warmup: PIT_WARMUP_POOL,
      earlyMid: PIT_EARLY_MID_POOL,
      mid: PIT_MID_POOL,
      elite: PIT_ELITE_POOL,
    },
    shrines: CHAPTER11_FLAVOR.shrines,
    rests: CHAPTER11_FLAVOR.rests,
    shop: CHAPTER11_FLAVOR.shop,
    bossDefId: CHAPTER11_FLAVOR.bossDefId,
    boss: CHAPTER11_FLAVOR.boss,
  },
  // Ch12 · The Siege of Saradush — ToB opens: the besieged city and the
  // fire-giant warlord Yaga-Shura whose heart is hidden away. Flavor + boss in
  // CHAPTER12_FLAVOR.
  {
    chapter: CHAPTER12_FLAVOR.chapter,
    prefix: CHAPTER12_FLAVOR.prefix,
    pools: {
      warmup: SARA_WARMUP_POOL,
      earlyMid: SARA_EARLY_MID_POOL,
      mid: SARA_MID_POOL,
      elite: SARA_ELITE_POOL,
    },
    shrines: CHAPTER12_FLAVOR.shrines,
    rests: CHAPTER12_FLAVOR.rests,
    shop: CHAPTER12_FLAVOR.shop,
    bossDefId: CHAPTER12_FLAVOR.bossDefId,
    boss: CHAPTER12_FLAVOR.boss,
  },
  // Ch13 · The Last of the Five — Sendai's Enclave and Abazigal's Lair, the last
  // Bhaalspawn lords before the throne. Flavor + boss in CHAPTER13_FLAVOR.
  {
    chapter: CHAPTER13_FLAVOR.chapter,
    prefix: CHAPTER13_FLAVOR.prefix,
    pools: {
      warmup: FIVE_WARMUP_POOL,
      earlyMid: FIVE_EARLY_MID_POOL,
      mid: FIVE_MID_POOL,
      elite: FIVE_ELITE_POOL,
    },
    shrines: CHAPTER13_FLAVOR.shrines,
    rests: CHAPTER13_FLAVOR.rests,
    shop: CHAPTER13_FLAVOR.shop,
    bossDefId: CHAPTER13_FLAVOR.bossDefId,
    boss: CHAPTER13_FLAVOR.boss,
  },
  // Ch14 · The Throne of Bhaal — the finale: the Pocket Plane throne and
  // Melissan, the biggest statblock in the game. The final chapter of the chain;
  // its boss room is left terminal by the stitcher below. Flavor + boss in
  // CHAPTER14_FLAVOR.
  {
    chapter: CHAPTER14_FLAVOR.chapter,
    prefix: CHAPTER14_FLAVOR.prefix,
    pools: {
      warmup: THRONE_WARMUP_POOL,
      earlyMid: THRONE_EARLY_MID_POOL,
      mid: THRONE_MID_POOL,
      elite: THRONE_ELITE_POOL,
    },
    shrines: CHAPTER14_FLAVOR.shrines,
    rests: CHAPTER14_FLAVOR.rests,
    shop: CHAPTER14_FLAVOR.shop,
    bossDefId: CHAPTER14_FLAVOR.bossDefId,
    boss: CHAPTER14_FLAVOR.boss,
  },
];

/**
 * Length of the continuous chain. Clearing this many chapter bosses in one run
 * means the whole chain fell to Melissan (Ch14) — the condition the first-clear
 * ending capstone gates on (delveStore.finishDelve).
 */
export { TOTAL_CHAPTERS } from './constants';

const GODWAKE_CAMPS: RoomFlavor[] = [
  {
    title: 'A Roadside Fire',
    flavorText:
      "Three days south of the Iron Cells the trees thin, and the Trade Way bends towards Amn. A caravan-merchant has a fire going by the milestone — kettle on, ox unhitched, a tarp pegged out in case the night turns. He looks up without surprise, as if he had been expecting someone walking out of the north on foot and bloody.",
  },
  {
    title: 'A Harbour-Lamp at the Docks',
    flavorText:
      "The Magistrate's hall is hours behind you and the docks of Athkatla have not yet been told. A harbour-merchant has set a lamp on a coil of rope at the end of the jetty — kettle in his hand, the keel of a smuggler's wherry ticking against the boards beneath. He sees the blood on your sleeve and offers a cup before he offers a name.",
  },
  {
    title: 'A Smuggler-Fire in the Underdark',
    flavorText:
      "Past the Director's wing the Cowled Wizards keep a service-shaft that drops into the Upperdark. At the first widening, a surface-smuggler has a chemical-fire going in a brass bowl that does not give off smoke. He has been waiting for someone who walked out of Spellhold alive. He has goods to move down. You have a road to walk.",
  },
  {
    title: 'A Fire at the Edge of the Light',
    flavorText:
      "The Matron's temple is behind you and the faerzress thins to nothing ahead, where a pale dawn-coloured glow leaks up through the floor of the world. A last camp on the lip of it — a deep-gnome exile who fled the Underdark and could go no further, a small cold fire that throws no shadow toward the light. He does not ask where you mean to go. He has seen the look before, on the others who climbed past him and did not come back down.",
  },
  {
    title: 'A Stillness Before the Wheel',
    flavorText:
      "Aurelach is dead, or as dead as a god of endings can be made, and the dawn it held has gone out. Where the light failed there is one last seam of quiet — no merchant here, only a guttering thing that was a pilgrim once, tending a fire out of habit at the rim of something too large to see the curve of. It pours you a cup with a hand worn nearly smooth. \"Past here the road only goes round,\" it says. \"You will want to be rested when you reach the part that turns.\"",
  },
  // ─── Chapter 7 seam · the descent below the wheel begins ──────────────────
  // (Append-only: sibling Ch8/Ch9 lanes add their camp seams after this one.)
  {
    title: 'The Lip of the Long Descent',
    flavorText:
      "The wheel is stopped — broken or refused, it makes no difference now — and where it stood the floor of the world has cracked open onto a stair that goes down, and down, into a dark that smells of cold salt water. Someone keeps a fire at the lip of it: a deep-salvager with a coil of sounding-rope and a lamp shuttered against the damp, who has lowered others into the drowned places below and hauled most of them back up empty. \"There's a library down there,\" she says, not looking at you, paying out rope hand over hand into the black. \"Sunk on purpose, by the one you're going down to find. They drowned it rather than let anyone read it. Whatever you think is waiting at the bottom — it knew you'd come this far. Rest while the lamp holds. The water doesn't care how tired you are.\"",
  },
  // Ch7→Ch8 seam: up out of the drowned stacks, the water gives way to ash and
  // the smell of old burning. The last fire before the ashfields. (Sibling Ch9
  // lane appends its seam after this one — keep-both, do not reorder.)
  {
    title: 'A Fire Where the Water Ends',
    flavorText:
      "The drowned stacks are behind you and below, and the water gives out all at once — the road lifts clear of the cold black into an air gone dry and bitter, tasting of grit and old burning before you can see what burns. At the last wet stone someone keeps a fire that has no business staying lit, a figure in the rags of a uniform you do not know, warming hands that long ago stopped feeling the warmth. \"You'll hear them before you see them,\" it says, not looking up — \"the drums, and the cadence, and a man who won't be told the war is over. There's a field ahead that has burned for a hundred years and an army on it that was never stood down. Dry off. Sleep if the cold will let you. You go into the ashfall come morning, and there's no morning down there to wake to.\"",
  },
  // Ch8→Ch9 seam: past the ashfields the road drops into a fallen palace of
  // mirrors and masks — the captor's own old court. The last fire before the
  // hall of liars.
  {
    title: 'A Fire Among the Broken Mirrors',
    flavorText:
      "The ashfield is behind you and the march has lost your beat, and the road tips down out of the grit into marble — a grand fallen stair, the burnt smell giving way to dust and old perfume and the faint, sourceless sound of music a hundred years stopped. Someone keeps a small fire on a cracked dance-floor, sat among shards of mirror that throw a dozen of your tired faces back at you, a hooded figure who does not turn round and whose reflection, you notice, does not quite match the back of its head. \"You're nearly down to it now,\" it says, watching you in the glass instead of over its shoulder. \"This was the captor's own house, before it was anything else — where it learned to be whatever a room needed, and rule by it. Everything past here will wear a face you trust. None of them mean it. Rest while you still know which face is yours; it's the one thing the Court will try hardest to take, and the only thing you can't climb the rest of the way down without.\"",
  },
  // Ch9→Ch10 seam: out of the hall of masks the road climbs again, up toward a
  // burning elven city and the Tree of Life the captor means to drain.
  {
    title: 'A Fire Beneath the Burning Boughs',
    flavorText:
      "The last mask is behind you and the music has stopped for good, and the broken stair turns upward — out of the captor's old house and into the open dark under a canopy lit orange from above, where a whole city is burning slow in the crowns of the trees. At the forest's edge a fugitive elf keeps a low fire that throws no light past its own ring, a bow unstrung across its knees because its hands have stopped being steady. \"That was Suldanessellar,\" it says, not taking its eyes from the glow. \"The hidden city. He has it now — charmed its watch, turned its woodland, loosed a dragon in the temple of the tree-father — and he is climbing it to the Tree of Life, to drain what the elves stripped from him and take back his godhood by the root. You can still beat him to the top. Rest. The climb is steep, and everything on it that was ours will try to kill you with our own hands.\"",
  },
  // Ch10→Ch11 seam: the Tree is reached too late — the captor drains it and
  // strikes you down, and you wake falling into his hells. No surface fire here;
  // a held breath on the threshold of the Pit.
  {
    title: 'A Breath on the Threshold of the Pit',
    flavorText:
      "You reach the Tree of Life with the dragon's blood still on you and you are too late by a held breath — the captor takes the last of its light as you watch, and takes yours with it, and the world tips out from under you into a long red falling. You come to rest on a ledge that is not a place so much as a held idea of one, hung over a pit that breathes. There is no merchant, no kettle; only a guttering soul-light someone left burning, and scratched beside it in a hand that shook: HE BUILT THIS OUT OF YOU. Below, smaller: each trial is a thing you carry — pride, greed, wrath, fear, the killer under your skin — and at the bottom of all of them, him. Breathe. Steady the thing you are before the Pit names it back to you.",
  },
  // Ch11→Ch12 seam: the captor is felled in his own hell and the Pit lets you go.
  // The descent ends; ToB opens with a Bhaalspawn war and a besieged city afire.
  {
    title: 'A Fire at the Edge of the Burning Siege',
    flavorText:
      "The captor is dead in the heart of his own hell and the Pit, having no further use for you, spits you back into a world that has moved on without you — and gone to war while it did. The road comes out of the dark onto a ridge above a walled city ringed in fire and giants, and at the ridge a refugee keeps a thin fire among others who fled the same gates. \"You've been gone a long while,\" an old woman says, feeding the flames a broken chair-leg. \"It's the Children now — the dead god's blood, all of us hunted for the divinity in it, and one of them means to make himself whole by murdering every brother and sister he can find. That's Saradush, burning. He's put a fire-giant warlord at its throat — Yaga-Shura, and they say his heart isn't in his body to be reached. You carry the same blood they're dying for. Rest while the wall still holds. After this the road only runs toward the throne.\"",
  },
  // Ch12→Ch13 seam: Saradush relieved, the warlord felled; the hunt narrows to
  // the last two Bhaalspawn lords before the throne stands open.
  {
    title: 'A Fire Between the Last Two Doors',
    flavorText:
      "Yaga-Shura's fire is finally out and Saradush, what's left of it, will stand. The road past the siege forks once and runs down toward two dark doors — a drow enclave sunk under a mountain and a dragon's lair in the deep waste — and between them a Harper agent keeps a watch-fire and a short list, two names left uncrossed. \"Sendai and Abazigal,\" she says, turning a blade over in the firelight. \"The last of the Five strong enough to matter. She's a drow matron with a petrified garden of everyone who came at her before; he's half a dragon and twice as proud. Kill them and there's no one left between you and the throne the dead god left empty — only the one already sitting on it, pretending to be your friend. Rest. You'll want both hands steady for the last two.\"",
  },
  // Ch13→Ch14 seam: the last lords fall and the Pocket Plane opens for the end.
  // The final fire before the Throne of Bhaal and the betrayer Melissan.
  // (Append-only — terminal seam; the finale chapter follows, then nothing.)
  {
    title: 'A Fire in the Pocket Plane',
    flavorText:
      "Sendai is stone among her own statues and Abazigal's pride has cooled at last, and the world thins around you until there is only the small folded plane that has been yours since the first death — your own pocket of the dead god's making, where the road has always come to rest. The fire here needs no keeper; it has been burning the whole way, waiting. Across it sits the only ally who came the whole distance with you, and for the first time will not meet your eye. \"It was her,\" your guide says quietly. \"Melissan — Amelyssan — the one who gathered the Five and set them killing each other, the one who has been steering you down this road from the start. She means to take all of it, every drop of the god's blood, and wake as Bhaal reborn. There is one door left, and the throne behind it. Rest, if you can. Everything has been for this, and there is no chapter after.\"",
  },
];

export function createGodwakeDelve(
  optsOrSeed: number | GodwakeDelveOptions = {},
): DelveState {
  const opts: GodwakeDelveOptions =
    typeof optsOrSeed === 'number' ? { seed: optsOrSeed } : optsOrSeed;
  const rng = createRng(opts.seed ?? randomSeed());

  // One delve never repeats a narrative beat: the event picker tracks used
  // templates across every chapter filter (eventsForChapter is cumulative).
  const usedEventIds = new Set<string>();
  function nextEvent(id: string, chapter: number): RoomSpec {
    const { room, templateId } = eventRoom(id, rng, chapter, usedEventIds);
    usedEventIds.add(templateId);
    return room;
  }

  const elitesEnabled = opts.elitesEnabled ?? true;
  const ascension = clampAscension(opts.ascension ?? 0);
  const chapters = GODWAKE_CHAPTERS.map((c) =>
    buildChapterNodes(rng, c, nextEvent, elitesEnabled, ascension),
  );
  const camps = GODWAKE_CAMPS.map((f, i) => campNode(`camp-${i + 1}`, i + 1, f));

  // Stitch the chapters together through the camp seams: each chapter boss
  // points at its camp, each camp at the next chapter's entry node. The final
  // boss (Melissan, Ch14) is left terminal.
  const rooms: RoomSpec[] = [];
  chapters.forEach((nodes, i) => {
    rooms.push(...nodes);
    if (i < camps.length) {
      const boss = nodes[nodes.length - 1];
      boss.next = [camps[i].id];
      camps[i].next = [chapters[i + 1][0].id];
      rooms.push(camps[i]);
    }
  });

  const entry = rooms[0];
  return {
    dungeonName: 'Godwake — From the Cells to the Spider',
    chapterId: 'godwake',
    rooms,
    currentRoomIdx: 0,
    currentRoomId: entry.id,
    visitedRoomIds: [entry.id],
    phase: 'in-room',
    roomsCleared: 0,
    goldEarned: 0,
    xpEarned: 0,
    ascensionLevel: ascension,
  };
}

export function currentRoom(state: DelveState): RoomSpec {
  return state.rooms[state.currentRoomIdx];
}

export function isFinalRoom(state: DelveState): boolean {
  return state.currentRoomIdx >= state.rooms.length - 1;
}

/** Look up a node by id. */
export function roomById(state: DelveState, id: string): RoomSpec | undefined {
  return state.rooms.find((r) => r.id === id);
}

/**
 * The nodes reachable by stepping forward from `room`. Empty for a terminal
 * node or a legacy linear delve (which navigates by array index instead).
 */
export function reachableRooms(state: DelveState, room: RoomSpec): RoomSpec[] {
  if (!room.next || room.next.length === 0) return [];
  return room.next
    .map((id) => roomById(state, id))
    .filter((r): r is RoomSpec => r !== undefined);
}

/**
 * Every non-camp node of a chapter, for the route map. Camps are the seams
 * between chapters and render as their own full screen, so they're excluded.
 */
export function chapterMapNodes(state: DelveState, chapter: number): RoomSpec[] {
  return state.rooms.filter((r) => r.chapter === chapter && r.kind !== 'camp');
}
