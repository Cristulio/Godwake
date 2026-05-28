/**
 * Immortal-hypothesis simulator. Originally tested whether the playtester's
 * "immortal Rogue" feeling came from blessing-stack abuse: `extraTempHpPerRoom`
 * aggregating additively, so picking Lathander's Dawn (+3) and Ilmater's Crown
 * (+2) together granted +5 temp HP every combat instead of the higher of the
 * two. PR #80 confirmed and fixed that case.
 *
 * Extended for the blessing-aggregator audit follow-up to also stress the
 * other in-pool stacking fields the audit flagged: `acBonus`, `critRangeBonus`,
 * `damageBonus`. Runs Rogue/Fighter/Wizard at L3/L5/L7 across seven loadouts:
 *
 *   A — vacuum:        no blessings, no Grove upgrades (floor reference)
 *   B — single tHP:    Lathander's Dawn only
 *   C — stacked tHP:   Lathander's Dawn + Ilmater's Crown (the suspect combo)
 *   D — Grove+stacked: C + a fully-invested defensive Grove loadout
 *   E — stacked AC:    Helm's Aegis + Mystra's Ward + Silvanus's Root (reaches +3 AC pre-fix)
 *   F — stacked crit:  Tempus's Edge + Tymora's Gambit (crit on 18–20 pre-fix)
 *   G — stacked dmg:   Mystra's Whisper + Silvanus's Thorn (+2/hit pre-fix)
 *
 * Original temp-HP hypothesis is CONFIRMED if C is meaningfully better than B
 * and B than A. After the #80 fix, C should ≈ B. The new E/F/G loadouts are
 * regression cells: post-aggregator-audit, picking the second source in each
 * category should grant no extra power versus a single source.
 *
 * Run via vitest:
 *   npm run test:run -- src/sim/immortalHypothesisSim.test.ts
 */
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState, RoomSpec } from '../types/delve';
import type { ClassId } from '../schemas/ids';
import { setActiveRoller, getActiveRoller } from '../engine/dice';
import { applyLevelUp } from '../engine/character/leveling';
import { shortRestHeal, longRest } from '../engine/character/actions';
import { createGodwakeDelve } from '../engine/delve';
import { getMonster } from '../content/monsters';
import { getUpgrade } from '../content/upgrades';
import { applyDelveStartUpgrades, type UnlockedUpgrades } from '../engine/character/upgrades';
import {
  createCombat,
  monsterAttack,
  endTurn,
  currentCombatantId,
} from '../engine/combat';
import { characterAtLevel, takeTurn } from '../test/sim/encounterStress';

export type Loadout = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

const LOADOUT_BLESSINGS: Record<Loadout, string[]> = {
  A: [],
  B: ['lathanders-dawn'],
  C: ['lathanders-dawn', 'ilmaters-crown'],
  D: ['lathanders-dawn', 'ilmaters-crown'],
  E: ['helms-aegis', 'mystras-ward', 'silvanus-root'],
  F: ['tempus-edge', 'tymoras-gambit'],
  G: ['mystras-whisper', 'silvanus-thorn'],
};

/**
 * Grove loadout for D — a fully-invested defensive soul. Picked from the
 * categories that compound survival: +30 max HP (Mantle 5 + Iron Will 1),
 * +3 AC (Cloak 3), +3 stabilise charges per delve (Hardier Soul 3),
 * +3 Second Wind bonus for Fighter (Wellspring Vigil 3).
 */
const GROVE_LOADOUT_D: UnlockedUpgrades = {
  'mantle-of-the-wakened': 5,
  'iron-will': 1,
  'cloak-of-the-grove': 3,
  'hardier-soul': 3,
  'wellspring-vigil': 3,
};

export interface RunStats {
  classId: ClassId;
  startLevel: number;
  loadout: Loadout;
  died: boolean;
  deathChapter: number;
  deathRoom: string | null;
  chaptersCleared: number;
  roomsCleared: number;
  encountersFought: number;
  damageDealt: number;
  damageTaken: number;
  hpHealedRest: number;
  hpHealedPotion: number;
  tempHpGained: number;
  tempHpPerEncounter: number;
  effectiveHp: number; // hp.max + tempHpGained
}

export interface CellSummary {
  classId: ClassId;
  startLevel: number;
  loadout: Loadout;
  runs: number;
  deathRate: number;
  avgChaptersCleared: number;
  avgRoomsCleared: number;
  avgDamageTaken: number;
  avgTempHpGained: number;
  avgTempHpPerEncounter: number;
  avgEffectiveHp: number;
}

/**
 * Apply Grove upgrades to a leveled character. Mirrors the parts of
 * delveStore.startDelve that we need: permanent HP bonus folds into hp.max,
 * delveStart upgrades are stamped via applyDelveStartUpgrades.
 *
 * applyLevelUp doesn't read permanentBonuses.hp (level-up just adds the
 * hitDie roll to existing hp.max), so we level FIRST, then add the
 * permanent HP delta as a one-time top-up.
 */
function applyGrove(c: Character, unlocked: UnlockedUpgrades): Character {
  let r = c;
  // Permanent upgrades: each rank N call applies the rank's delta (e.g. +5 HP).
  for (const [id, maxRank] of Object.entries(unlocked)) {
    const up = getUpgrade(id);
    if (up.kind !== 'permanent') continue;
    for (let rank = 1; rank <= maxRank; rank++) {
      r = up.apply(r, rank);
    }
  }
  // Re-baseline HP: applyLevelUp doesn't see permanentBonuses, so add the
  // accumulated permanent HP bonus to the rolled max once here.
  const permHp = r.permanentBonuses?.hp ?? 0;
  if (permHp > 0) {
    const newMax = r.hp.max + permHp;
    r = { ...r, hp: { current: newMax, max: newMax, temp: r.hp.temp } };
  }
  // Delve-start upgrades (Hardier Soul, Wellspring Vigil) — stamp per-delve fields.
  r = applyDelveStartUpgrades(r, unlocked);
  return r;
}

function makeCharacter(classId: ClassId, level: number, loadout: Loadout): Character {
  let c = characterAtLevel(classId, level);
  c = { ...c, hp: { ...c.hp, current: c.hp.max } };
  // Blessings: just stamp them on the character. The engine reads them via
  // characterBlessingMods at combat start (where temp HP is granted).
  c = { ...c, blessings: [...c.blessings, ...LOADOUT_BLESSINGS[loadout]] };
  if (loadout === 'D') {
    c = applyGrove(c, GROVE_LOADOUT_D);
  }
  return c;
}

function chapterFor(roomIdx: number): number {
  if (roomIdx <= 9) return 1;
  if (roomIdx <= 19) return 2;
  if (roomIdx <= 28) return 3;
  return 4;
}

interface EncounterResult {
  character: Character;
  died: boolean;
  damageDealt: number;
  damageTaken: number;
  tempHpGained: number;
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

  const tempBefore = characterIn.hp.temp;
  const created = createCombat({ roller, character: characterIn, monsters });
  let state: CombatState = created.state;
  let character: Character = created.character;
  // Temp HP granted by extraTempHpPerRoom shows up as a positive delta on
  // hp.temp at combat start. RAW: temp HP doesn't stack — engine takes
  // max(current, granted). Per-room gain = granted, regardless of carry-over.
  const tempAfter = character.hp.temp;
  const tempHpGained = Math.max(0, tempAfter - tempBefore);

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
  // Net HP lost from the encounter — counts both hp.current loss AND temp HP
  // consumed. Temp HP soaks damage before HP, so dmg taken = (startHp - endHp) +
  // (startTemp - endTemp) when temp HP was burned through.
  const charHpLost = Math.max(0, startCharHp - character.hp.current);
  const tempConsumed = Math.max(0, startCharTemp + tempHpGained - character.hp.temp);
  const damageTaken = charHpLost + tempConsumed;
  return { character, died, damageDealt, damageTaken, tempHpGained };
}

export function runDelve(
  classId: ClassId,
  startLevel: number,
  loadout: Loadout,
  seed: number,
): RunStats {
  setActiveRoller(seed >>> 0);
  let character = makeCharacter(classId, startLevel, loadout);
  const delve: DelveState = createGodwakeDelve({ seed: seed >>> 0 });

  const stats: RunStats = {
    classId,
    startLevel,
    loadout,
    died: false,
    deathChapter: 0,
    deathRoom: null,
    chaptersCleared: 0,
    roomsCleared: 0,
    encountersFought: 0,
    damageDealt: 0,
    damageTaken: 0,
    hpHealedRest: 0,
    hpHealedPotion: 0,
    tempHpGained: 0,
    tempHpPerEncounter: 0,
    effectiveHp: character.hp.max,
  };

  for (let i = 0; i < delve.rooms.length && !stats.died; i++) {
    const room: RoomSpec = delve.rooms[i];
    const chapter = chapterFor(i);
    stats.roomsCleared = i;
    stats.chaptersCleared = chapter - 1;
    if (room.kind === 'combat' || room.kind === 'boss') {
      stats.encountersFought += 1;
      const result = runCombatEncounter(character, room.monsters ?? []);
      character = result.character;
      stats.damageDealt += result.damageDealt;
      stats.damageTaken += result.damageTaken;
      stats.tempHpGained += result.tempHpGained;
      stats.died = result.died;
      if (stats.died) {
        stats.deathRoom = room.id;
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
      }
    } else if (room.kind === 'rest') {
      const before = character.hp.current;
      const healAmount = Math.floor(character.hp.max * 0.7);
      character = shortRestHeal(character, healAmount);
      stats.hpHealedRest += character.hp.current - before;
    } else if (room.kind === 'camp') {
      character = longRest(character);
    }
    // shrine / event / treasure: sim leaves them no-op (the loadout's
    // blessings are pre-stamped, so shrine pickups would dilute the signal).
  }
  if (!stats.died) {
    stats.chaptersCleared = chapterFor(delve.rooms.length - 1);
    stats.roomsCleared = delve.rooms.length;
  }
  stats.tempHpPerEncounter =
    stats.encountersFought > 0 ? stats.tempHpGained / stats.encountersFought : 0;
  stats.effectiveHp = character.hp.max + stats.tempHpGained;
  return stats;
}

export function summarize(
  classId: ClassId,
  startLevel: number,
  loadout: Loadout,
  runs: RunStats[],
): CellSummary {
  const n = runs.length;
  const avg = (sel: (r: RunStats) => number) => runs.reduce((s, r) => s + sel(r), 0) / n;
  return {
    classId,
    startLevel,
    loadout,
    runs: n,
    deathRate: runs.filter((r) => r.died).length / n,
    avgChaptersCleared: avg((r) => r.chaptersCleared),
    avgRoomsCleared: avg((r) => r.roomsCleared),
    avgDamageTaken: avg((r) => r.damageTaken),
    avgTempHpGained: avg((r) => r.tempHpGained),
    avgTempHpPerEncounter: avg((r) => r.tempHpPerEncounter),
    avgEffectiveHp: avg((r) => r.effectiveHp),
  };
}

export interface MatrixOpts {
  classes: ClassId[];
  levels: number[];
  loadouts: Loadout[];
  runsPerCell: number;
  baseSeed?: number;
}

export function runMatrix(opts: MatrixOpts): CellSummary[] {
  const baseSeed = opts.baseSeed ?? 0x1117a17 >>> 0;
  const summaries: CellSummary[] = [];
  for (const classId of opts.classes) {
    for (const startLevel of opts.levels) {
      for (const loadout of opts.loadouts) {
        const runs: RunStats[] = [];
        for (let i = 0; i < opts.runsPerCell; i++) {
          const seed =
            (baseSeed ^
              (classId.length * 7919) ^
              (startLevel * 1009) ^
              (loadout.charCodeAt(0) * 31337) ^
              (i * 104729)) >>>
            0;
          runs.push(runDelve(classId, startLevel, loadout, seed));
        }
        summaries.push(summarize(classId, startLevel, loadout, runs));
      }
    }
  }
  return summaries;
}

void applyLevelUp;
