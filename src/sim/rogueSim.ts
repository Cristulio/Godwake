/**
 * Rogue balance simulator. Drives the engine through a chained Godwake delve
 * room by room with a fixed Rogue AI (optimal Hide → Sneak Attack loop) and
 * records the numbers needed to diagnose the "feels immortal" playtest report.
 *
 * Not part of the shipped game. Run via vitest:
 *   npm run test:run -- src/sim/rogueSim.test.ts
 */
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState, RoomSpec } from '../types/delve';
import { setActiveRoller, getActiveRoller } from '../engine/dice';
import { buildPlayerCharacter } from '../engine/character/defaultCharacter';
import { applyLevelUp } from '../engine/character/leveling';
import { shortRestHeal, longRest } from '../engine/character/actions';
import { createGodwakeDelve } from '../engine/delve';
import { getMonster } from '../content/monsters';
import { rollBlessingOptions } from '../engine/character/blessings';
import { getBlessing } from '../content/blessings';
import {
  createCombat,
  playerAttack,
  monsterAttack,
  useCunningAction,
  useConsumable,
  endTurn,
  currentCombatantId,
} from '../engine/combat';
import type { RaceId } from '../schemas/ids';

interface PerRunStats {
  startLevel: number;
  variant: SimVariant;
  chaptersCleared: number;
  roomsCleared: number;
  encountersFought: number;
  damageDealt: number;
  damageTaken: number;
  hpHealedRestRooms: number;
  hpHealedPotions: number;
  hpHealedTempBlessing: number;
  cunningHideUses: number;
  cunningDashUses: number;
  cunningDisengageUses: number;
  cunningSteelUses: number;
  sneakAttacksFired: number;
  potionsUsed: number;
  blessingsCollected: string[];
  died: boolean;
  deathRoom: string | null;
  deathChapter: number;
  finalLevel: number;
}

/**
 * `vanilla` = bare-soul rogue, no shrine/event interaction. Establishes the floor.
 * `loaded` = realistic player run: pick a defensive blessing at each shrine
 * (the player-side "I get auto-healing temp HP every room" lever shows up here).
 */
export type SimVariant = 'vanilla' | 'loaded';

interface CellResult {
  startLevel: number;
  variant: SimVariant;
  runs: PerRunStats[];
}

export interface MatrixSummary {
  startLevel: number;
  variant: SimVariant;
  runs: number;
  deathRate: number;
  avgChaptersCleared: number;
  avgRoomsCleared: number;
  avgEncountersFought: number;
  avgDamageDealt: number;
  avgDamageTaken: number;
  avgHpHealedRest: number;
  avgHpHealedTemp: number;
  cunningHidePct: number;
  cunningDashPct: number;
  cunningDisengagePct: number;
  cunningSteelPct: number;
  avgSneakAttacks: number;
  avgPotionsUsed: number;
  avgHpDeltaPerEncounter: number;
  deathByChapter: Record<number, number>;
  blessingPickRate: Record<string, number>;
}

function makeRogue(): Character {
  return buildPlayerCharacter({
    name: 'Maelis Vell',
    raceId: 'wood-elf' as RaceId,
    classId: 'rogue',
    baseAbilityScores: { str: 8, dex: 14, con: 14, int: 12, wis: 12, cha: 10 },
    skillProficiencies: ['stealth', 'sleight-of-hand'],
  });
}

function levelTo(character: Character, target: number): Character {
  let c = character;
  while (c.level < target) {
    c = applyLevelUp(c);
  }
  return c;
}

function chapterFor(roomIdx: number): number {
  // Godwake layout (58 rooms): ch1 indices 0–12 (boss 12, camp 13),
  // ch2 14–27 (boss 27, camp 28), ch3 29–42 (boss 42, camp 43),
  // ch4 44–57 (boss 57). Each camp bills to the chapter it follows.
  if (roomIdx <= 13) return 1;
  if (roomIdx <= 28) return 2;
  if (roomIdx <= 43) return 3;
  return 4;
}

function chooseCunningAction(
  character: Character,
  state: CombatState,
): 'hide' | 'disengage' | 'dash' | 'steel' | null {
  if (character.actionEconomy.bonusActionUsed) return null;
  if ((character.resources.cunningActionUsesRemaining ?? 0) <= 0) return null;
  // Don't waste a Cunning Action on the last enemy of a fight.
  const aliveMonsters = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ).length;
  if (aliveMonsters === 0) return null;

  const hpPct = character.hp.current / character.hp.max;
  // Heavy emergency: Disengage to soak the next hit.
  if (hpPct < 0.3) return 'disengage';
  // Sneak Attack already fired this turn? Don't burn Hide.
  if (state.sneakAttackUsedThisTurn) return null;
  // Hide for advantage → triggers Sneak Attack on the upcoming swing.
  if (!character.nextAttackAdvantage) return 'hide';
  return null;
}

function pickMonsterTarget(state: CombatState): string | null {
  // Focus the lowest-HP alive monster (clean kill priority).
  const alive = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  if (alive.length === 0) return null;
  alive.sort((a, b) => {
    if (a.kind !== 'monster' || b.kind !== 'monster') return 0;
    return a.instance.hp.current - b.instance.hp.current;
  });
  return alive[0].id;
}

function findHealingPotionIdx(character: Character): number {
  return character.inventory.findIndex((ref) => ref.itemId === 'potion-of-healing');
}

function shouldQuaffPotion(character: Character): boolean {
  if (findHealingPotionIdx(character) < 0) return false;
  return character.hp.current / character.hp.max <= 0.35;
}

function runCombatEncounter(
  characterIn: Character,
  monsterRefs: { defId: string; count: number }[],
  stats: PerRunStats,
): { character: Character; died: boolean; damageDealtThis: number; damageTakenThis: number } {
  const roller = getActiveRoller();
  const monsters = monsterRefs.flatMap((m) => {
    const def = getMonster(m.defId);
    return Array.from({ length: m.count }, () => ({ def }));
  });

  const tempBefore = characterIn.hp.temp;
  const created = createCombat({ roller, character: characterIn, monsters });
  let state: CombatState = created.state;
  let character: Character = created.character;
  const tempAfter = character.hp.temp;
  if (tempAfter > tempBefore) {
    stats.hpHealedTempBlessing += tempAfter - tempBefore;
  }

  const startMonsterHpTotal = state.combatants.reduce((sum, c) => {
    return c.kind === 'monster' ? sum + c.instance.hp.current : sum;
  }, 0);
  const startCharHp = character.hp.current;

  let safetyTurns = 0;
  while (state.status === 'active' && safetyTurns < 200) {
    safetyTurns++;
    const cur = currentCombatantId(state);
    if (cur === 'player') {
      if (character.hp.current <= 0) break;

      // Optional: quaff a potion if very low and we have one.
      if (shouldQuaffPotion(character) && !character.actionEconomy.actionUsed) {
        const idx = findHealingPotionIdx(character);
        if (idx >= 0) {
          const before = character.hp.current;
          const used = useConsumable({ roller, character, state }, idx);
          state = used.state;
          character = used.character;
          stats.hpHealedPotions += character.hp.current - before;
          stats.potionsUsed += 1;
        }
      }

      const cunning = chooseCunningAction(character, state);
      if (cunning) {
        const r = useCunningAction({ character, state, choice: cunning });
        state = r.state;
        character = r.character;
        if (cunning === 'hide') stats.cunningHideUses += 1;
        else if (cunning === 'dash') stats.cunningDashUses += 1;
        else if (cunning === 'disengage') stats.cunningDisengageUses += 1;
        else if (cunning === 'steel') stats.cunningSteelUses += 1;
      }

      // Attack (main hand)
      if (!character.actionEconomy.actionUsed) {
        const targetId = pickMonsterTarget(state);
        const weaponId = character.equipped.mainHand?.itemId;
        if (targetId && weaponId) {
          const sneakBefore = state.sneakAttackUsedThisTurn === true;
          const r = playerAttack({ roller, character, state }, targetId, weaponId);
          state = r.state;
          character = r.character;
          if (!sneakBefore && state.sneakAttackUsedThisTurn === true) {
            stats.sneakAttacksFired += 1;
          }
        }
      }

      // Bonus attack (Dash flag) — fire it before ending the turn.
      if (character.bonusAttackAvailable) {
        const targetId = pickMonsterTarget(state);
        const weaponId = character.equipped.mainHand?.itemId;
        if (targetId && weaponId) {
          const r = playerAttack({ roller, character, state }, targetId, weaponId);
          state = r.state;
          character = r.character;
        }
      }

      const turned = endTurn(state, character);
      state = turned.state;
      character = turned.character;
    } else {
      // Monster turn — auto-attack.
      const monsterCombatant = state.combatants.find((c) => c.id === cur);
      if (!monsterCombatant || monsterCombatant.kind !== 'monster' || monsterCombatant.instance.hp.current <= 0) {
        const turned = endTurn(state, character);
        state = turned.state;
        character = turned.character;
        continue;
      }
      const r = monsterAttack({ roller, character, state }, cur);
      state = r.state;
      character = r.character;
      const turned = endTurn(state, character);
      state = turned.state;
      character = turned.character;
    }
  }

  const died = character.hp.current <= 0 || state.status === 'player-defeat';
  const endMonsterHpTotal = state.combatants.reduce((sum, c) => {
    return c.kind === 'monster' ? sum + c.instance.hp.current : sum;
  }, 0);
  const damageDealtThis = Math.max(0, startMonsterHpTotal - endMonsterHpTotal);
  const damageTakenThis = Math.max(0, startCharHp - character.hp.current);
  stats.damageDealt += damageDealtThis;
  stats.damageTaken += damageTakenThis;
  return { character, died, damageDealtThis, damageTakenThis };
}

/**
 * Score a blessing for our "defensive-optimal" player AI. Higher = more
 * desirable. Roughly: temp HP per room is the strongest lever (renewable),
 * then flat damage and AC, then first-attack tricks.
 */
function scoreBlessing(id: string): number {
  try {
    const b = getBlessing(id);
    const m = b.modifiers ?? {};
    let s = 0;
    if (m.extraTempHpPerRoom) s += m.extraTempHpPerRoom * 10;
    if (m.acBonus) s += m.acBonus * 6;
    if (m.damageBonus) s += m.damageBonus * 4;
    if (m.holyDamageBonus) s += m.holyDamageBonus * 3;
    if (m.firstAttackDamage) s += m.firstAttackDamage * 2;
    if (m.firstAttackBonus) s += m.firstAttackBonus * 2;
    if (m.firstAttackAdvantage) s += 5;
    if (m.critRangeBonus) s += m.critRangeBonus * 4;
    if (m.rerollMissesPerEncounter) s += m.rerollMissesPerEncounter * 3;
    return s;
  } catch {
    return -1;
  }
}

function pickBlessingAtShrine(character: Character, stats: PerRunStats): Character {
  const roller = getActiveRoller();
  const options = rollBlessingOptions(roller, 3);
  if (options.length === 0) return character;
  let best = options[0];
  let bestScore = scoreBlessing(best);
  for (const id of options.slice(1)) {
    const s = scoreBlessing(id);
    if (s > bestScore) {
      bestScore = s;
      best = id;
    }
  }
  if (character.blessings.includes(best)) return character;
  stats.blessingsCollected.push(best);
  return { ...character, blessings: [...character.blessings, best] };
}

function runSingleDelve(
  startLevel: number,
  variant: SimVariant,
  delveSeed: number,
  stats: PerRunStats,
): { character: Character; died: boolean } {
  let character = makeRogue();
  if (startLevel > 1) {
    character = levelTo(character, startLevel);
    // Ensure HP is full at the start.
    character = { ...character, hp: { ...character.hp, current: character.hp.max } };
  }
  // Run delve construction with the seeded RNG (createGodwakeDelve takes a seed).
  const delve: DelveState = createGodwakeDelve({ seed: delveSeed });
  let died = false;

  for (let i = 0; i < delve.rooms.length && !died; i++) {
    const room: RoomSpec = delve.rooms[i];
    const chapter = chapterFor(i);
    stats.roomsCleared = i;
    stats.chaptersCleared = chapter - 1;
    if (room.kind === 'combat' || room.kind === 'boss') {
      stats.encountersFought += 1;
      const result = runCombatEncounter(character, room.monsters ?? [], stats);
      character = result.character;
      died = result.died;
      if (died) {
        stats.deathRoom = room.id;
        stats.deathChapter = chapter;
      } else {
        // Reset per-encounter, per-turn flags
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
      stats.hpHealedRestRooms += character.hp.current - before;
    } else if (room.kind === 'camp') {
      // Camp room — sim takes the rest choice (longRest).
      character = longRest(character);
    } else if (room.kind === 'shrine' && variant === 'loaded') {
      character = pickBlessingAtShrine(character, stats);
    }
    // events: no-op (sim doesn't model player choice)
  }
  if (!died) {
    stats.chaptersCleared = chapterFor(delve.rooms.length - 1);
    stats.roomsCleared = delve.rooms.length;
  }
  stats.finalLevel = character.level;
  return { character, died };
}

/**
 * Run a full life-and-death loop: the soul descends, dies (or wins), reincarnates,
 * descends again. Stops once the soul reaches `targetLevel` worth of XP OR the
 * loop hits the maximum number of attempts. For the matrix we always sample
 * the first delve at a given start level — the reincarnation arc would push
 * the rogue past the level we're studying.
 */
export function runRogueDelve(
  startLevel: number,
  seed: number,
  variant: SimVariant = 'vanilla',
): PerRunStats {
  setActiveRoller(seed);
  const stats: PerRunStats = {
    startLevel,
    variant,
    chaptersCleared: 0,
    roomsCleared: 0,
    encountersFought: 0,
    damageDealt: 0,
    damageTaken: 0,
    hpHealedRestRooms: 0,
    hpHealedPotions: 0,
    hpHealedTempBlessing: 0,
    cunningHideUses: 0,
    cunningDashUses: 0,
    cunningDisengageUses: 0,
    cunningSteelUses: 0,
    sneakAttacksFired: 0,
    potionsUsed: 0,
    blessingsCollected: [],
    died: false,
    deathRoom: null,
    deathChapter: 0,
    finalLevel: startLevel,
  };

  const delveSeed = seed >>> 0;
  const { died } = runSingleDelve(startLevel, variant, delveSeed, stats);
  stats.died = died;
  return stats;
}

export function runMatrix(
  startLevels: number[],
  variants: SimVariant[],
  runsPerCell: number,
  baseSeed: number = 0x5eed5eed,
): { cells: CellResult[]; summaries: MatrixSummary[] } {
  const cells: CellResult[] = [];
  const summaries: MatrixSummary[] = [];

  for (const variant of variants) {
    for (const startLevel of startLevels) {
      const runs: PerRunStats[] = [];
      for (let i = 0; i < runsPerCell; i++) {
        const seed = (baseSeed ^ (startLevel * 1009) ^ (i * 7919) ^ (variant === 'loaded' ? 0xabad1dea : 0)) >>> 0;
        const stats = runRogueDelve(startLevel, seed, variant);
        runs.push(stats);
      }
      cells.push({ startLevel, variant, runs });
      summaries.push(summarize(startLevel, variant, runs));
    }
  }
  return { cells, summaries };
}

function summarize(startLevel: number, variant: SimVariant, runs: PerRunStats[]): MatrixSummary {
  const n = runs.length;
  const avg = (sel: (r: PerRunStats) => number) => runs.reduce((s, r) => s + sel(r), 0) / n;
  const deathByChapter: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let totalCunning = 0;
  let totalHide = 0;
  let totalDash = 0;
  let totalDis = 0;
  let totalSteel = 0;
  let totalEnc = 0;
  let totalHpDelta = 0;
  const blessingCounts: Record<string, number> = {};

  for (const r of runs) {
    if (r.died) deathByChapter[r.deathChapter] = (deathByChapter[r.deathChapter] ?? 0) + 1;
    totalHide += r.cunningHideUses;
    totalDash += r.cunningDashUses;
    totalDis += r.cunningDisengageUses;
    totalSteel += r.cunningSteelUses;
    totalCunning += r.cunningHideUses + r.cunningDashUses + r.cunningDisengageUses + r.cunningSteelUses;
    totalEnc += r.encountersFought;
    totalHpDelta += (r.hpHealedRestRooms + r.hpHealedPotions + r.hpHealedTempBlessing - r.damageTaken);
    for (const bid of r.blessingsCollected) {
      blessingCounts[bid] = (blessingCounts[bid] ?? 0) + 1;
    }
  }

  const blessingPickRate: Record<string, number> = {};
  for (const [id, c] of Object.entries(blessingCounts)) {
    blessingPickRate[id] = c / n;
  }

  return {
    startLevel,
    variant,
    runs: n,
    deathRate: runs.filter((r) => r.died).length / n,
    avgChaptersCleared: avg((r) => r.chaptersCleared),
    avgRoomsCleared: avg((r) => r.roomsCleared),
    avgEncountersFought: avg((r) => r.encountersFought),
    avgDamageDealt: avg((r) => r.damageDealt),
    avgDamageTaken: avg((r) => r.damageTaken),
    avgHpHealedRest: avg((r) => r.hpHealedRestRooms),
    avgHpHealedTemp: avg((r) => r.hpHealedTempBlessing),
    cunningHidePct: totalCunning > 0 ? totalHide / totalCunning : 0,
    cunningDashPct: totalCunning > 0 ? totalDash / totalCunning : 0,
    cunningDisengagePct: totalCunning > 0 ? totalDis / totalCunning : 0,
    cunningSteelPct: totalCunning > 0 ? totalSteel / totalCunning : 0,
    avgSneakAttacks: avg((r) => r.sneakAttacksFired),
    avgPotionsUsed: avg((r) => r.potionsUsed),
    avgHpDeltaPerEncounter: totalEnc > 0 ? totalHpDelta / totalEnc : 0,
    deathByChapter,
    blessingPickRate,
  };
}

export function formatSummary(s: MatrixSummary): string {
  const lines: string[] = [];
  lines.push(`### L${s.startLevel} · ${s.variant} — ${s.runs} runs`);
  lines.push('');
  lines.push(`- **Death rate:** ${(s.deathRate * 100).toFixed(0)}%`);
  lines.push(`- **Avg chapters cleared:** ${s.avgChaptersCleared.toFixed(2)} / 4`);
  lines.push(`- **Avg rooms cleared:** ${s.avgRoomsCleared.toFixed(1)} / 50`);
  lines.push(`- **Avg encounters fought:** ${s.avgEncountersFought.toFixed(1)}`);
  lines.push(`- **Avg damage dealt:** ${s.avgDamageDealt.toFixed(1)}`);
  lines.push(`- **Avg damage taken:** ${s.avgDamageTaken.toFixed(1)}`);
  lines.push(`- **Avg HP healed (rest rooms):** ${s.avgHpHealedRest.toFixed(1)}`);
  lines.push(`- **Avg temp HP from blessings:** ${s.avgHpHealedTemp.toFixed(1)}`);
  lines.push(`- **Avg HP delta per encounter (heal − dmg taken):** ${s.avgHpDeltaPerEncounter.toFixed(2)}`);
  lines.push(`- **Avg Sneak Attacks fired:** ${s.avgSneakAttacks.toFixed(1)}`);
  lines.push(`- **Avg potions used:** ${s.avgPotionsUsed.toFixed(2)}`);
  lines.push(
    `- **Cunning Action split:** Hide ${(s.cunningHidePct * 100).toFixed(0)}% · Disengage ${(s.cunningDisengagePct * 100).toFixed(0)}% · Dash ${(s.cunningDashPct * 100).toFixed(0)}% · Steel ${(s.cunningSteelPct * 100).toFixed(0)}%`,
  );
  lines.push(
    `- **Deaths by chapter:** Ch1 ${s.deathByChapter[1] ?? 0} · Ch2 ${s.deathByChapter[2] ?? 0} · Ch3 ${s.deathByChapter[3] ?? 0} · Ch4 ${s.deathByChapter[4] ?? 0}`,
  );
  if (s.variant === 'loaded') {
    const top = Object.entries(s.blessingPickRate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (top.length > 0) {
      lines.push(
        `- **Top blessings picked:** ${top.map(([id, rate]) => `${id} (${(rate * 100).toFixed(0)}%)`).join(', ')}`,
      );
    }
  }
  return lines.join('\n');
}
