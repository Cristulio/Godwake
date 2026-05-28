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
import { applyLevelUp } from '../../engine/character/leveling';
import { createDiceRoller, type DiceRoller } from '../../engine/dice';
import { createCombat } from '../../engine/combat/createCombat';
import { playerAttack } from '../../engine/combat/attack';
import { monsterAttack } from '../../engine/combat/attack';
import { endTurn } from '../../engine/combat/turn';
import { useSecondWind } from '../../engine/combat/secondWind';
import { useActionSurge } from '../../engine/combat/actionSurge';
import { useConsumable } from '../../engine/combat/useItem';
import { castSpell, slotsAt } from '../../engine/combat/spells';
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
    skillProficiencies: ['stealth', 'sleight-of-hand'],
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
    skillProficiencies: ['athletics', 'perception'],
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
    skillProficiencies: ['arcana', 'investigation'],
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

type SimClassId = Extract<ClassId, 'rogue' | 'fighter' | 'wizard'>;

const ARCHETYPES: Record<SimClassId, ArchetypeBuilder> = {
  rogue: ROGUE_ARCHETYPE,
  fighter: FIGHTER_ARCHETYPE,
  wizard: WIZARD_ARCHETYPE,
};

/** Level a fresh archetype up to `targetLevel` by feeding stub XP. */
export function characterAtLevel(classId: ClassId, targetLevel: number): Character {
  const builder = ARCHETYPES[classId as SimClassId];
  if (!builder) throw new Error(`No sim archetype for class: ${classId}`);
  let c = builder();
  while (c.level < targetLevel) {
    c = applyLevelUp({ ...c, xp: 9999999 });
  }
  return c;
}

export function liveMonsters(state: CombatState): MonsterCombatant[] {
  return state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ) as MonsterCombatant[];
}

function lowestHpMonsterId(state: CombatState): string | undefined {
  const live = liveMonsters(state);
  if (live.length === 0) return undefined;
  const sorted = [...live].sort(
    (a, b) => a.instance.hp.current - b.instance.hp.current,
  );
  return sorted[0].id;
}

function findHealingPotionIdx(c: Character): number {
  return c.inventory.findIndex((r) => r.itemId === 'potion-of-healing');
}

function rogueTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  const target = lowestHpMonsterId(s);
  if (!target) return { state: s, character: ch };

  // Heal if very low and a potion is in inventory.
  if (ch.hp.current <= ch.hp.max * 0.3) {
    const idx = findHealingPotionIdx(ch);
    if (idx >= 0 && !ch.actionEconomy.actionUsed) {
      const r = useConsumable({ roller, character: ch, state: s }, idx);
      s = r.state;
      ch = r.character;
    }
  }

  const weaponId = ch.equipped.mainHand?.itemId ?? 'dagger';
  const attacksToMake = 4; // upper bound; markPlayerActionUsed gates it
  for (let i = 0; i < attacksToMake; i++) {
    if (s.status !== 'active') break;
    const live = liveMonsters(s);
    if (live.length === 0) break;
    const tid = lowestHpMonsterId(s);
    if (!tid) break;
    if (ch.actionEconomy.actionUsed && !ch.bonusAttackAvailable) break;
    const r = playerAttack({ roller, character: ch, state: s }, tid, weaponId);
    s = r.state;
    ch = r.character;
  }
  return { state: s, character: ch };
}

function fighterTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  const liveStart = liveMonsters(s);
  if (liveStart.length === 0) return { state: s, character: ch };

  // Heal if very low and a potion is in inventory.
  if (ch.hp.current <= ch.hp.max * 0.3) {
    const idx = findHealingPotionIdx(ch);
    if (idx >= 0 && !ch.actionEconomy.actionUsed) {
      const r = useConsumable({ roller, character: ch, state: s }, idx);
      s = r.state;
      ch = r.character;
    }
  } else if (ch.hp.current <= ch.hp.max * 0.5 && ch.resources.secondWindAvailable && !ch.actionEconomy.bonusActionUsed) {
    const r = useSecondWind({ roller, character: ch, state: s });
    s = r.state;
    ch = r.character;
  }

  const weaponId = ch.equipped.mainHand?.itemId ?? 'longsword';

  for (let pass = 0; pass < 2; pass++) {
    if (s.status !== 'active') break;
    // Burn attacks while action available
    for (let i = 0; i < 4; i++) {
      if (s.status !== 'active') break;
      const live = liveMonsters(s);
      if (live.length === 0) break;
      const tid = lowestHpMonsterId(s);
      if (!tid) break;
      if (ch.actionEconomy.actionUsed) break;
      const r = playerAttack({ roller, character: ch, state: s }, tid, weaponId);
      s = r.state;
      ch = r.character;
    }
    // Action Surge if available and at least one enemy still alive
    if (
      pass === 0 &&
      s.status === 'active' &&
      liveMonsters(s).length > 0 &&
      (ch.resources.actionSurgeRemaining ?? 0) > 0 &&
      ch.actionEconomy.actionUsed
    ) {
      // Only surge if hurt enough or fight is dragging
      const enemiesAlive = liveMonsters(s).length;
      const hurt = ch.hp.current <= ch.hp.max * 0.7;
      if (enemiesAlive >= 2 || hurt) {
        const r = useActionSurge({ character: ch, state: s });
        s = r.state;
        ch = r.character;
        continue;
      }
    }
    break;
  }
  return { state: s, character: ch };
}

function wizardKnowsSpell(ch: Character, id: string): boolean {
  return (ch.resources.knownSpells ?? []).includes(id);
}

function wizardTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  let s = state;
  let ch = character;
  const live = liveMonsters(s);
  if (live.length === 0) return { state: s, character: ch };

  // Heal if very low.
  if (ch.hp.current <= ch.hp.max * 0.3) {
    const idx = findHealingPotionIdx(ch);
    if (idx >= 0 && !ch.actionEconomy.actionUsed) {
      const r = useConsumable({ roller, character: ch, state: s }, idx);
      s = r.state;
      ch = r.character;
    }
  }

  // Choose a spell to cast as the action.
  if (!ch.actionEconomy.actionUsed) {
    const target = lowestHpMonsterId(s);
    const enemyCount = liveMonsters(s).length;

    // Prefer AoE if 3+ enemies and a slot exists.
    if (enemyCount >= 3 && wizardKnowsSpell(ch, 'fireball') && slotsAt(ch, 3) > 0) {
      const r = castSpell({ roller, character: ch, state: s, spellId: 'fireball', targetId: target });
      if (r.cast) { s = r.state; ch = r.character; }
    } else if (enemyCount >= 3 && wizardKnowsSpell(ch, 'lightning-bolt') && slotsAt(ch, 3) > 0) {
      const r = castSpell({ roller, character: ch, state: s, spellId: 'lightning-bolt', targetId: target });
      if (r.cast) { s = r.state; ch = r.character; }
    } else if (enemyCount >= 2 && wizardKnowsSpell(ch, 'burning-hands') && slotsAt(ch, 1) > 0) {
      const r = castSpell({ roller, character: ch, state: s, spellId: 'burning-hands', targetId: target });
      if (r.cast) { s = r.state; ch = r.character; }
    } else if (wizardKnowsSpell(ch, 'magic-missile') && slotsAt(ch, 1) > 0) {
      const r = castSpell({ roller, character: ch, state: s, spellId: 'magic-missile', targetId: target });
      if (r.cast) { s = r.state; ch = r.character; }
    } else {
      // Cantrip: fire bolt
      const r = castSpell({ roller, character: ch, state: s, spellId: 'fire-bolt', targetId: target });
      if (r.cast) { s = r.state; ch = r.character; }
    }
  }
  return { state: s, character: ch };
}

export function takeTurn(
  roller: DiceRoller,
  state: CombatState,
  character: Character,
): { state: CombatState; character: Character } {
  switch (character.classId) {
    case 'rogue': return rogueTurn(roller, state, character);
    case 'fighter': return fighterTurn(roller, state, character);
    case 'wizard': return wizardTurn(roller, state, character);
    default: return { state, character };
  }
}

const MAX_ROUNDS = 25;

export function simulateEncounter(
  classId: ClassId,
  level: number,
  monsters: RoomMonster[],
  seed: number,
): SimRunOutcome {
  const roller = createDiceRoller(seed);
  // Active roller is consumed by spell-side code via getActiveRoller()
  // (turn.ts paralyzed-tick path). Wire it to the same seed.
  // Safe to skip; the engine only reads it for paralyze-save ticks.

  const character = characterAtLevel(classId, level);

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
): SimCellResult {
  let wins = 0;
  let totalRounds = 0;
  let totalHpPctOnWin = 0;
  for (let i = 0; i < runs; i++) {
    const out = simulateEncounter(classId, level, encounter.monsters, seedBase + i);
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
