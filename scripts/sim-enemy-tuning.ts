/**
 * New-enemy mechanic tuning sim (Wave 2).
 *
 * The bestiary grew 33 → 46 and gained four behaviour families:
 *   summon   — spawns adds (duergar-taskmaster, cowled-conjurer,
 *              asylum-fleshwright, spider-broodmother)
 *   debuff   — poison/weaken/blind/frighten/restrain on the player
 *              (plaguebound-cur, cell-wight, lash-captain, gibbering-husk,
 *              cavern-hunting-spider)
 *   sustain  — self-heal / life-drain / ally ward (sphere-aberration,
 *              mind-leech, cowled-wardpriest, drow-war-priestess)
 *   multiattack/frenzy — multiple strikes + battle-rage (famished-ghast,
 *              cavern-hunting-spider)
 *
 * This runs the trusted classes (rogue / fighter / wizard, the ones with
 * validated meta-journey sims + Grove priority lists) through the FULL chained
 * Godwake delve for a fixed life budget per soul, reincarnating with Grove
 * carry so deep chapters are reached, and instruments every combat encounter to
 * answer: does any new enemy or mechanic over/under-tune a chapter?
 *
 * Read-only harness imports come from `src/test/sim/encounterStress.ts`
 * (characterAtLevel / takeTurn / pickBlessingAtShrine). The chain driver +
 * Grove buy logic are reimplemented here (sim-reincarnation-loop.ts is owned by
 * a sibling lane) — this script does NOT modify any shared file.
 *
 * Run:
 *   SOULS=150 MAX_LIVES=24 npx tsx scripts/sim-enemy-tuning.ts
 *
 * Writes docs/sim-findings/enemy-tuning.md (data + auto-flagged signals); the
 * curated verdict prose is hand-edited on top of the generated tables.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { createDiceRoller, setActiveRoller, type DiceRoller } from '../src/engine/dice';
import { getMonster } from '../src/content/monsters';
import { applyLevelUp, xpForLevel, MAX_LEVEL } from '../src/engine/character/leveling';
import { shortRestHeal, longRest } from '../src/engine/character/actions';
import { createGodwakeDelve } from '../src/engine/delve/createDelve';
import { createCombat, _resetMonsterInstanceCounter } from '../src/engine/combat/createCombat';
import { monsterAttack } from '../src/engine/combat/attack/monsterAttack';
import { endTurn, isPlayerTurn } from '../src/engine/combat/turn';
import {
  applyPermanentUpgrade,
  applyDelveStartUpgrades,
  type UnlockedUpgrades,
} from '../src/engine/character/upgrades';
import { findUpgrade } from '../src/content/upgrades';
import { characterAtLevel, takeTurn, pickBlessingAtShrine } from '../src/test/sim/encounterStress';
import { rollQuirks } from '../src/engine/character/quirks';
import type { Character } from '../src/types/character';
import type { CombatState, MonsterCombatant } from '../src/types/combat';
import type { ConditionName } from '../src/types/conditions';

type ClassId = 'rogue' | 'fighter' | 'wizard';

const SOULS = Number(process.env.SOULS ?? 150);
const MAX_LIVES = Number(process.env.MAX_LIVES ?? 24);
const ROUND_CAP = 40;
const SEED_BASE = 0x5eed51 >>> 0;
const BLESSINGS_ON = (process.env.BLESSINGS ?? 'on').toLowerCase() !== 'off';

const GROVE_UNLOCK_THRESHOLD = 30;
const RENOWN_PER_DELVE_CLEAR = 50;
const RENOWN_PER_DELVE_FAILURE = 15;
const RENOWN_PER_CHAPTER_BOSS = 10;

const DEBUFF_CONDITIONS: ConditionName[] = [
  'poisoned',
  'frightened',
  'blinded',
  'restrained',
  'weakened',
];

// ─── New-enemy registry (PR #164) — chapter + mechanic family for flagging ──
interface NewEnemy {
  chapter: number;
  cr: string;
  family: 'summon' | 'debuff' | 'sustain' | 'multiattack';
  note: string;
}
const NEW_ENEMIES: Record<string, NewEnemy> = {
  'plaguebound-cur': { chapter: 1, cr: '1', family: 'debuff', note: 'poisoned' },
  'cell-wight': { chapter: 1, cr: '2', family: 'debuff', note: 'weakened' },
  'famished-ghast': { chapter: 1, cr: '1', family: 'multiattack', note: '2x + battle-rage' },
  'duergar-taskmaster': { chapter: 1, cr: '2', family: 'summon', note: 'goblin x1, max2' },
  'cowled-conjurer': { chapter: 2, cr: '3', family: 'summon', note: 'imp once' },
  'cowled-wardpriest': { chapter: 2, cr: '3', family: 'sustain', note: 'ally ward 10' },
  'lash-captain': { chapter: 2, cr: '3', family: 'debuff', note: 'frightened' },
  'gibbering-husk': { chapter: 3, cr: '3', family: 'debuff', note: 'blinded' },
  'mind-leech': { chapter: 3, cr: '3', family: 'sustain', note: 'life-drain 0.5' },
  'sphere-aberration': { chapter: 3, cr: '4', family: 'sustain', note: 'self-heal 2d6' },
  'asylum-fleshwright': { chapter: 3, cr: '4', family: 'summon', note: 'subject x1, max2' },
  'cavern-hunting-spider': { chapter: 4, cr: '3', family: 'multiattack', note: 'restrain + 2x' },
  'spider-broodmother': { chapter: 4, cr: '5', family: 'summon', note: 'driderling x2, max4' },
  'drow-war-priestess': { chapter: 4, cr: '4', family: 'sustain', note: 'ally heal+ward' },
};
const SUMMONED_ADD_IDS = new Set(['goblin', 'imp', 'bonebound-test-subject', 'driderling']);

// ─── Grove buy logic (mirrors sim-reincarnation-loop's greedy priority buy) ──
const SHARED_PRIORITY: { id: string; maxAtRank: number }[] = [
  { id: 'pilgrims-boots', maxAtRank: 1 },
  { id: 'mielikki-cache', maxAtRank: 4 },
  { id: 'mantle-of-the-wakened', maxAtRank: 5 },
  { id: 'cloak-of-the-grove', maxAtRank: 3 },
  { id: 'hardier-soul', maxAtRank: 3 },
  { id: 'stoneweave-boots', maxAtRank: 4 },
  { id: 'coin-in-pocket', maxAtRank: 3 },
  { id: 'iron-will', maxAtRank: 1 },
];
const CLASS_PRIORITY: Record<ClassId, { id: string; maxAtRank: number }[]> = {
  rogue: [
    { id: 'shadowstep', maxAtRank: 3 },
    { id: 'knife-in-the-dark', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'killers-eye', maxAtRank: 2 },
  ],
  fighter: [
    { id: 'wellspring-vigil', maxAtRank: 3 },
    { id: 'heirloom-blade', maxAtRank: 4 },
    { id: 'whetstone-resolve', maxAtRank: 4 },
    { id: 'first-cut', maxAtRank: 3 },
    { id: 'fellfast-strike', maxAtRank: 3 },
  ],
  wizard: [
    { id: 'burning-tongue', maxAtRank: 5 },
    { id: 'arcane-focus', maxAtRank: 3 },
    { id: 'sigil-of-the-wakened-mind', maxAtRank: 3 },
  ],
};
function priorityFor(classId: ClassId): { id: string; maxAtRank: number }[] {
  const cls = CLASS_PRIORITY[classId];
  const out: { id: string; maxAtRank: number }[] = [];
  out.push(SHARED_PRIORITY[0]);
  const maxLen = Math.max(cls.length, SHARED_PRIORITY.length - 1);
  for (let i = 0; i < maxLen; i++) {
    if (i < cls.length) out.push(cls[i]);
    if (i + 1 < SHARED_PRIORITY.length) out.push(SHARED_PRIORITY[i + 1]);
  }
  return out;
}
function buyUpgrades(
  classId: ClassId,
  renown: number,
  unlocked: UnlockedUpgrades,
): { renown: number; unlocked: UnlockedUpgrades } {
  let r = renown;
  const u: UnlockedUpgrades = { ...unlocked };
  if (r < GROVE_UNLOCK_THRESHOLD) return { renown: r, unlocked: u };
  const list = priorityFor(classId);
  let bought = true;
  let safety = 0;
  while (bought && safety < 60) {
    bought = false;
    safety += 1;
    for (const { id, maxAtRank } of list) {
      const up = findUpgrade(id);
      if (!up) continue;
      const curRank = u[id] ?? 0;
      const targetRank = Math.min(maxAtRank, up.maxRank);
      if (curRank >= targetRank) continue;
      const cost = up.costForRank(curRank + 1);
      if (r >= cost) {
        r -= cost;
        u[id] = curRank + 1;
        bought = true;
        break;
      }
    }
  }
  return { renown: r, unlocked: u };
}
function applyPermanentUpgrades(c: Character, unlocked: UnlockedUpgrades): Character {
  let ch = c;
  for (const [id, rank] of Object.entries(unlocked)) {
    const up = findUpgrade(id);
    if (!up || up.kind !== 'permanent') continue;
    for (let r = 1; r <= rank; r++) ch = applyPermanentUpgrade(ch, id, r);
  }
  const permHp = ch.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = ch.hp.max + permHp;
    ch = { ...ch, hp: { current: newMax, max: newMax, temp: ch.hp.temp } };
  }
  return ch;
}

interface SoulState {
  classId: ClassId;
  renown: number;
  unlocked: UnlockedUpgrades;
  inventory: Character['inventory'];
  quirks: string[];
}

function descend(roller: DiceRoller, soul: SoulState): Character {
  let c = characterAtLevel(soul.classId, 1);
  c = applyPermanentUpgrades(c, soul.unlocked);
  c = applyDelveStartUpgrades(c, soul.unlocked);
  if (soul.inventory.length > 0) {
    const merged = soul.inventory.length > c.inventory.length ? soul.inventory : c.inventory;
    c = { ...c, inventory: [...merged] };
  }
  c = { ...c, quirks: rollQuirks(roller, 2) };
  c = { ...c, hp: { ...c.hp, current: c.hp.max } };
  return longRest(c);
}

// ─── Per-encounter instrumentation ──────────────────────────────────────────
interface EncounterRecord {
  chapter: number;
  roomId: string;
  isBoss: boolean;
  initialDefIds: string[];
  victory: boolean;
  timedOut: boolean;
  rounds: number;
  killerDefId: string | null;
  killerWasSummonedAdd: boolean;
  debuffedPlayerTurns: number;
  diedWhileDebuffed: boolean;
  addsSpawned: number;
  addsKilled: number;
  peakLiveAdds: number;
  summonerDefIds: string[];
  enemyHealTotal: number;
  enemyWardTotal: number;
  maxSingleTurnDamage: number;
  maxSingleTurnDamageDef: string | null;
}

function liveMonstersOf(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c): c is MonsterCombatant => c.kind === 'monster' && c.instance.hp.current > 0,
  );
}
function defOfCombatant(state: CombatState, id: string): string | null {
  const c = state.combatants.find((x) => x.id === id);
  return c && c.kind === 'monster' ? c.instance.defId : null;
}
function playerDebuffed(character: Character): boolean {
  return character.conditions.some((c) => DEBUFF_CONDITIONS.includes(c.name));
}
function debuffNames(character: Character): Set<string> {
  return new Set(character.conditions.filter((c) => DEBUFF_CONDITIONS.includes(c.name)).map((c) => c.name));
}

// Global debuff-application attribution: defId -> condition -> count.
const debuffApplied: Record<string, Record<string, number>> = {};

function runInstrumentedCombat(
  roller: DiceRoller,
  characterIn: Character,
  monsters: { defId: string; count: number; displayPrefix?: string }[],
  chapter: number,
  roomId: string,
  isBoss: boolean,
): { character: Character; record: EncounterRecord } {
  _resetMonsterInstanceCounter();
  const monsterRefs = monsters.flatMap((rm) => {
    const def = getMonster(rm.defId);
    return Array.from({ length: rm.count }, () => ({ def, displayName: rm.displayPrefix }));
  });
  const init = createCombat({ roller, character: characterIn, monsters: monsterRefs });
  let state: CombatState = init.state;
  let character: Character = init.character;

  const initialDefIds = monsterRefs.map((m) => m.def.id);
  const knownIds = new Set(state.combatants.filter((c) => c.kind === 'monster').map((c) => c.id));
  const summonIds = new Map<string, string>(); // addId -> defId
  const hpSnap = new Map<string, { cur: number; temp: number }>();
  for (const m of liveMonstersOf(state)) hpSnap.set(m.id, { cur: m.instance.hp.current, temp: m.instance.hp.temp });

  let addsSpawned = 0;
  let peakLiveAdds = 0;
  let enemyHealTotal = 0;
  let enemyWardTotal = 0;
  let debuffedPlayerTurns = 0;
  let maxTurnDmg = 0;
  let maxTurnDmgDef: string | null = null;
  const summonerDefIds = new Set<string>();
  let killerDefId: string | null = null;
  let killerWasSummonedAdd = false;
  let diedWhileDebuffed = false;

  // Snapshot diff: count positive HP/temp deltas as heal/ward; register new
  // combatants as summoned adds (attribute to the actor that just acted).
  const bookkeep = (actorDefId: string | null) => {
    for (const m of state.combatants) {
      if (m.kind !== 'monster') continue;
      if (!knownIds.has(m.id)) {
        knownIds.add(m.id);
        summonIds.set(m.id, m.instance.defId);
        addsSpawned += 1;
        if (actorDefId) summonerDefIds.add(actorDefId);
        hpSnap.set(m.id, { cur: m.instance.hp.current, temp: m.instance.hp.temp });
        continue;
      }
      const prev = hpSnap.get(m.id);
      if (prev) {
        if (m.instance.hp.current > prev.cur) enemyHealTotal += m.instance.hp.current - prev.cur;
        if (m.instance.hp.temp > prev.temp) enemyWardTotal += m.instance.hp.temp - prev.temp;
      }
      hpSnap.set(m.id, { cur: m.instance.hp.current, temp: m.instance.hp.temp });
    }
    let liveAdds = 0;
    for (const m of liveMonstersOf(state)) if (summonIds.has(m.id)) liveAdds += 1;
    if (liveAdds > peakLiveAdds) peakLiveAdds = liveAdds;
  };

  let turns = 0;
  while (state.status === 'active' && state.round <= ROUND_CAP && turns < ROUND_CAP * 12) {
    const actingId = state.turnOrder[state.currentTurnIndex];
    if (isPlayerTurn(state)) {
      if (playerDebuffed(character)) debuffedPlayerTurns += 1;
      const t = takeTurn(roller, state, character);
      state = t.state;
      character = t.character;
      bookkeep(null);
      if (state.status !== 'active') break;
      const e = endTurn(state, character);
      state = e.state;
      character = e.character;
    } else {
      const actorDefId = defOfCombatant(state, actingId);
      const beforeEff = character.hp.current + character.hp.temp;
      const beforeDebuffs = debuffNames(character);
      const r = monsterAttack({ roller, character, state }, actingId);
      state = r.state;
      character = r.character;
      const afterEff = character.hp.current + character.hp.temp;
      const dmg = Math.max(0, beforeEff - afterEff);
      if (dmg > maxTurnDmg) {
        maxTurnDmg = dmg;
        maxTurnDmgDef = actorDefId;
      }
      const afterDebuffs = debuffNames(character);
      for (const d of afterDebuffs) {
        if (!beforeDebuffs.has(d) && actorDefId) {
          debuffApplied[actorDefId] ??= {};
          debuffApplied[actorDefId][d] = (debuffApplied[actorDefId][d] ?? 0) + 1;
        }
      }
      bookkeep(actorDefId);
      if (state.status === 'player-defeat') {
        killerDefId = actorDefId;
        killerWasSummonedAdd = summonIds.has(actingId);
        diedWhileDebuffed = playerDebuffed(character);
        break;
      }
      if (state.status !== 'active') break;
      const e = endTurn(state, character);
      state = e.state;
      character = e.character;
    }
    turns += 1;
  }

  let addsKilled = 0;
  for (const [id] of summonIds) {
    const c = state.combatants.find((x) => x.id === id);
    if (c && c.kind === 'monster' && c.instance.hp.current <= 0) addsKilled += 1;
  }

  const victory = state.status === 'player-victory';
  const timedOut = state.status === 'active';
  return {
    character,
    record: {
      chapter,
      roomId,
      isBoss,
      initialDefIds,
      victory,
      timedOut,
      rounds: state.round,
      killerDefId,
      killerWasSummonedAdd,
      debuffedPlayerTurns,
      diedWhileDebuffed,
      addsSpawned,
      addsKilled,
      peakLiveAdds,
      summonerDefIds: [...summonerDefIds],
      enemyHealTotal,
      enemyWardTotal,
      maxSingleTurnDamage: maxTurnDmg,
      maxSingleTurnDamageDef: maxTurnDmgDef,
    },
  };
}

// ─── Chain driver: full Godwake delve, fixed life budget, Grove carry ────────
interface LifeResult {
  records: EncounterRecord[];
  bossesKilled: number;
  cleared: boolean;
  finalCharacter: Character;
}

function liveOneLife(roller: DiceRoller, soul: SoulState, seed: number): LifeResult {
  let character = descend(roller, soul);
  const delve = createGodwakeDelve({ seed });
  const records: EncounterRecord[] = [];
  let chapter = 1;
  let bossesKilled = 0;
  let died = false;

  for (const room of delve.rooms) {
    if (room.kind === 'rest') {
      character = shortRestHeal(character, Math.floor(character.hp.max * 0.7));
      continue;
    }
    if (room.kind === 'camp') {
      character = longRest(character);
      chapter += 1; // camp is the chapter seam
      continue;
    }
    if (room.kind === 'shrine') {
      if (BLESSINGS_ON) character = pickBlessingAtShrine(roller, character);
      continue;
    }
    if (room.kind === 'event') continue;

    const isBoss = room.kind === 'boss';
    const monsters = (room.monsters ?? []).map((m) => ({
      defId: m.defId,
      count: m.count,
      displayPrefix: m.displayPrefix,
    }));
    const out = runInstrumentedCombat(roller, character, monsters, chapter, room.id, isBoss);
    character = out.character;
    records.push(out.record);

    if (!out.record.victory) {
      died = true;
      break;
    }
    if (isBoss) bossesKilled += 1;

    const rXp = room.xpReward ?? 0;
    if (rXp > 0) {
      character = { ...character, xp: character.xp + rXp };
      while (character.level < MAX_LEVEL && character.xp >= xpForLevel(character.level + 1)) {
        character = applyLevelUp(character);
      }
    }
  }

  return { records, bossesKilled, cleared: !died, finalCharacter: character };
}

function runSoul(classId: ClassId, seedBase: number): EncounterRecord[] {
  const roller = createDiceRoller(seedBase);
  setActiveRoller(seedBase);
  let soul: SoulState = { classId, renown: 0, unlocked: {}, inventory: [], quirks: [] };
  const all: EncounterRecord[] = [];
  for (let life = 0; life < MAX_LIVES; life++) {
    const lifeSeed = ((seedBase + life * 7919) ^ (classId.charCodeAt(0) * 1009)) >>> 0;
    const res = liveOneLife(roller, soul, lifeSeed);
    all.push(...res.records);
    const renownBase = res.cleared
      ? RENOWN_PER_DELVE_CLEAR
      : RENOWN_PER_DELVE_FAILURE + RENOWN_PER_CHAPTER_BOSS * res.bossesKilled;
    let renown = soul.renown + renownBase;
    const buy = buyUpgrades(classId, renown, soul.unlocked);
    renown = buy.renown;
    soul = {
      ...soul,
      renown,
      unlocked: buy.unlocked,
      inventory: res.finalCharacter.inventory,
      quirks: res.finalCharacter.quirks,
    };
  }
  return all;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────
function isNew(defId: string): boolean {
  return defId in NEW_ENEMIES;
}

interface ChapterAgg {
  chapter: number;
  encounters: number;
  deaths: number;
  timeouts: number;
  // def -> {appearances (encounters present), kills (killing blows), avgMaxTurnDmg}
  perDef: Map<string, { appearances: number; kills: number }>;
  deathByRoom: Map<string, number>;
}

function aggregate(records: EncounterRecord[]): {
  chapters: Map<number, ChapterAgg>;
  totalDeaths: number;
} {
  const chapters = new Map<number, ChapterAgg>();
  let totalDeaths = 0;
  for (const r of records) {
    let ch = chapters.get(r.chapter);
    if (!ch) {
      ch = {
        chapter: r.chapter,
        encounters: 0,
        deaths: 0,
        timeouts: 0,
        perDef: new Map(),
        deathByRoom: new Map(),
      };
      chapters.set(r.chapter, ch);
    }
    ch.encounters += 1;
    if (r.timedOut) ch.timeouts += 1;
    const present = new Set(r.initialDefIds);
    // adds that spawned also "appeared" — but appearances counts the encounter
    // they participated in, so include summoned-add defs that were spawned.
    for (const d of present) {
      const e = ch.perDef.get(d) ?? { appearances: 0, kills: 0 };
      e.appearances += 1;
      ch.perDef.set(d, e);
    }
    if (!r.victory && !r.timedOut && r.killerDefId) {
      ch.deaths += 1;
      totalDeaths += 1;
      const e = ch.perDef.get(r.killerDefId) ?? { appearances: 0, kills: 0 };
      e.kills += 1;
      ch.perDef.set(r.killerDefId, e);
      ch.deathByRoom.set(r.roomId, (ch.deathByRoom.get(r.roomId) ?? 0) + 1);
    }
  }
  return { chapters, totalDeaths };
}

const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
const num = (n: number, d = 1) => n.toFixed(d);

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

function main(): void {
  const t0 = Date.now();
  const classes: ClassId[] = ['rogue', 'fighter', 'wizard'];
  console.log(`Enemy-tuning sim — ${classes.length} classes × ${SOULS} souls × ≤${MAX_LIVES} lives`);

  const all: EncounterRecord[] = [];
  for (const classId of classes) {
    const tc = Date.now();
    for (let i = 0; i < SOULS; i++) {
      const seed = (SEED_BASE ^ (classId.charCodeAt(0) * 7919) ^ (i * 104729)) >>> 0;
      all.push(...runSoul(classId, seed));
    }
    console.log(`  ${classId.padEnd(8)} done — ${all.length} cumulative encounters (${Date.now() - tc}ms)`);
  }

  const { chapters, totalDeaths } = aggregate(all);
  const wallSec = ((Date.now() - t0) / 1000).toFixed(1);
  const doc = renderDoc(all, chapters, totalDeaths, wallSec);
  const outPath = resolve(process.cwd(), 'docs/sim-findings/enemy-tuning.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc, 'utf8');
  console.log(`\nWrote ${outPath}  (${all.length} encounters, ${totalDeaths} combat deaths, ${wallSec}s)`);
}

function renderDoc(
  records: EncounterRecord[],
  chapters: Map<number, ChapterAgg>,
  totalDeaths: number,
  wallSec: string,
): string {
  const L: string[] = [];
  L.push('# New-enemy mechanic tuning — sim findings (Wave 2)');
  L.push('');
  L.push(
    `> Auto-generated by \`scripts/sim-enemy-tuning.ts\`. Re-run with ` +
      `\`SOULS=${SOULS} MAX_LIVES=${MAX_LIVES} npx tsx scripts/sim-enemy-tuning.ts\`.`,
  );
  L.push('');
  L.push(
    `**Sample:** rogue / fighter / wizard × ${SOULS} souls × ≤${MAX_LIVES} lives each ` +
      `(souls run a fixed life budget rather than stopping at first clear, to ` +
      `accumulate deep-chapter samples). Ascension 0. Blessings ${BLESSINGS_ON ? 'ON' : 'OFF'}. ` +
      `Wall ${wallSec}s.`,
  );
  L.push('');
  L.push(`**Totals:** ${records.length} combat encounters, ${totalDeaths} combat deaths.`);
  L.push('');
  L.push('## ⚠ Read this before the numbers');
  L.push('');
  L.push(
    'Absolute death-rates are an **AI-floor artifact** — the auto-battle bot underplays ' +
      '(see the ⚠ caveats on the character-order sims). An enemy is not "broken" just because ' +
      'it lives in an already-deadly chapter. The robust read is **relative kill-share / ' +
      'lethality vs the same-chapter baseline enemies**, and the four mechanic signals. ' +
      'Balance here is data-driven and report-only — no stat blocks were touched.',
  );
  L.push('');

  // ── Per-chapter death distribution ──
  L.push('## 1. Per-chapter death distribution');
  L.push('');
  L.push('| Chapter | Encounters | Combat deaths | % of all deaths | Timeouts (≥40 rds) | Top death room |');
  L.push('|--------:|-----------:|--------------:|----------------:|-------------------:|:---------------|');
  const sortedChapters = [...chapters.values()].sort((a, b) => a.chapter - b.chapter);
  for (const ch of sortedChapters) {
    const topRoom = [...ch.deathByRoom.entries()].sort((a, b) => b[1] - a[1])[0];
    L.push(
      `| ${ch.chapter} | ${ch.encounters} | ${ch.deaths} | ` +
        `${pct(totalDeaths ? ch.deaths / totalDeaths : 0)} | ${ch.timeouts} | ` +
        `${topRoom ? `${topRoom[0]} (${topRoom[1]})` : '—'} |`,
    );
  }
  L.push('');

  // ── Per-enemy kill-share tables ──
  L.push('## 2. Per-enemy kill-share (NEW enemies flagged ⭐)');
  L.push('');
  L.push(
    'Per chapter, sorted by kill-share. **kill-share** = killing blows / chapter combat deaths. ' +
      '**lethality** = killing blows / encounters the def appeared in (normalises for how often ' +
      'it shows up). Killing blows include summoned adds landing the final hit.',
  );
  L.push('');
  for (const ch of sortedChapters) {
    L.push(`### Chapter ${ch.chapter}`);
    L.push('');
    L.push('| Enemy | New? | Family | Appearances | Killing blows | Kill-share | Lethality |');
    L.push('|:------|:----:|:-------|------------:|--------------:|-----------:|----------:|');
    const rows = [...ch.perDef.entries()]
      .map(([defId, e]) => ({
        defId,
        ...e,
        share: ch.deaths ? e.kills / ch.deaths : 0,
        lethality: e.appearances ? e.kills / e.appearances : 0,
      }))
      .sort((a, b) => b.share - a.share || b.lethality - a.lethality);
    for (const r of rows) {
      const ne = NEW_ENEMIES[r.defId];
      L.push(
        `| ${r.defId} | ${ne ? '⭐' : ''} | ${ne ? `${ne.family} (${ne.note})` : ''} | ` +
          `${r.appearances} | ${r.kills} | ${pct(r.share)} | ${pct(r.lethality)} |`,
      );
    }
    L.push('');
  }

  // ── Mechanic signals ──
  L.push('## 3. Mechanic signals');
  L.push('');

  // 3a. Summon
  L.push('### 3a. Summon — add snowball');
  L.push('');
  L.push(
    'Per summoner: encounters it appeared in, total adds spawned, adds killed (by end), ' +
      'avg & max concurrent live adds, and how often a **summoned add** (not the summoner) ' +
      'landed the killing blow.',
  );
  L.push('');
  L.push('| Summoner | Chapter | Encounters | Adds spawned | Adds killed | Avg peak adds | Max peak adds | Kills by adds |');
  L.push('|:---------|--------:|-----------:|-------------:|------------:|--------------:|--------------:|--------------:|');
  const summoners = Object.keys(NEW_ENEMIES).filter((d) => NEW_ENEMIES[d].family === 'summon');
  for (const s of summoners) {
    const recs = records.filter((r) => r.initialDefIds.includes(s));
    if (recs.length === 0) {
      L.push(`| ${s} | ${NEW_ENEMIES[s].chapter} | 0 | — | — | — | — | — |`);
      continue;
    }
    const spawned = recs.reduce((a, r) => a + r.addsSpawned, 0);
    const killed = recs.reduce((a, r) => a + r.addsKilled, 0);
    const avgPeak = recs.reduce((a, r) => a + r.peakLiveAdds, 0) / recs.length;
    const maxPeak = recs.reduce((a, r) => Math.max(a, r.peakLiveAdds), 0);
    const killsByAdds = recs.filter((r) => r.killerWasSummonedAdd).length;
    L.push(
      `| ${s} | ${NEW_ENEMIES[s].chapter} | ${recs.length} | ${spawned} | ${killed} | ` +
        `${num(avgPeak, 2)} | ${maxPeak} | ${killsByAdds} |`,
    );
  }
  L.push('');
  L.push(
    '*Snowball read:* a healthy summoner keeps adds bounded by its `maxActive` cap; runaway ' +
      'would show max-peak adds climbing well past the cap and a high adds-spawned-to-killed ratio.',
  );
  L.push('');

  // 3b. Debuff
  L.push('### 3b. Debuff — attrition grind');
  L.push('');
  const totalPlayerTurnsDebuffed = records.reduce((a, r) => a + r.debuffedPlayerTurns, 0);
  const deathsWhileDebuffed = records.filter((r) => r.diedWhileDebuffed).length;
  const debuffEncounters = records.filter((r) =>
    r.initialDefIds.some((d) => NEW_ENEMIES[d]?.family === 'debuff'),
  );
  L.push(
    `Across all encounters the player spent **${totalPlayerTurnsDebuffed} player-turns debuffed**. ` +
      `**${deathsWhileDebuffed}** deaths (of ${totalDeaths}, ${pct(totalDeaths ? deathsWhileDebuffed / totalDeaths : 0)}) ` +
      `occurred while a debuff was active. ${debuffEncounters.length} encounters contained a debuff enemy.`,
  );
  L.push('');
  L.push('| Debuffer | Chapter | Condition | Successful applications |');
  L.push('|:---------|--------:|:----------|------------------------:|');
  const debuffers = Object.keys(NEW_ENEMIES).filter((d) => NEW_ENEMIES[d].family === 'debuff');
  for (const d of debuffers) {
    const apps = debuffApplied[d] ?? {};
    const total = Object.values(apps).reduce((a, b) => a + b, 0);
    const conds = Object.entries(apps)
      .map(([c, n]) => `${c}:${n}`)
      .join(', ');
    L.push(`| ${d} | ${NEW_ENEMIES[d].chapter} | ${NEW_ENEMIES[d].note} | ${total}${conds ? ` (${conds})` : ''} |`);
  }
  L.push('');

  // 3c. Sustain
  L.push('### 3c. Sustain — fight stall');
  L.push('');
  const sustainers = Object.keys(NEW_ENEMIES).filter((d) => NEW_ENEMIES[d].family === 'sustain');
  // baseline avg rounds per chapter (encounters with NO sustain enemy)
  const chapterBaselineRounds = new Map<number, number[]>();
  for (const r of records) {
    if (!r.initialDefIds.some((d) => NEW_ENEMIES[d]?.family === 'sustain')) {
      const arr = chapterBaselineRounds.get(r.chapter) ?? [];
      arr.push(r.rounds);
      chapterBaselineRounds.set(r.chapter, arr);
    }
  }
  const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  L.push('| Sustainer | Chapter | Encounters | Avg rounds | Baseline avg (no-sustain, same ch) | Near-timeout (≥30 rds) | Timeouts | Avg enemy HP healed | Avg ward |');
  L.push('|:----------|--------:|-----------:|-----------:|-----------------------------------:|-----------------------:|---------:|--------------------:|---------:|');
  for (const s of sustainers) {
    const recs = records.filter((r) => r.initialDefIds.includes(s));
    if (recs.length === 0) {
      L.push(`| ${s} | ${NEW_ENEMIES[s].chapter} | 0 | — | — | — | — | — | — |`);
      continue;
    }
    const avgR = avgOf(recs.map((r) => r.rounds));
    const baseAvg = avgOf(chapterBaselineRounds.get(NEW_ENEMIES[s].chapter) ?? []);
    const nearTo = recs.filter((r) => r.rounds >= 30).length;
    const to = recs.filter((r) => r.timedOut).length;
    const avgHeal = avgOf(recs.map((r) => r.enemyHealTotal));
    const avgWard = avgOf(recs.map((r) => r.enemyWardTotal));
    L.push(
      `| ${s} | ${NEW_ENEMIES[s].chapter} | ${recs.length} | ${num(avgR, 1)} | ${num(baseAvg, 1)} | ` +
        `${nearTo} | ${to} | ${num(avgHeal, 1)} | ${num(avgWard, 1)} |`,
    );
  }
  L.push('');
  L.push(
    '*Stall read:* a stalling sustainer would run materially longer than the same-chapter ' +
      'no-sustain baseline and rack up near-timeouts/timeouts. Heal/ward columns show how much ' +
      'HP the mechanic actually adds back per fight.',
  );
  L.push('');

  // 3d. Multiattack / frenzy
  L.push('### 3d. Multiattack / frenzy — burst');
  L.push('');
  const allBurst = records.map((r) => r.maxSingleTurnDamage).filter((x) => x > 0).sort((a, b) => a - b);
  L.push(
    `Single-turn damage to the player across all monster turns — p50 **${quantile(allBurst, 0.5)}**, ` +
      `p90 **${quantile(allBurst, 0.9)}**, p99 **${quantile(allBurst, 0.99)}**, max **${allBurst[allBurst.length - 1] ?? 0}**.`,
  );
  L.push('');
  L.push('Per multiattack/frenzy enemy — biggest single-turn hit it ever dealt, and its avg, vs the global p90:');
  L.push('');
  L.push('| Enemy | Chapter | Encounters | Max single-turn dmg | Avg of its max-turns | Burst kills* |');
  L.push('|:------|--------:|-----------:|--------------------:|---------------------:|-------------:|');
  const bursters = Object.keys(NEW_ENEMIES).filter((d) => NEW_ENEMIES[d].family === 'multiattack');
  for (const b of bursters) {
    const recs = records.filter((r) => r.initialDefIds.includes(b));
    if (recs.length === 0) {
      L.push(`| ${b} | ${NEW_ENEMIES[b].chapter} | 0 | — | — | — |`);
      continue;
    }
    const maxes = recs.map((r) => (r.maxSingleTurnDamageDef === b ? r.maxSingleTurnDamage : 0));
    const maxBurst = Math.max(...maxes);
    const avgMax = avgOf(maxes.filter((x) => x > 0));
    const burstKills = recs.filter((r) => r.killerDefId === b && !r.victory && !r.timedOut).length;
    L.push(
      `| ${b} | ${NEW_ENEMIES[b].chapter} | ${recs.length} | ${maxBurst} | ${num(avgMax, 1)} | ${burstKills} |`,
    );
  }
  L.push('');
  L.push('*Burst kills = encounters where this enemy landed the killing blow.');
  L.push('');

  L.push('## 4. Verdict');
  L.push('');
  L.push('_(hand-curated on top of the generated tables above — see commit.)_');
  L.push('');

  return L.join('\n');
}

main();
