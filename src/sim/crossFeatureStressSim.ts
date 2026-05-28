/**
 * Cross-feature stress sim. Phase 1 shipped 8 features (blessing-aggregator
 * fix #86, sculpt-spells & Shield-as-reaction wizard rework, full-class
 * combat HUD, per-camp 3-boon picks, boss-intel rooms, death postmortem,
 * monster bestiary codex, +misc). Each was validated in isolation; this
 * sim stress-tests their worst-case STACKED interaction.
 *
 * Four scenarios, 500 full-Godwake delves each (4 chapters, 50 rooms):
 *
 *   1. Optimal Soul (Wizard L7, tiefling): every defensive lever stacked
 *      — capped AC blessings, capped tempHP, defensive camp boons (Stillness
 *      + Steel of the Brave + Mantle of the Slain), evoker subclass with
 *      sculpt-spells, Shield as auto-reaction.
 *
 *   2. Pauper Soul (Wizard L7, tiefling): no blessings, no camp boons.
 *      Defaults only. Tests whether Phase 1 boss tunings made minimum
 *      investment trivially clearable.
 *
 *   3. Fighter Bruiser (human L7): stacked offensive blessings + offensive
 *      camp boons (Eye of the Hawk + Might of the Mountain + Blade of the
 *      Vow). Champion crits on 19-20 + crit-blessings.
 *
 *   4. Rogue Lurker (wood-elf L7): defensive blessings + Stillness + Steel
 *      of the Brave + Eyes of the Lich. Uncanny Dodge active by class.
 *
 * Reads "boss intel" as a no-op for combat outcomes (the engine records the
 * flag but doesn't yet feed it back into combat or gold). The scout-payment
 * gold sink would only matter for shop spend, which the sim doesn't model.
 *
 * Run via vitest:
 *   npm run test:run -- src/sim/crossFeatureStressSim.test.ts
 */
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState, RoomSpec } from '../types/delve';
import type { ClassId, RaceId } from '../schemas/ids';
import { setActiveRoller, getActiveRoller } from '../engine/dice';
import { simulateLevelUp } from '../engine/character/leveling';
import { shortRestHeal, longRest } from '../engine/character/actions';
import { createGodwakeDelve } from '../engine/delve';
import { getMonster } from '../content/monsters';
import {
  createCombat,
  monsterAttack,
  endTurn,
  currentCombatantId,
} from '../engine/combat';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { takeTurn } from '../test/sim/encounterStress';

export type ScenarioId =
  | 'optimal-wizard'
  | 'pauper-wizard'
  | 'fighter-bruiser'
  | 'rogue-lurker';

export interface ScenarioSpec {
  id: ScenarioId;
  label: string;
  classId: ClassId;
  raceId: RaceId;
  /** Blessings to stamp on the character before the delve starts. */
  blessings: string[];
  /** Camp boons to stamp on the character (mirrors delveStore.pickCampBoon). */
  campBoons: string[];
  /** Apply Mantle-of-the-Slain HP bump at character L7. */
  mantleBump: boolean;
  /** Apply Vigor-of-the-Road HP bump (5% rounded down). */
  vigorBump: boolean;
  /** Patience-of-Ilmater grants +1 stabilise budget. */
  patienceBump: boolean;
}

const SCENARIOS: Record<ScenarioId, ScenarioSpec> = {
  'optimal-wizard': {
    id: 'optimal-wizard',
    label: 'Optimal Soul (Wizard L7, defence-stacked)',
    classId: 'wizard',
    raceId: 'tiefling',
    blessings: [
      // AC: three sources, post-#86 max-of-individual → +1
      'helms-aegis',
      'mystras-ward',
      'silvanus-root',
      // Crit: two sources, capped at +1 → crit 19-20
      'tempus-edge',
      'tymoras-gambit',
      // Damage cap +1
      'mystras-whisper',
      'silvanus-thorn',
      // Holy damage cap +1
      'helms-bulwark',
      'lathanders-ember',
      // Temp HP cap +3
      'lathanders-dawn',
      'ilmaters-crown',
    ],
    campBoons: [
      'stillness-of-the-mind',  // T1 — +1 WIS save (vs Hold-Person)
      'steel-of-the-brave',     // T2 — +1 AC
      'mantle-of-the-slain',    // T3 — +L max HP (apply at pick)
    ],
    mantleBump: true,
    vigorBump: false,
    patienceBump: false,
  },
  'pauper-wizard': {
    id: 'pauper-wizard',
    label: 'Pauper Soul (Wizard L7, no investment)',
    classId: 'wizard',
    raceId: 'tiefling',
    blessings: [],
    campBoons: [],
    mantleBump: false,
    vigorBump: false,
    patienceBump: false,
  },
  'fighter-bruiser': {
    id: 'fighter-bruiser',
    label: 'Fighter Bruiser (L7, offence-stacked)',
    classId: 'fighter',
    raceId: 'human',
    blessings: [
      // First-attack stack
      'tempus-fury',       // +2 dmg first attack
      'mystras-veil',      // +2 to-hit first attack
      'selunes-veil',      // adv first attack
      // Damage cap +1
      'mystras-whisper',
      'silvanus-thorn',
      // Crit cap +1 (Champion already 19-20 → stacks to 18-20)
      'tempus-edge',
      'tymoras-gambit',
      // Holy damage cap +1
      'helms-bulwark',
      'lathanders-ember',
    ],
    campBoons: [
      'eye-of-the-hawk',         // T1 — +1 attack
      'might-of-the-mountain',   // T2 — +1 weapon damage
      'blade-of-the-vow',        // T3 — 1 reroll lowest dmg die / combat
    ],
    mantleBump: false,
    vigorBump: false,
    patienceBump: false,
  },
  'rogue-lurker': {
    id: 'rogue-lurker',
    label: 'Rogue Lurker (L7, evasion-stacked)',
    classId: 'rogue',
    raceId: 'wood-elf',
    blessings: [
      // AC cap +1
      'helms-aegis',
      'mystras-ward',
      'silvanus-root',
      // Temp HP cap +3
      'lathanders-dawn',
      'ilmaters-crown',
      // Stabilise pair (each +1 charge — these sum, audit confirmed safe)
      'ilmaters-patience',
      'tymoras-wink',
      // Reroll one miss / encounter
      'tymoras-coin',
    ],
    campBoons: [
      'stillness-of-the-mind',
      'steel-of-the-brave',
      'eyes-of-the-lich',  // intel-only, no combat effect
    ],
    mantleBump: false,
    vigorBump: false,
    patienceBump: false,
  },
};

export function listScenarios(): ScenarioSpec[] {
  return Object.values(SCENARIOS);
}

/**
 * Build a base L7 character for the scenario's race + class with a stat
 * spread tuned for that class. INT-first for wizard, STR-first for fighter,
 * DEX-first for rogue. Mirrors the encounterStress archetypes but lets us
 * vary race per scenario (tiefling for wizard, etc.).
 */
function buildBaseCharacter(spec: ScenarioSpec): Character {
  let scores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  let skills: ('arcana' | 'history' | 'athletics' | 'perception' | 'stealth' | 'sleight-of-hand')[];
  let inventory: { itemId: string }[];
  let equipped: Character['equipped'];

  switch (spec.classId) {
    case 'wizard':
      scores = {
        int: STANDARD_ARRAY[0], // 15
        con: STANDARD_ARRAY[1], // 14
        dex: STANDARD_ARRAY[2], // 13
        wis: STANDARD_ARRAY[3], // 12
        cha: STANDARD_ARRAY[4], // 10
        str: STANDARD_ARRAY[5], // 8
      };
      skills = ['arcana', 'history'];
      inventory = [
        { itemId: 'dagger' },
        { itemId: 'potion-of-healing' },
        { itemId: 'potion-of-healing' },
      ];
      equipped = { mainHand: { itemId: 'dagger' }, offHand: null, armor: null };
      break;
    case 'fighter':
      scores = {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      };
      skills = ['athletics', 'perception'];
      inventory = [
        { itemId: 'longsword' },
        { itemId: 'leather-armor' },
        { itemId: 'shield' },
        { itemId: 'potion-of-healing' },
        { itemId: 'potion-of-healing' },
      ];
      equipped = {
        mainHand: { itemId: 'longsword' },
        offHand: { itemId: 'shield' },
        armor: { itemId: 'leather-armor' },
      };
      break;
    case 'rogue':
      scores = {
        dex: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        int: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        str: STANDARD_ARRAY[5],
      };
      skills = ['stealth', 'sleight-of-hand'];
      inventory = [
        { itemId: 'rapier' },
        { itemId: 'dagger' },
        { itemId: 'shortbow' },
        { itemId: 'leather-armor' },
        { itemId: 'potion-of-healing' },
        { itemId: 'potion-of-healing' },
      ];
      equipped = {
        mainHand: { itemId: 'rapier' },
        offHand: null,
        armor: { itemId: 'leather-armor' },
      };
      break;
    default:
      throw new Error(`Unsupported class: ${spec.classId}`);
  }

  const c = createCharacter({
    id: `sim-${spec.id}`,
    name: spec.label,
    raceId: spec.raceId,
    classId: spec.classId,
    baseAbilityScores: scores,
    skillProficiencies: skills,
  });

  return { ...c, inventory, equipped };
}

function makeCharacter(spec: ScenarioSpec): Character {
  let c = buildBaseCharacter(spec);
  // Level up to L7 (subclass auto-picks at L2 for wizard evoker, L3 for fighter
  // champion — but content only has one subclass per class so it's automatic).
  while (c.level < 7) {
    c = simulateLevelUp({ ...c, xp: 9999999 });
  }
  // Top up to full HP / fresh resources.
  c = { ...c, hp: { ...c.hp, current: c.hp.max } };
  // Stamp blessings (engine reads via characterBlessingMods).
  c = { ...c, blessings: [...c.blessings, ...spec.blessings] };
  // Stamp camp boons (engine reads via characterCampBoonMods).
  c = { ...c, campBoons: [...(c.campBoons ?? []), ...spec.campBoons] };
  // Pick-time HP bumps (mirrors delveStore.pickCampBoon).
  if (spec.vigorBump) {
    const bump = Math.max(1, Math.floor(c.hp.max * 0.05));
    c = { ...c, hp: { ...c.hp, max: c.hp.max + bump, current: c.hp.current + bump } };
  }
  if (spec.mantleBump) {
    const bump = c.level;
    c = { ...c, hp: { ...c.hp, max: c.hp.max + bump, current: c.hp.current + bump } };
  }
  if (spec.patienceBump) {
    c = { ...c, delveStabiliseBonus: (c.delveStabiliseBonus ?? 0) + 1 };
  }
  return c;
}

function chapterFor(roomIdx: number): number {
  // Godwake layout (50 rooms total): ch1 indices 0–10 (boss at 10, camp at 11),
  // ch2 indices 12–23 (boss at 23, camp at 24), ch3 indices 25–36 (boss at 36,
  // camp at 37), ch4 indices 38–49 (boss at 49). The camp room separating two
  // chapters bills to the preceding chapter so cleanup is local.
  if (roomIdx <= 11) return 1;
  if (roomIdx <= 24) return 2;
  if (roomIdx <= 37) return 3;
  return 4;
}

interface EncounterResult {
  character: Character;
  died: boolean;
  damageDealt: number;
  damageTaken: number;
}

function runCombatEncounter(
  characterIn: Character,
  monsterRefs: { defId: string; count: number }[],
): EncounterResult {
  const roller = getActiveRoller();
  const monsters = monsterRefs.flatMap((m) => {
    const def = getMonster(m.defId);
    return Array.from({ length: m.count }, () => ({ def }));
  });

  const created = createCombat({ roller, character: characterIn, monsters });
  let state: CombatState = created.state;
  let character: Character = created.character;

  const startMonsterHpTotal = state.combatants.reduce(
    (sum, c) => (c.kind === 'monster' ? sum + c.instance.hp.current : sum),
    0,
  );
  const startCharHp = character.hp.current;
  const startCharTemp = character.hp.temp;

  let safety = 0;
  while (state.status === 'active' && safety < 400) {
    safety++;
    const cur = currentCombatantId(state);
    if (cur === 'player') {
      if (character.hp.current <= 0) break;
      const r = takeTurn(roller, state, character);
      state = r.state;
      character = r.character;
      if (state.status !== 'active') break;
      const e = endTurn(state, character);
      state = e.state;
      character = e.character;
    } else {
      const monsterCombatant = state.combatants.find((c) => c.id === cur);
      if (
        !monsterCombatant ||
        monsterCombatant.kind !== 'monster' ||
        monsterCombatant.instance.hp.current <= 0
      ) {
        const e = endTurn(state, character);
        state = e.state;
        character = e.character;
        continue;
      }
      const r = monsterAttack({ roller, character, state }, cur);
      state = r.state;
      character = r.character;
      if (state.status !== 'active') break;
      const e = endTurn(state, character);
      state = e.state;
      character = e.character;
    }
  }

  const died = character.hp.current <= 0 || state.status === 'player-defeat';
  const endMonsterHpTotal = state.combatants.reduce(
    (sum, c) => (c.kind === 'monster' ? sum + c.instance.hp.current : sum),
    0,
  );
  const damageDealt = Math.max(0, startMonsterHpTotal - endMonsterHpTotal);
  const charHpLost = Math.max(0, startCharHp - character.hp.current);
  const tempConsumed = Math.max(0, startCharTemp - character.hp.temp);
  const damageTaken = charHpLost + tempConsumed;
  return { character, died, damageDealt, damageTaken };
}

export interface DelveRunStats {
  scenarioId: ScenarioId;
  died: boolean;
  deathChapter: number;
  deathRoomId: string | null;
  chaptersCleared: number;
  roomsCleared: number;
  encountersFought: number;
  damageDealt: number;
  damageTaken: number;
  /** True if Matron Mother fight was reached (final boss, room-46). */
  reachedFinalBoss: boolean;
  /** True if Matron was killed and final delve finished alive. */
  killedMatron: boolean;
  /** Per-chapter boss outcomes: did the character KILL each chapter boss. */
  bossKills: { ch1: boolean; ch2: boolean; ch3: boolean; ch4: boolean };
}

export function runDelve(spec: ScenarioSpec, seed: number): DelveRunStats {
  setActiveRoller(seed >>> 0);
  let character = makeCharacter(spec);
  const delve: DelveState = createGodwakeDelve({ seed: seed >>> 0 });

  const stats: DelveRunStats = {
    scenarioId: spec.id,
    died: false,
    deathChapter: 0,
    deathRoomId: null,
    chaptersCleared: 0,
    roomsCleared: 0,
    encountersFought: 0,
    damageDealt: 0,
    damageTaken: 0,
    reachedFinalBoss: false,
    killedMatron: false,
    bossKills: { ch1: false, ch2: false, ch3: false, ch4: false },
  };

  for (let i = 0; i < delve.rooms.length && !stats.died; i++) {
    const room: RoomSpec = delve.rooms[i];
    const chapter = chapterFor(i);
    stats.roomsCleared = i;
    if (room.kind === 'boss') {
      if (room.monsters?.[0]?.defId === 'drow-matron-mother') {
        stats.reachedFinalBoss = true;
      }
    }
    if (room.kind === 'combat' || room.kind === 'boss') {
      stats.encountersFought += 1;
      const result = runCombatEncounter(character, room.monsters ?? []);
      character = result.character;
      stats.damageDealt += result.damageDealt;
      stats.damageTaken += result.damageTaken;
      stats.died = result.died;
      if (stats.died) {
        stats.deathRoomId = room.id;
        stats.deathChapter = chapter;
      } else {
        // Reset per-encounter flags so the next combat starts clean.
        character = {
          ...character,
          nextAttackAdvantage: false,
          bonusAttackAvailable: false,
          poisonImmuneEncounter: false,
          incomingDamageReduction: 0,
        };
        if (room.kind === 'boss') {
          if (chapter === 1) stats.bossKills.ch1 = true;
          else if (chapter === 2) stats.bossKills.ch2 = true;
          else if (chapter === 3) stats.bossKills.ch3 = true;
          else if (chapter === 4) {
            stats.bossKills.ch4 = true;
            stats.killedMatron = true;
          }
          stats.chaptersCleared = chapter;
        }
      }
    } else if (room.kind === 'rest') {
      const before = character.hp.current;
      const healAmount = Math.floor(character.hp.max * 0.7);
      character = shortRestHeal(character, healAmount);
      // Track recovered HP delta implicitly through damageTaken stats.
      void before;
    } else if (room.kind === 'camp') {
      character = longRest(character);
    }
    // shrine / event / treasure: sim leaves them no-op. Blessings + camp boons
    // are pre-stamped so shrine pickups would dilute the signal.
  }
  if (!stats.died) {
    stats.roomsCleared = delve.rooms.length;
  }
  return stats;
}

export interface ScenarioSummary {
  scenarioId: ScenarioId;
  label: string;
  runs: number;
  deathRate: number;
  avgChaptersCleared: number;
  avgRoomsCleared: number;
  reachedFinalBossRate: number;
  killedMatronRate: number;
  bossKillRates: { ch1: number; ch2: number; ch3: number; ch4: number };
  deathByChapter: { ch1: number; ch2: number; ch3: number; ch4: number };
  avgDamageDealt: number;
  avgDamageTaken: number;
}

export function summarize(spec: ScenarioSpec, runs: DelveRunStats[]): ScenarioSummary {
  const n = runs.length;
  const avg = (sel: (r: DelveRunStats) => number) =>
    runs.reduce((s, r) => s + sel(r), 0) / n;
  const rate = (sel: (r: DelveRunStats) => boolean) =>
    runs.filter(sel).length / n;
  return {
    scenarioId: spec.id,
    label: spec.label,
    runs: n,
    deathRate: rate((r) => r.died),
    avgChaptersCleared: avg((r) => r.chaptersCleared),
    avgRoomsCleared: avg((r) => r.roomsCleared),
    reachedFinalBossRate: rate((r) => r.reachedFinalBoss),
    killedMatronRate: rate((r) => r.killedMatron),
    bossKillRates: {
      ch1: rate((r) => r.bossKills.ch1),
      ch2: rate((r) => r.bossKills.ch2),
      ch3: rate((r) => r.bossKills.ch3),
      ch4: rate((r) => r.bossKills.ch4),
    },
    deathByChapter: {
      ch1: rate((r) => r.died && r.deathChapter === 1),
      ch2: rate((r) => r.died && r.deathChapter === 2),
      ch3: rate((r) => r.died && r.deathChapter === 3),
      ch4: rate((r) => r.died && r.deathChapter === 4),
    },
    avgDamageDealt: avg((r) => r.damageDealt),
    avgDamageTaken: avg((r) => r.damageTaken),
  };
}

export interface RunScenarioOpts {
  runs: number;
  baseSeed?: number;
}

export function runScenario(spec: ScenarioSpec, opts: RunScenarioOpts): ScenarioSummary {
  const baseSeed = opts.baseSeed ?? 0xCFD17A17 >>> 0;
  const runs: DelveRunStats[] = [];
  for (let i = 0; i < opts.runs; i++) {
    const seed =
      (baseSeed ^
        (spec.id.length * 7919) ^
        (spec.classId.length * 1009) ^
        (i * 104729)) >>>
      0;
    runs.push(runDelve(spec, seed));
  }
  return summarize(spec, runs);
}

export function runAllScenarios(opts: RunScenarioOpts): ScenarioSummary[] {
  return listScenarios().map((s) => runScenario(s, opts));
}

/**
 * Build a scenario variant with one Phase 1 feature disabled. Used for
 * per-feature ablation when a scenario tripped a flag.
 */
export type AblationKnob = 'no-blessings' | 'no-camp-boons' | 'no-mantle-hp';

export function ablate(spec: ScenarioSpec, knob: AblationKnob): ScenarioSpec {
  switch (knob) {
    case 'no-blessings':
      return { ...spec, blessings: [] };
    case 'no-camp-boons':
      return {
        ...spec,
        campBoons: [],
        mantleBump: false,
        vigorBump: false,
        patienceBump: false,
      };
    case 'no-mantle-hp':
      return {
        ...spec,
        campBoons: spec.campBoons.filter((b) => b !== 'mantle-of-the-slain'),
        mantleBump: false,
      };
  }
}
