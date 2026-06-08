/**
 * Encounter stress-test simulator. Headlessly resolves a single encounter
 * with a class-archetype character at the expected level for the encounter's
 * slot, repeats it N times, and reports win-rate / round-count / HP-on-win
 * per cell.
 *
 * Pure sim plumbing — no React, no store. Used by encounterStress.sim.test.ts
 * to write the matrix report and pick fix targets.
 */
import type { Character } from '../../types/character';
import type { CombatState, MonsterCombatant } from '../../types/combat';
import type { RoomMonster } from '../../types/delve';
import { createCharacter, STANDARD_ARRAY } from '../../engine/character/initialize';
import { simulateLevelUp } from '../../engine/character/leveling';
import { createDiceRoller, type DiceRoller } from '../../engine/dice';
import { createCombat } from '../../engine/combat/createCombat';
import { monsterAttack } from '../../engine/combat/attack';
import { endTurn } from '../../engine/combat/turn';
import { runAutoTurn, chooseBlessing } from '../../engine/combat/actionPolicy';
import { rollBlessingOptions } from '../../engine/character/blessings';
import { getMonster } from '../../content/monsters';
import type { ClassId, RaceId } from '../../schemas/ids';
import type { EncounterEntry } from '../../engine/delve/chapter1Pools';

export interface SimCellResult {
  encounterTitle: string;
  classId: ClassId;
  level: number;
  runs: number;
  wins: number;
  losses: number;
  avgRounds: number;
  avgHpPctOnWin: number; // 0-100
  deathPct: number; // 0-100
}

export interface SimRunOutcome {
  win: boolean;
  rounds: number;
  hpPct: number; // 0-100; only meaningful if win
}

type ArchetypeBuilder = () => Character;

const ROGUE_ARCHETYPE: ArchetypeBuilder = () => {
  const c = createCharacter({
    id: 'sim-rogue',
    name: 'Shiv',
    raceId: 'wood-elf' as RaceId,
    classId: 'rogue',
    baseAbilityScores: {
      str: STANDARD_ARRAY[5], // 8
      dex: STANDARD_ARRAY[0], // 15
      con: STANDARD_ARRAY[1], // 14
      int: STANDARD_ARRAY[2], // 13
      wis: STANDARD_ARRAY[3], // 12
      cha: STANDARD_ARRAY[4], // 10
    },
  });
  return {
    ...c,
    inventory: [
      { itemId: 'rapier' },
      { itemId: 'dagger' },
      { itemId: 'shortbow' },
      { itemId: 'leather-armor' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'rapier' },
      offHand: null,
      armor: { itemId: 'leather-armor' },
    },
  };
};

const FIGHTER_ARCHETYPE: ArchetypeBuilder = () => {
  const c = createCharacter({
    id: 'sim-fighter',
    name: 'Brick',
    raceId: 'human' as RaceId,
    classId: 'fighter',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0], // 15
      con: STANDARD_ARRAY[1], // 14
      dex: STANDARD_ARRAY[2], // 13
      wis: STANDARD_ARRAY[3], // 12
      cha: STANDARD_ARRAY[4], // 10
      int: STANDARD_ARRAY[5], // 8
    },
  });
  return {
    ...c,
    inventory: [
      { itemId: 'longsword' },
      { itemId: 'leather-armor' },
      { itemId: 'shield' },
      { itemId: 'dagger' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'longsword' },
      offHand: { itemId: 'shield' },
      armor: { itemId: 'leather-armor' },
    },
  };
};

const WIZARD_ARCHETYPE: ArchetypeBuilder = () => {
  const c = createCharacter({
    id: 'sim-wizard',
    name: 'Quill',
    raceId: 'human' as RaceId,
    classId: 'wizard',
    baseAbilityScores: {
      int: STANDARD_ARRAY[0], // 15
      con: STANDARD_ARRAY[1], // 14
      dex: STANDARD_ARRAY[2], // 13
      wis: STANDARD_ARRAY[3], // 12
      cha: STANDARD_ARRAY[4], // 10
      str: STANDARD_ARRAY[5], // 8
    },
  });
  return {
    ...c,
    inventory: [
      { itemId: 'dagger' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'dagger' },
      offHand: null,
      armor: null,
    },
  };
};

const BARBARIAN_ARCHETYPE: ArchetypeBuilder = () => {
  const c = createCharacter({
    id: 'sim-barbarian',
    name: 'Cali Trava Consumer',
    raceId: 'human' as RaceId,
    classId: 'barbarian',
    baseAbilityScores: {
      str: STANDARD_ARRAY[0], // 15
      con: STANDARD_ARRAY[1], // 14
      dex: STANDARD_ARRAY[2], // 13
      cha: STANDARD_ARRAY[3], // 12
      wis: STANDARD_ARRAY[4], // 10
      int: STANDARD_ARRAY[5], // 8
    },
  });
  // No armor — Unarmored Defense — greataxe.
  return {
    ...c,
    inventory: [
      { itemId: 'greataxe' },
      { itemId: 'potion-of-healing' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'greataxe' },
      offHand: null,
      armor: null,
    },
  };
};

const RANGER_ARCHETYPE: ArchetypeBuilder = () => {
  const c = createCharacter({
    id: 'sim-ranger',
    name: 'Chompolario Biologo Trolo',
    raceId: 'wood-elf' as RaceId,
    classId: 'ranger',
    baseAbilityScores: {
      dex: STANDARD_ARRAY[0], // 15
      con: STANDARD_ARRAY[1], // 14
      str: STANDARD_ARRAY[2], // 13
      wis: STANDARD_ARRAY[3], // 12
      int: STANDARD_ARRAY[4], // 10
      cha: STANDARD_ARRAY[5], // 8
    },
  });
  return {
    ...c,
    inventory: [
      { itemId: 'longbow' },
      { itemId: 'shortsword' },
      { itemId: 'leather-armor' },
      { itemId: 'potion-of-healing' },
    ],
    equipped: {
      mainHand: { itemId: 'longbow' },
      offHand: null,
      armor: { itemId: 'leather-armor' },
    },
  };
};

type SimClassId = Extract<ClassId, 'rogue' | 'fighter' | 'wizard' | 'barbarian' | 'ranger'>;

const ARCHETYPES: Record<SimClassId, ArchetypeBuilder> = {
  rogue: ROGUE_ARCHETYPE,
  fighter: FIGHTER_ARCHETYPE,
  wizard: WIZARD_ARCHETYPE,
  barbarian: BARBARIAN_ARCHETYPE,
  ranger: RANGER_ARCHETYPE,
};

/**
 * Level a fresh archetype up to `targetLevel` by feeding stub XP. Optionally
 * pre-attach blessing ids — lets the single-encounter harness model a
 * shrine-buffed character (createCombat reads the blessing modifiers for
 * start-of-combat temp HP / regen, and derived AC / attack math folds the
 * rest in).
 */
export function characterAtLevel(
  classId: ClassId,
  targetLevel: number,
  blessings: string[] = [],
): Character {
  const builder = ARCHETYPES[classId as SimClassId];
  if (!builder) throw new Error(`No sim archetype for class: ${classId}`);
  let c = builder();
  while (c.level < targetLevel) {
    c = simulateLevelUp({ ...c, xp: 9999999 });
  }
  if (blessings.length > 0) c = { ...c, blessings: [...c.blessings, ...blessings] };
  return c;
}

/**
 * Roll a class-aware shrine offer and add the SHARED policy's pick to the
 * character — mirrors the in-game ShrineRoom flow (`rollBlessingOptions` +
 * `addBlessing`) so sim bots accrue blessings exactly as a competent player
 * would. Honours the soul's Grove `shrineOptionBonus` and dedups owned
 * non-stacking cards. Returns the character unchanged on an empty offer or an
 * already-held pick.
 */
export function pickBlessingAtShrine(roller: DiceRoller, character: Character): Character {
  const count = 3 + (character.shrineOptionBonus ?? 0);
  const offer = rollBlessingOptions(roller, count, character.classId, character.blessings);
  const pick = chooseBlessing(offer, character);
  if (!pick || character.blessings.includes(pick)) return character;
  return { ...character, blessings: [...character.blessings, pick] };
}

export function liveMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];
}

/**
 * Play a full player turn with the shared action policy — the SAME decision
 * logic that powers the in-game Auto-Battle toggle. The old inline per-class
 * AI (no Cunning Action, no L2 spells, no targeting) is gone; the bots now play
 * as competently as a watching player would, so sim findings track real play.
 */
export function takeTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  return runAutoTurn(roller, state, character);
}

const MAX_ROUNDS = 25;

export function simulateEncounter(
  classId: ClassId,
  level: number,
  monsters: RoomMonster[],
  seed: number,
  blessings: string[] = [],
): SimRunOutcome {
  const roller = createDiceRoller(seed);
  // Active roller is consumed by spell-side code via getActiveRoller()
  // (turn.ts paralyzed-tick path). Wire it to the same seed.
  // Safe to skip; the engine only reads it for paralyze-save ticks.

  const character = characterAtLevel(classId, level, blessings);

  const monsterDefs = monsters.flatMap((rm) => {
    const def = getMonster(rm.defId);
    const list = [];
    for (let i = 0; i < rm.count; i++) {
      list.push({
        def,
        displayName: rm.displayPrefix ? `${rm.displayPrefix} ${i + 1}` : def.name,
      });
    }
    return list;
  });

  const init = createCombat({ roller, character, monsters: monsterDefs });
  let s = init.state;
  let ch = init.character;

  for (let i = 0; i < MAX_ROUNDS * 8; i++) {
    if (s.status !== 'active') break;
    if (s.round > MAX_ROUNDS) break;
    const currentId = s.turnOrder[s.currentTurnIndex];
    if (currentId === 'player') {
      if (ch.hp.current <= 0) break;
      const r = takeTurn(roller, s, ch);
      s = r.state;
      ch = r.character;
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    } else {
      const r = monsterAttack({ roller, character: ch, state: s }, currentId);
      s = r.state;
      ch = r.character;
      if (s.status !== 'active') break;
      const e = endTurn(s, ch);
      s = e.state;
      ch = e.character;
    }
  }

  const win = s.status === 'player-victory';
  const hpPct = win ? (ch.hp.current / ch.hp.max) * 100 : 0;
  return { win, rounds: s.round, hpPct };
}

export function simulateCell(
  encounter: EncounterEntry,
  classId: ClassId,
  level: number,
  runs: number,
  seedBase: number,
  blessings: string[] = [],
): SimCellResult {
  let wins = 0;
  let totalRounds = 0;
  let totalHpPctOnWin = 0;
  for (let i = 0; i < runs; i++) {
    const out = simulateEncounter(classId, level, encounter.monsters, seedBase + i, blessings);
    totalRounds += out.rounds;
    if (out.win) {
      wins += 1;
      totalHpPctOnWin += out.hpPct;
    }
  }
  const losses = runs - wins;
  return {
    encounterTitle: encounter.title,
    classId,
    level,
    runs,
    wins,
    losses,
    avgRounds: totalRounds / runs,
    avgHpPctOnWin: wins > 0 ? totalHpPctOnWin / wins : 0,
    deathPct: (losses / runs) * 100,
  };
}
