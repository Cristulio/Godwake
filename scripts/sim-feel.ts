/**
 * Game-FEEL harness — measures what Godwake is like to PLAY moment-to-moment,
 * not whether it's balanced. Companion to the balance sims; same engine, same
 * trusted policy (`chooseCombatAction` / `runAutoTurn` from actionPolicy, the
 * AI a watching player sees), but it instruments the texture of the experience:
 *
 *   - PACING       rounds/fight distribution, run length, and "dead turns"
 *                  (turns where the bot has no real choice) as a % of turns.
 *   - AGENCY       meaningful decisions per run, decomposed by source. The
 *                  delve map is a fixed linear array → path-choices = 0 (the
 *                  headline number the branching-map fix would move).
 *   - VARIETY      enemy-type repeat rate, action-kind entropy per fight
 *                  (button-spam), and build divergence across lives.
 *   - TENSION      blowouts (won with no HP threat), near-death-and-recover
 *                  frequency, and the min-HP distribution per fight.
 *   - INTENT       how many enemy turns carry a telegraph-worthy special
 *                  (paralyze/debuff/summon/sustain/multiattack) — the lever the
 *                  enemy-intent-telegraph fix would move — and how many of the
 *                  player's dead turns sit next to one (rescuable by telegraph).
 *
 * Plus a turn-by-turn NARRATED run for the felt diary.
 *
 * Analysis only — writes docs/sim-findings/game-feel.raw.md. The curated
 * reading + the tier-3 fix mapping live in docs/sim-findings/game-feel.md.
 *
 * Runs at ascension 0 (base feel, not the difficulty ladder). Absolute reach
 * numbers are an AI-floor artifact (see feedback-balance-from-sims + the
 * character-order caveats) — read the SHAPE relatively, not the magnitudes.
 *
 *   RUNS=40 npx tsx scripts/sim-feel.ts   # default
 *   RUNS=5  npx tsx scripts/sim-feel.ts   # smoke
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack';
import { endTurn } from '../src/engine/combat/turn';
import {
  chooseCombatAction,
  applyPlannedAction,
  liveMonstersOf,
} from '../src/engine/combat/actionPolicy';
import { isRaging, characterHasMechanic } from '../src/engine/character/derived';
import { simulateLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest, withResetActionEconomy } from '../src/engine/character/actions';
import { characterAtLevel, pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import type { Character } from '../src/types/character';
import type { CombatState } from '../src/types/combat';
import type { RoomSpec } from '../src/types/delve';
import type { ClassId } from '../src/schemas/ids';

// ─── Config ────────────────────────────────────────────────────────────────

const CLASSES: ClassId[] = ['rogue', 'fighter', 'wizard', 'barbarian', 'ranger'];
const START_LEVELS = [1, 3, 5, 7];
const RUNS_PER_CELL = Number(process.env.RUNS ?? 40);
const SEED_BASE = 0xfee1 >>> 0;
const MAX_ROUNDS = 25;
const MAX_STEPS = MAX_ROUNDS * 8;

/** Monster action kinds whose intent a player can't currently see but would
 *  change the optimal play if telegraphed. A plain attack's "intent" is just
 *  its damage, already implied by the threat model — excluded. */
const INTENT_KINDS = new Set(['paralyze', 'debuff', 'summon', 'sustain', 'multiattack']);

/** Below this min-HP fraction in a won fight, the fight had real teeth. */
const NEAR_DEATH = 0.3;
/** A won fight whose HP never dipped below this was a zero-tension blowout. */
const BLOWOUT_FLOOR = 0.8;
/** Drink-or-hold a potion is only a live decision while not near-full. */
const POTION_DECISION_HP = 0.7;

// ─── Intent classification (cached) ──────────────────────────────────────────

const intentCache = new Map<string, boolean>();
function isIntentBearing(defId: string): boolean {
  const hit = intentCache.get(defId);
  if (hit !== undefined) return hit;
  let v = false;
  try {
    v = getMonster(defId).actions.some((a) => INTENT_KINDS.has(a.kind));
  } catch {
    v = false;
  }
  intentCache.set(defId, v);
  return v;
}

// ─── Per-turn decision profile ───────────────────────────────────────────────

interface DecisionProfile {
  liveEnemies: number;
  targetChoice: boolean;
  resourceChoice: boolean;
  resourceKinds: string[];
  /** No target choice AND no discretionary resource — "attack the one thing." */
  dead: boolean;
  /** A telegraph-worthy enemy is alive this turn. */
  intentEnemyAlive: boolean;
}

function anySpellSlot(c: Character): boolean {
  const slots = c.resources.spellSlots ?? {};
  return Object.values(slots).some((v) => (v ?? 0) > 0);
}

function markOnLiveTarget(state: CombatState): boolean {
  const id = state.huntersMarkTargetId;
  if (!id) return false;
  return liveMonstersOf(state).some((m) => m.id === id);
}

/**
 * Classify the decision the player faces at the START of their turn (fresh
 * action economy). A turn is a "real decision" when there's a target choice
 * (≥2 live enemies → who to focus) OR a discretionary resource/ability the
 * player could deploy or hold this turn. Otherwise it's a "dead turn": the only
 * reasonable line is a basic attack on the lone enemy.
 */
function decisionProfile(state: CombatState, c: Character): DecisionProfile {
  const live = liveMonstersOf(state);
  const n = live.length;
  const targetChoice = n >= 2;
  const hpPct = c.hp.current / c.hp.max;
  const resourceKinds: string[] = [];

  if (c.inventory.some((r) => r.itemId === 'potion-of-healing') && hpPct < POTION_DECISION_HP) {
    resourceKinds.push('potion');
  }
  switch (c.classId) {
    case 'fighter':
      if (
        (c.resources.secondWindAvailable === true ||
          (c.resources.secondWindBonusRemaining ?? 0) > 0) &&
        c.hp.current < c.hp.max
      ) {
        resourceKinds.push('second-wind');
      }
      if ((c.resources.actionSurgeRemaining ?? 0) > 0) resourceKinds.push('action-surge');
      break;
    case 'rogue':
      if ((c.resources.cunningActionUsesRemaining ?? 0) > 0) resourceKinds.push('cunning-action');
      break;
    case 'barbarian':
      if (!isRaging(c)) resourceKinds.push('rage');
      break;
    case 'ranger':
      if (characterHasMechanic(c, 'hunters-mark') && !markOnLiveTarget(state)) {
        resourceKinds.push('hunters-mark');
      }
      break;
    case 'wizard':
      if (anySpellSlot(c) && n >= 1) resourceKinds.push('spell-choice');
      break;
  }

  const resourceChoice = resourceKinds.length > 0;
  return {
    liveEnemies: n,
    targetChoice,
    resourceChoice,
    resourceKinds,
    dead: !(targetChoice || resourceChoice),
    intentEnemyAlive: live.some((m) => isIntentBearing(m.instance.defId)),
  };
}

// ─── Fight + run records ─────────────────────────────────────────────────────

interface TurnRecord {
  round: number;
  profile: DecisionProfile;
  /** PlannedAction kinds actually dispatched this turn (excludes end-turn). */
  actions: string[];
}

interface FightRecord {
  roomTitle: string;
  isBoss: boolean;
  chapter: number;
  enemyDefIds: string[];
  enemyInstanceDefIds: string[];
  compositionKey: string;
  intentBearing: boolean;
  rounds: number;
  victory: boolean;
  turns: TurnRecord[];
  enemyTurns: number;
  intentEnemyTurns: number;
  startHpPct: number;
  minHpPct: number;
  endHpPct: number;
}

interface RunRecord {
  classId: ClassId;
  startLevel: number;
  cleared: boolean;
  roomsReached: number;
  combatRoomsWon: number;
  fights: FightRecord[];
  shrineSites: number;
  blessingPicks: number;
  restSites: number;
  eventSites: number;
  shopSites: number;
  pathChoices: number;
  levelUps: number;
  blessingsFinal: string[];
  /** defId of every enemy instance fought, in order — for repeat-rate. */
  enemyInstanceSeq: string[];
}

function monsterDefIdOf(state: CombatState, id: string): string | null {
  const c = state.combatants.find((x) => x.id === id);
  return c && c.kind === 'monster' ? c.instance.defId : null;
}

// ─── Combat driver (instrumented runAutoTurn) ────────────────────────────────

function runFight(
  roller: DiceRoller,
  characterIn: Character,
  room: RoomSpec,
  diary: string[] | null,
  chapter = 0,
): { fight: FightRecord; character: Character } {
  _resetMonsterInstanceCounter();
  const monsterRefs = (room.monsters ?? []).flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, (_, i) => ({
      def,
      displayName: rm.displayPrefix ? `${rm.displayPrefix} ${i + 1}` : def.name,
    }));
  });

  // Match the real flow: DelveScreen resets the player's action economy on
  // combat entry (you get a full fresh turn), so do the same here — otherwise
  // a fight's round-1 turn inherits a spent action from the prior fight.
  const isBoss = room.kind === 'boss';
  const init = createCombat({
    roller,
    character: withResetActionEconomy(characterIn),
    monsters: monsterRefs,
    isBoss,
  });
  let s = init.state;
  let ch = init.character;

  const startHpPct = ch.hp.current / ch.hp.max;
  let minHpPct = startHpPct;
  const turns: TurnRecord[] = [];
  let enemyTurns = 0;
  let intentEnemyTurns = 0;

  const enemyInstanceDefIds = monsterRefs.map((m) => m.def.id);
  const enemyDefIds = [...new Set(enemyInstanceDefIds)];
  const compositionKey = countKey(enemyInstanceDefIds);
  const intentBearing = isBoss || enemyDefIds.some((d) => isIntentBearing(d));

  if (diary) {
    diary.push(
      `\n### ${room.kind === 'boss' ? 'BOSS — ' : ''}${room.title} — ${describeEnemies(monsterRefs)}`,
    );
    diary.push(
      `_Enter at ${Math.round(startHpPct * 100)}% HP (${ch.hp.current}/${ch.hp.max}).${
        intentBearing ? ' Enemy has a telegraph-worthy special.' : ''
      }_`,
    );
  }

  let guard = 0;
  while (s.status === 'active' && guard < MAX_STEPS) {
    guard += 1;
    if (s.round > MAX_ROUNDS) break;
    const currentId = s.turnOrder[s.currentTurnIndex];

    if (currentId === 'player') {
      if (ch.hp.current <= 0) break;
      const profile = decisionProfile(s, ch);
      const rec: TurnRecord = { round: s.round, profile, actions: [] };
      for (let i = 0; i < 16; i += 1) {
        if (s.status !== 'active') break;
        const action = chooseCombatAction(s, ch);
        if (action.kind === 'end-turn') break;
        const r = applyPlannedAction({ roller, state: s, character: ch }, action);
        if (r.state === s && r.character === ch) break;
        rec.actions.push(action.kind);
        s = r.state;
        ch = r.character;
        minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      }
      turns.push(rec);
      if (diary) diary.push(narratePlayerTurn(rec, ch));
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      enemyTurns += 1;
      const defId = monsterDefIdOf(s, currentId);
      const acting = defId ? isIntentBearing(defId) : false;
      if (acting) intentEnemyTurns += 1;
      const hpBefore = ch.hp.current;
      const tempBefore = ch.hp.temp;
      const r = monsterAttack({ roller, character: ch, state: s }, currentId);
      s = r.state;
      ch = r.character;
      minHpPct = Math.min(minHpPct, ch.hp.current / ch.hp.max);
      if (diary) diary.push(narrateEnemyTurn(s, currentId, hpBefore, tempBefore, ch, acting));
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }

  const victory = s.status === 'player-victory';
  const endHpPct = victory ? ch.hp.current / ch.hp.max : 0;
  if (diary) {
    diary.push(
      `_${victory ? 'Cleared' : 'DIED'} in ${s.round} round(s). Min HP this fight: ${Math.round(
        minHpPct * 100,
      )}%.${
        victory && minHpPct >= BLOWOUT_FLOOR ? ' Zero-tension blowout.' : ''
      }${victory && minHpPct < NEAR_DEATH ? ' Clutch survival.' : ''}_`,
    );
  }

  return {
    fight: {
      roomTitle: room.title,
      isBoss,
      chapter,
      enemyDefIds,
      enemyInstanceDefIds,
      compositionKey,
      intentBearing,
      rounds: s.round,
      victory,
      turns,
      enemyTurns,
      intentEnemyTurns,
      startHpPct,
      minHpPct,
      endHpPct,
    },
    character: ch,
  };
}

// ─── Run driver (walk the full Godwake delve) ────────────────────────────────

function runOneDelve(
  classId: ClassId,
  startLevel: number,
  seed: number,
  diary: string[] | null,
): RunRecord {
  const roller = createDiceRoller(seed);
  setActiveRoller(seed);
  let character = characterAtLevel(classId, startLevel);
  const delve = createGodwakeDelve({ seed });

  const rec: RunRecord = {
    classId,
    startLevel,
    cleared: false,
    roomsReached: 0,
    combatRoomsWon: 0,
    fights: [],
    shrineSites: 0,
    blessingPicks: 0,
    restSites: 0,
    eventSites: 0,
    shopSites: 0,
    pathChoices: 0,
    levelUps: 0,
    blessingsFinal: [],
    enemyInstanceSeq: [],
  };

  let died = false;
  const byId = new Map(delve.rooms.map((r) => [r.id, r] as const));
  const isBranching = delve.rooms.some((r) => (r.next?.length ?? 0) > 0);
  let curId: string | undefined = delve.rooms[0]?.id;
  const guard = new Set<string>();
  while (curId && !guard.has(curId)) {
    guard.add(curId);
    const room = byId.get(curId);
    if (!room) break;
    rec.roomsReached += 1;

    if (room.kind === 'rest') {
      rec.restSites += 1;
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      if (diary) diary.push(`\n_(rest: ${room.title} — sim auto-heals; the 3-choice fork isn't exercised)_`);
    } else if (room.kind === 'camp') {
      rec.restSites += 1;
      character = longRest(character);
      if (diary) diary.push(`\n_(camp: ${room.title} — full long rest)_`);
    } else if (room.kind === 'shrine') {
      rec.shrineSites += 1;
      const before = character.blessings.length;
      character = pickBlessingAtShrine(roller, character);
      const took = character.blessings.length > before;
      if (took) rec.blessingPicks += 1;
      if (diary) {
        diary.push(
          `\n_(shrine: ${room.title} — ${
            took ? `picked ${character.blessings[character.blessings.length - 1]}` : 'no new pick'
          })_`,
        );
      }
    } else if (room.kind === 'event') {
      rec.eventSites += 1;
      if (diary) diary.push(`\n_(event: ${room.title} — sim auto-skips the choice)_`);
    } else if (room.kind === 'shop') {
      rec.shopSites += 1;
      if (diary) diary.push(`\n_(shop: ${room.title} — sim skips buying)_`);
    } else if (room.kind === 'treasure') {
      // no-op
    } else {
      const { fight, character: after } = runFight(roller, character, room, diary, room.chapter ?? 0);
      character = after;
      rec.fights.push(fight);
      rec.enemyInstanceSeq.push(...fight.enemyInstanceDefIds);

      if (!fight.victory) {
        died = true;
        break;
      }
      rec.combatRoomsWon += 1;

      const xp = room.xpReward ?? 0;
      if (xp > 0) {
        character = { ...character, xp: character.xp + xp };
        while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
          character = simulateLevelUp(character);
          rec.levelUps += 1;
        }
      }
    }

    // Route to the next node along the branching map. A node with ≥2 reachable
    // successors is a real fork the player picks (counted as agency); 1 is a
    // forced step; 0 is the terminal final boss.
    const nexts = room.next ?? [];
    if (nexts.length >= 2) rec.pathChoices += 1;
    if (nexts.length >= 1) {
      const idx =
        nexts.length === 1
          ? 0
          : roller.roll({ count: 1, die: 20, modifier: 0 }).total % nexts.length;
      curId = nexts[idx];
    } else if (isBranching || room.kind === 'boss') {
      break; // terminal node (final boss)
    } else {
      const ni = delve.rooms.findIndex((r) => r.id === curId) + 1;
      curId = ni > 0 && ni < delve.rooms.length ? delve.rooms[ni].id : undefined;
    }
  }

  rec.cleared = !died;
  rec.blessingsFinal = [...character.blessings].sort();
  return rec;
}

// ─── Narration helpers ───────────────────────────────────────────────────────

function describeEnemies(refs: Array<{ def: { name: string } }>): string {
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.def.name, (counts.get(r.def.name) ?? 0) + 1);
  return [...counts.entries()].map(([n, c]) => (c > 1 ? `${c}× ${n}` : n)).join(', ');
}

function narratePlayerTurn(rec: TurnRecord, ch: Character): string {
  const p = rec.profile;
  const tag = p.dead ? 'AUTOPILOT' : p.targetChoice && p.resourceChoice ? 'CHOICE' : p.targetChoice ? 'TARGET' : 'RESOURCE';
  const acts = rec.actions.length ? rec.actions.join(' + ') : 'nothing';
  const hp = `${Math.round((ch.hp.current / ch.hp.max) * 100)}%`;
  return `- R${rec.round} player [${tag}, ${p.liveEnemies} foe(s)]: ${acts}. → HP ${hp}`;
}

function narrateEnemyTurn(
  s: CombatState,
  id: string,
  hpBefore: number,
  tempBefore: number,
  ch: Character,
  intent: boolean,
): string {
  const c = s.combatants.find((x) => x.id === id);
  const name = c && c.kind === 'monster' ? c.instance.displayName : id;
  const dmg = hpBefore + tempBefore - (ch.hp.current + ch.hp.temp);
  const hp = `${Math.round((ch.hp.current / ch.hp.max) * 100)}%`;
  const note = intent ? ' [telegraph-worthy enemy]' : '';
  return `- enemy ${name}${note}: ${dmg > 0 ? `dealt ${dmg}` : 'no damage'}. → player HP ${hp}`;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function countKey(ids: string[]): string {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return [...m.entries()].sort().map(([k, v]) => `${k}:${v}`).join(',');
}

function entropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const v of Object.values(counts)) {
    if (v > 0) {
      const p = v / total;
      h -= p * Math.log2(p);
    }
  }
  return h;
}

function jaccardDistance(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const union = new Set([...sa, ...sb]);
  if (union.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  return 1 - inter / union.size;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();
  const runs: RunRecord[] = [];

  let seedCursor = SEED_BASE;
  for (const cls of CLASSES) {
    for (const L of START_LEVELS) {
      for (let i = 0; i < RUNS_PER_CELL; i += 1) {
        const seed = (seedCursor * 2654435761 + i * 40503 + L * 7919) >>> 0;
        runs.push(runOneDelve(cls, L, seed, null));
      }
      seedCursor = (seedCursor + 1013904223) >>> 0;
    }
  }

  // ── Flatten fights ──
  const fights = runs.flatMap((r) => r.fights);
  const allTurns = fights.flatMap((f) => f.turns);

  // ── PACING ──
  const roundsBuckets: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4-5': 0,
    '6-8': 0,
    '9-12': 0,
    '13+': 0,
  };
  for (const f of fights) {
    const r = f.rounds;
    if (r <= 1) roundsBuckets['1'] += 1;
    else if (r === 2) roundsBuckets['2'] += 1;
    else if (r === 3) roundsBuckets['3'] += 1;
    else if (r <= 5) roundsBuckets['4-5'] += 1;
    else if (r <= 8) roundsBuckets['6-8'] += 1;
    else if (r <= 12) roundsBuckets['9-12'] += 1;
    else roundsBuckets['13+'] += 1;
  }
  const avgRounds = fights.reduce((a, f) => a + f.rounds, 0) / Math.max(1, fights.length);
  const bossFights = fights.filter((f) => f.isBoss);
  const nonBoss = fights.filter((f) => !f.isBoss);
  const avgRoundsBoss = bossFights.reduce((a, f) => a + f.rounds, 0) / Math.max(1, bossFights.length);
  const avgRoundsNon = nonBoss.reduce((a, f) => a + f.rounds, 0) / Math.max(1, nonBoss.length);

  // ── DEAD TURNS ──
  const deadTurns = allTurns.filter((t) => t.profile.dead).length;
  const targetTurns = allTurns.filter((t) => t.profile.targetChoice).length;
  const resourceTurns = allTurns.filter((t) => t.profile.resourceChoice).length;
  const oneEnemyTurns = allTurns.filter((t) => t.profile.liveEnemies <= 1).length;
  // Revealed autopilot: regardless of what was *available*, the turn was
  // nothing but basic weapon attacks on a single enemy — "press attack."
  const isPureAttack = (t: TurnRecord) => t.actions.length > 0 && t.actions.every((a) => a === 'attack');
  const pureAttackTurns = allTurns.filter(isPureAttack).length;
  const revealedAutopilot = allTurns.filter((t) => isPureAttack(t) && t.profile.liveEnemies <= 1).length;
  const nonAttackTurns = allTurns.filter((t) => t.actions.some((a) => a !== 'attack')).length;
  const deadByClass = new Map<ClassId, { dead: number; total: number }>();
  for (const cls of CLASSES) deadByClass.set(cls, { dead: 0, total: 0 });
  for (const r of runs) {
    const bucket = deadByClass.get(r.classId)!;
    for (const f of r.fights) {
      for (const t of f.turns) {
        bucket.total += 1;
        if (t.profile.dead) bucket.dead += 1;
      }
    }
  }

  // ── INTENT ──
  const totalEnemyTurns = fights.reduce((a, f) => a + f.enemyTurns, 0);
  const intentEnemyTurns = fights.reduce((a, f) => a + f.intentEnemyTurns, 0);
  const fightsWithIntent = fights.filter((f) => f.intentBearing).length;
  const deadAdjIntent = allTurns.filter((t) => t.profile.dead && t.profile.intentEnemyAlive).length;

  // ── TENSION ──
  const wins = fights.filter((f) => f.victory);
  const blowouts = wins.filter((f) => f.minHpPct >= BLOWOUT_FLOOR).length;
  const trivialWins = wins.filter((f) => f.minHpPct >= 0.5).length;
  const nearDeathRecover = wins.filter((f) => f.minHpPct < NEAR_DEATH && f.endHpPct >= 0.5).length;
  const minHpBuckets: Record<string, number> = {
    '<10%': 0,
    '10-30%': 0,
    '30-50%': 0,
    '50-80%': 0,
    '80-100%': 0,
  };
  for (const f of fights) {
    const m = f.minHpPct;
    if (m < 0.1) minHpBuckets['<10%'] += 1;
    else if (m < 0.3) minHpBuckets['10-30%'] += 1;
    else if (m < 0.5) minHpBuckets['30-50%'] += 1;
    else if (m < 0.8) minHpBuckets['50-80%'] += 1;
    else minHpBuckets['80-100%'] += 1;
  }

  // Blowout rate per chapter (non-boss fights only, to isolate trash-fight texture).
  const chapterBlowouts = new Map<number, { wins: number; blowouts: number }>();
  for (const f of fights) {
    if (f.isBoss) continue;
    const ch = f.chapter;
    const b = chapterBlowouts.get(ch) ?? { wins: 0, blowouts: 0 };
    if (f.victory) {
      b.wins += 1;
      if (f.minHpPct >= BLOWOUT_FLOOR) b.blowouts += 1;
    }
    chapterBlowouts.set(ch, b);
  }

  // Top blowout compositions: rank by blowout count, show rate.
  interface CompAgg { wins: number; blowouts: number; rounds: number }
  const compAgg = new Map<string, CompAgg>();
  for (const f of wins) {
    const a = compAgg.get(f.compositionKey) ?? { wins: 0, blowouts: 0, rounds: 0 };
    a.wins += 1;
    a.rounds += f.rounds;
    if (f.minHpPct >= BLOWOUT_FLOOR) a.blowouts += 1;
    compAgg.set(f.compositionKey, a);
  }
  const topBlowoutComps = [...compAgg.entries()]
    .filter(([, a]) => a.wins >= 5)
    .sort((a, b) => b[1].blowouts / b[1].wins - a[1].blowouts / a[1].wins)
    .slice(0, 20);

  // ── VARIETY: action entropy + button share by class ──
  const actionByClass = new Map<ClassId, Record<string, number>>();
  for (const cls of CLASSES) actionByClass.set(cls, {});
  for (const r of runs) {
    const acc = actionByClass.get(r.classId)!;
    for (const f of r.fights) {
      for (const t of f.turns) {
        for (const a of t.actions) acc[a] = (acc[a] ?? 0) + 1;
      }
    }
  }
  // per-fight distinct action kinds
  const perFightDistinct =
    fights.reduce((a, f) => {
      const kinds = new Set<string>();
      for (const t of f.turns) for (const k of t.actions) kinds.add(k);
      return a + kinds.size;
    }, 0) / Math.max(1, fights.length);

  // ── VARIETY: enemy repeat rate within a run ──
  let repeatInstances = 0;
  let totalInstances = 0;
  const distinctPerRun: number[] = [];
  for (const r of runs) {
    if (r.enemyInstanceSeq.length === 0) continue;
    const seen = new Set<string>();
    for (const d of r.enemyInstanceSeq) {
      totalInstances += 1;
      if (seen.has(d)) repeatInstances += 1;
      else seen.add(d);
    }
    distinctPerRun.push(seen.size);
  }
  const avgDistinctEnemiesPerRun =
    distinctPerRun.reduce((a, b) => a + b, 0) / Math.max(1, distinctPerRun.length);

  // ── VARIETY: build divergence per class (runs with ≥1 blessing) ──
  const buildDiv = new Map<ClassId, { runsWithBuild: number; distinctSets: number; meanBlessings: number; meanJaccard: number }>();
  for (const cls of CLASSES) {
    const sets = runs
      .filter((r) => r.classId === cls && r.blessingsFinal.length > 0)
      .map((r) => r.blessingsFinal);
    const keys = new Set(sets.map((s) => s.join('|')));
    const meanBlessings = sets.reduce((a, s) => a + s.length, 0) / Math.max(1, sets.length);
    let jSum = 0;
    let jPairs = 0;
    const sample = sets.slice(0, 120);
    for (let i = 0; i < sample.length; i += 1) {
      for (let j = i + 1; j < sample.length; j += 1) {
        jSum += jaccardDistance(sample[i], sample[j]);
        jPairs += 1;
      }
    }
    buildDiv.set(cls, {
      runsWithBuild: sets.length,
      distinctSets: keys.size,
      meanBlessings,
      meanJaccard: jPairs > 0 ? jSum / jPairs : 0,
    });
  }

  // ── AGENCY per run (averages) ──
  const nRuns = runs.length;
  const avg = (sel: (r: RunRecord) => number) => runs.reduce((a, r) => a + sel(r), 0) / nRuns;
  const realDecisionTurnsPerRun = avg((r) =>
    r.fights.reduce((a, f) => a + f.turns.filter((t) => !t.profile.dead).length, 0),
  );
  const combatTurnsPerRun = avg((r) =>
    r.fights.reduce((a, f) => a + f.turns.length, 0),
  );

  // ── Run length per class × level ──
  interface CellAgg {
    runs: number;
    cleared: number;
    reach: number;
    won: number;
    fights: number;
  }
  const cells = new Map<string, CellAgg>();
  for (const r of runs) {
    const key = `${r.classId}|${r.startLevel}`;
    const c = cells.get(key) ?? { runs: 0, cleared: 0, reach: 0, won: 0, fights: 0 };
    c.runs += 1;
    c.cleared += r.cleared ? 1 : 0;
    c.reach += r.roomsReached;
    c.won += r.combatRoomsWon;
    c.fights += r.fights.length;
    cells.set(key, c);
  }

  // ── Narrated representative run ──
  const diary: string[] = [];
  const narrSeed = (SEED_BASE * 2654435761 + 5 * 7919) >>> 0;
  const narr = runOneDelve('fighter', 5, narrSeed, diary);

  // ─── Render ───
  const L: string[] = [];
  L.push('# Game-feel metrics — raw output\n');
  L.push(
    `> Auto-generated by \`scripts/sim-feel.ts\`. Re-run with \`RUNS=${RUNS_PER_CELL} npx tsx scripts/sim-feel.ts\`.\n> Curated reading + the tier-3 fix mapping live in [\`game-feel.md\`](./game-feel.md).\n`,
  );
  L.push(
    `**Scope:** ${CLASSES.length} classes × ${START_LEVELS.length} start levels × ${RUNS_PER_CELL} runs = **${nRuns} full-delve runs** at ascension 0. Trusted policy (\`chooseCombatAction\`/\`runAutoTurn\`), blessings via \`chooseBlessing\`. **${fights.length} fights, ${allTurns.length} player turns, ${totalEnemyTurns} enemy turns.** Wall: ${((Date.now() - t0) / 1000).toFixed(1)}s.`,
  );
  L.push(
    `\n**Read relatively, not absolutely.** Reach / clear / win counts are the AI-floor artifact flagged in the balance memory; this lane measures the SHAPE of the experience.`,
  );

  // PACING
  L.push('\n## 1. Pacing — rounds per fight, dead turns\n');
  L.push(`- **Avg rounds/fight:** ${f2(avgRounds)} (non-boss ${f2(avgRoundsNon)}, boss ${f2(avgRoundsBoss)}).`);
  L.push('- **Rounds-per-fight distribution:**\n');
  L.push('| Rounds | Fights | Share |');
  L.push('|--------|-------:|------:|');
  for (const [k, v] of Object.entries(roundsBuckets)) {
    L.push(`| ${k} | ${v} | ${pct(v / Math.max(1, fights.length))} |`);
  }
  L.push(
    `\n- **Dead turns** (no target choice AND no discretionary resource → "attack the one thing in front of you"): **${pct(
      deadTurns / Math.max(1, allTurns.length),
    )}** of ${allTurns.length} player turns.`,
  );
  L.push(`  - turns vs a single enemy: ${pct(oneEnemyTurns / Math.max(1, allTurns.length))}`);
  L.push(`  - turns with a target choice (≥2 foes): ${pct(targetTurns / Math.max(1, allTurns.length))}`);
  L.push(`  - turns with a discretionary resource/ability: ${pct(resourceTurns / Math.max(1, allTurns.length))}`);
  L.push(
    `\n- **Revealed autopilot** (what the bot actually DID — the whole turn was basic weapon attacks on a single enemy, no spell/item/ability): **${pct(
      revealedAutopilot / Math.max(1, allTurns.length),
    )}** of player turns. (Pure-attack turns regardless of enemy count: ${pct(
      pureAttackTurns / Math.max(1, allTurns.length),
    )}; turns that used a non-attack action: ${pct(nonAttackTurns / Math.max(1, allTurns.length))}.)`,
  );
  L.push(
    `  - The gap between the ${pct(deadTurns / Math.max(1, allTurns.length))} "no lever available" floor and the ${pct(
      revealedAutopilot / Math.max(1, allTurns.length),
    )} "just attacked the lone enemy" figure is turns where a lever *existed* (a held Action Surge, a spare slot) but pressing attack was the obvious play.`,
  );
  L.push('\n- **Dead-turn rate by class** (texture differs sharply by kit):\n');
  L.push('| Class | Player turns | Dead turns | Dead % |');
  L.push('|-------|-------------:|-----------:|-------:|');
  for (const cls of CLASSES) {
    const b = deadByClass.get(cls)!;
    L.push(`| ${cls} | ${b.total} | ${b.dead} | ${pct(b.dead / Math.max(1, b.total))} |`);
  }

  // AGENCY
  L.push('\n## 2. Agency — meaningful decisions per run, by source\n');
  L.push('| Decision source | Avg per run | Note |');
  L.push('|-----------------|------------:|------|');
  L.push(`| Path choices (map routing) | ${f2(avg((r) => r.pathChoices))} | forks (≥2 reachable nodes) the player picks per run — the branching map |`);
  L.push(`| Shop nodes reached | ${f2(avg((r) => r.shopSites))} | the \`shop\` room kind now exists; sim skips buying |`);
  L.push(`| Rest forks | 0.00 | ${f2(avg((r) => r.restSites))} rest/camp sites/run, all heal-only (no fork) |`);
  L.push(`| Shrine blessing picks | ${f2(avg((r) => r.blessingPicks))} | real out-of-combat agency (${f2(avg((r) => r.shrineSites))} sites/run) |`);
  L.push(`| Event choices | ${f2(avg((r) => r.eventSites))} | sites/run; sim auto-skips; some are free-upside (no real fork) |`);
  L.push(`| Level-ups | ${f2(avg((r) => r.levelUps))} | automatic — fixed class progression, no player choice |`);
  L.push(`| Combat real-decision turns | ${f1(realDecisionTurnsPerRun)} | of ${f1(combatTurnsPerRun)} combat turns/run |`);
  L.push(
    `\nThe run-structure layer (path routing + shop + rest) now contributes real choices via the branching map — see the path-choices row above. Combat target/resource decisions and shrine picks remain the rest of the agency.`,
  );

  // VARIETY
  L.push('\n## 3. Variety / repetition\n');
  L.push(`- **Enemy-type repeat rate within a run:** ${pct(repeatInstances / Math.max(1, totalInstances))} of enemy instances are a type already fought earlier the same run (${avgDistinctEnemiesPerRun.toFixed(1)} distinct enemy types/run).`);
  L.push(`- **Distinct action kinds per fight (avg):** ${f2(perFightDistinct)} — low = the player presses one button.`);
  L.push('\n- **Action-kind mix by class** (what the bot actually does; "button share" = the single most-used action):\n');
  L.push('| Class | Action mix | Button share | Entropy (bits) |');
  L.push('|-------|-----------|-------------:|---------------:|');
  for (const cls of CLASSES) {
    const counts = actionByClass.get(cls)!;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const mix = top
      .slice(0, 4)
      .map(([k, v]) => `${k} ${Math.round((v / Math.max(1, total)) * 100)}%`)
      .join(', ');
    const share = top.length ? top[0][1] / Math.max(1, total) : 0;
    L.push(`| ${cls} | ${mix || '—'} | ${pct(share)} | ${f2(entropy(counts))} |`);
  }
  L.push('\n- **Build divergence across lives** (final blessing set; runs that reached ≥1 shrine pick):\n');
  L.push('| Class | Runs w/ build | Distinct sets | Mean blessings | Mean pairwise Jaccard dist |');
  L.push('|-------|--------------:|--------------:|---------------:|---------------------------:|');
  for (const cls of CLASSES) {
    const b = buildDiv.get(cls)!;
    L.push(
      `| ${cls} | ${b.runsWithBuild} | ${b.distinctSets} | ${f2(b.meanBlessings)} | ${f2(b.meanJaccard)} |`,
    );
  }

  // TENSION
  L.push('\n## 4. Tension / swing\n');
  L.push(`- **Blowouts** (won, HP never dipped below ${Math.round(BLOWOUT_FLOOR * 100)}%): **${pct(blowouts / Math.max(1, wins.length))}** of wins — zero-tension fights.`);
  L.push(`- **Comfortable wins** (won, HP never below 50%): ${pct(trivialWins / Math.max(1, wins.length))} of wins.`);
  L.push(`- **Near-death-and-recover** (won, dipped below ${Math.round(NEAR_DEATH * 100)}% then ended ≥50%): ${pct(nearDeathRecover / Math.max(1, wins.length))} of wins — the genuinely tense fights.`);
  L.push('\n- **Min-HP-per-fight distribution** (how close the fight got):\n');
  L.push('| Min HP reached | Fights | Share |');
  L.push('|----------------|-------:|------:|');
  for (const [k, v] of Object.entries(minHpBuckets)) {
    L.push(`| ${k} | ${v} | ${pct(v / Math.max(1, fights.length))} |`);
  }
  L.push('\n- **Blowout rate by chapter** (non-boss fights only — shows where trivial fights concentrate):\n');
  L.push('| Chapter | Wins | Blowouts | Blowout % |');
  L.push('|--------:|-----:|---------:|----------:|');
  for (const ch of [...chapterBlowouts.keys()].sort((a, b) => a - b)) {
    const b = chapterBlowouts.get(ch)!;
    L.push(`| Ch${ch} | ${b.wins} | ${b.blowouts} | ${pct(b.blowouts / Math.max(1, b.wins))} |`);
  }
  L.push('\n- **Top blowout compositions** (≥5 wins, ranked by blowout %; avg rounds/fight):\n');
  L.push('| Composition | Wins | Blowout % | Avg rounds |');
  L.push('|-------------|-----:|----------:|-----------:|');
  for (const [key, a] of topBlowoutComps) {
    L.push(`| \`${key}\` | ${a.wins} | ${pct(a.blowouts / a.wins)} | ${f2(a.rounds / a.wins)} |`);
  }

  // INTENT
  L.push('\n## 5. Enemy-intent surface (lever for the telegraph fix)\n');
  L.push(`- **Enemy turns carrying a telegraph-worthy special** (paralyze/debuff/summon/sustain/multiattack): **${pct(intentEnemyTurns / Math.max(1, totalEnemyTurns))}** of ${totalEnemyTurns} enemy turns.`);
  L.push(`- **Fights containing ≥1 telegraph-worthy enemy** (incl. bosses): ${pct(fightsWithIntent / Math.max(1, fights.length))}.`);
  L.push(
    `- **Player dead turns that sit next to a telegraph-worthy enemy:** ${pct(
      deadAdjIntent / Math.max(1, allTurns.length),
    )} of all player turns (${pct(
      deadAdjIntent / Math.max(1, deadTurns),
    )} of dead turns) — autopilot turns a visible enemy-intent could turn into a real decision.`,
  );

  // RUN LENGTH
  L.push('\n## 6. Run length (AI-floor — relative only)\n');
  L.push('| Class | Start L | Mean rooms reached | Mean combats won | Clear rate |');
  L.push('|-------|--------:|-------------------:|-----------------:|-----------:|');
  for (const cls of CLASSES) {
    for (const lv of START_LEVELS) {
      const c = cells.get(`${cls}|${lv}`);
      if (!c) continue;
      L.push(
        `| ${cls} | ${lv} | ${f1(c.reach / c.runs)} | ${f1(c.won / c.runs)} | ${pct(c.cleared / c.runs)} |`,
      );
    }
  }

  // NARRATION
  L.push('\n## 7. Narrated representative run — Fighter, start L5\n');
  L.push(
    `_One full run, turn by turn. Tags: AUTOPILOT (no choice), TARGET (≥2 foes), RESOURCE (an ability/heal to weigh), CHOICE (both). ${
      narr.cleared ? 'Cleared the run.' : `Died after ${narr.combatRoomsWon} combats won (room ${narr.roomsReached}).`
    }_`,
  );
  L.push(...diary);

  const outPath = resolve(process.cwd(), 'docs/sim-findings/game-feel.raw.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, L.join('\n') + '\n', 'utf8');

  // Console summary
  console.log(`\n${nRuns} runs, ${fights.length} fights, ${allTurns.length} player turns.`);
  console.log(`Dead turns: ${pct(deadTurns / Math.max(1, allTurns.length))} | avg rounds/fight ${f2(avgRounds)}`);
  console.log(`Path choices/run: ${f2(avg((r) => r.pathChoices))} | shop nodes/run ${f2(avg((r) => r.shopSites))} | shrine picks/run ${f2(avg((r) => r.blessingPicks))} | combat real-decision turns/run ${f1(realDecisionTurnsPerRun)}`);
  console.log(`Blowouts ${pct(blowouts / Math.max(1, wins.length))} | near-death-recover ${pct(nearDeathRecover / Math.max(1, wins.length))}`);
  console.log(`Intent-bearing enemy turns ${pct(intentEnemyTurns / Math.max(1, totalEnemyTurns))} | dead-turns next to intent ${pct(deadAdjIntent / Math.max(1, deadTurns))}`);
  console.log(`\nWrote → ${outPath}`);
}

main();
