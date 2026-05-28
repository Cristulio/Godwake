import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_DELVE_FAILURE,
  RENOWN_PER_CHAPTER_BOSS,
  GROVE_UNLOCK_THRESHOLD,
} from './gameStore';
import { useCharacterStore } from './characterStore';
import { useDelveStore } from './delveStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { useCombatStore } from './combatStore';
import { getUpgrade } from '../content/upgrades';
import { applyPermanentUpgrade } from '../engine/character/upgrades';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { createGodwakeDelve } from '../engine/delve';
import { effectiveAbilityScores } from '../engine/character/derived';
import { hasPendingLevelUp } from '../engine/character/leveling';
import { abilityModifier } from '../types/abilities';
import { getClass } from '../content/classes';
import { getRace } from '../content/races';
import type { Character } from '../types/character';
import type { DelveState } from '../types/delve';

function makeWizard(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-wizard',
      name: 'Inara',
      raceId: 'human',
      classId: 'wizard',
      baseAbilityScores: {
        str: STANDARD_ARRAY[5], // 8
        dex: STANDARD_ARRAY[3], // 12
        con: STANDARD_ARRAY[2], // 13
        int: STANDARD_ARRAY[0], // 15
        wis: STANDARD_ARRAY[1], // 14
        cha: STANDARD_ARRAY[4], // 10
      },
      skillProficiencies: ['arcana', 'history'],
    }),
    ...extra,
  };
}

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-fighter',
      name: 'Brick',
      raceId: 'human',
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
    }),
    ...extra,
  };
}

function expectedBaseHpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const race = getRace(ch.raceId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const bonusHp = race.bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  return cls.hitDie + conMod + bonusHp + classBonusHp;
}

interface ResetSlices {
  character?: Character | null;
  delve?: DelveState | null;
  unlockedUpgrades?: Record<string, number>;
  hasReincarnated?: boolean;
  deathCount?: number;
  druidGroveUnlocked?: boolean;
  chapter1Cleared?: boolean;
}

function resetStores(extra: ResetSlices = {}) {
  useCharacterStore.setState({
    character: extra.character ?? makeFighter(),
    saveSeed: null,
  });
  useDelveStore.setState({ delve: extra.delve ?? createGodwakeDelve(1) });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({
    hasReincarnated: extra.hasReincarnated ?? false,
    deathCount: extra.deathCount ?? 0,
    discoveredMonsters: [],
    monsterEncounters: {},
    unlockedUpgrades: extra.unlockedUpgrades ?? {},
    chapter1Cleared: extra.chapter1Cleared ?? false,
    druidGroveUnlocked: extra.druidGroveUnlocked ?? false,
  });
  useScreenStore.setState({
    screen: 'delve',
    introSeen: true,
    quirksTutorialSeen: false,
    taunt: null,
  });
}

describe('gameStore.startDelve — HP preservation', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({ unlockedUpgrades: {} });
    useScreenStore.setState({ screen: 'hub' });
  });

  it('preserves the wizard +1/level baseline across a descent', () => {
    const wizard = makeWizard();
    const expectedAtCreation = expectedBaseHpMax(wizard);
    expect(wizard.hp.max).toBe(expectedAtCreation);

    useCharacterStore.setState({ character: wizard });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useCharacterStore.getState().character!;
    expect(after.hp.max).toBe(expectedAtCreation);
    expect(after.hp.current).toBe(expectedAtCreation);
  });

  it('preserves Mantle of the Wakened R3 (+15 HP) for a wizard across startDelve', () => {
    const wizard = makeWizard({ permanentBonuses: { hp: 15 } });
    const expected = expectedBaseHpMax(wizard) + 15;

    useCharacterStore.setState({ character: wizard });
    useMetaStore.setState({ unlockedUpgrades: { 'mantle-of-the-wakened': 3 } });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useCharacterStore.getState().character!;
    expect(after.hp.max).toBe(expected);
    expect(after.hp.current).toBe(expected);
  });

  it('preserves Mantle R5 (+25 HP) for a fighter across startDelve', () => {
    const fighter = makeFighter({ permanentBonuses: { hp: 25 } });
    const expected = expectedBaseHpMax(fighter) + 25;

    useCharacterStore.setState({ character: fighter });
    useMetaStore.setState({ unlockedUpgrades: { 'mantle-of-the-wakened': 5 } });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useCharacterStore.getState().character!;
    expect(after.hp.max).toBe(expected);
    expect(after.hp.current).toBe(expected);
  });

  it('stacks permanentBonuses.hp with the wizard baseline', () => {
    // Mantle R2 (+10) + Iron Will (+5) = +15 over baseline.
    const wizard = makeWizard({ permanentBonuses: { hp: 15 } });
    const expected = expectedBaseHpMax(wizard) + 15;

    useCharacterStore.setState({ character: wizard });
    useMetaStore.setState({
      unlockedUpgrades: { 'mantle-of-the-wakened': 2, 'iron-will': 1 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useCharacterStore.getState().character!;
    expect(after.hp.max).toBe(expected);
  });
});

describe('addDelveReward — XP propagation (Hades-style within-run)', () => {
  beforeEach(() => resetStores());

  it('increments character.xp, not just delve.xpEarned', () => {
    expect(useCharacterStore.getState().character?.xp ?? 0).toBe(0);
    expect(useDelveStore.getState().delve?.xpEarned ?? 0).toBe(0);

    useGameStore.getState().addDelveReward(0, 100);

    expect(useCharacterStore.getState().character?.xp).toBe(100);
    expect(useDelveStore.getState().delve?.xpEarned).toBe(100);
  });

  it('stacks across multiple reward grants', () => {
    useGameStore.getState().addDelveReward(0, 80);
    useGameStore.getState().addDelveReward(0, 150);
    expect(useCharacterStore.getState().character?.xp).toBe(230);
    expect(useDelveStore.getState().delve?.xpEarned).toBe(230);
  });

  it('hitting 300 XP from addDelveReward flips hasPendingLevelUp true and routes to level-up', () => {
    expect(hasPendingLevelUp(useCharacterStore.getState().character!)).toBe(false);
    useGameStore.getState().addDelveReward(0, 300);
    const ch = useCharacterStore.getState().character!;
    expect(hasPendingLevelUp(ch)).toBe(true);
    expect(useScreenStore.getState().screen).toBe('level-up');
  });

  it('keeps screen unchanged when the reward does not cross a threshold', () => {
    useScreenStore.setState({ screen: 'delve' });
    useGameStore.getState().addDelveReward(0, 100);
    expect(useScreenStore.getState().screen).toBe('delve');
  });
});

describe('finishDelve — renown economy', () => {
  beforeEach(() => resetStores());

  it('death awards 15 renown (soul-mark = 0)', () => {
    expect(RENOWN_PER_DELVE_FAILURE).toBe(15);
    useDelveStore.setState({
      delve: { ...useDelveStore.getState().delve!, phase: 'failed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + 15);
  });

  it('clear awards 50 renown (soul-mark = 0)', () => {
    expect(RENOWN_PER_DELVE_CLEAR).toBe(50);
    useDelveStore.setState({
      delve: { ...useDelveStore.getState().delve!, phase: 'completed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + 50);
  });

  it('death mid-Ch2 after Ilyich-kill awards 25 renown (15 + 10)', () => {
    expect(RENOWN_PER_CHAPTER_BOSS).toBe(10);
    const delve = useDelveStore.getState().delve!;
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 11, phase: 'failed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + 25);
  });

  it('death mid-Ch4 after killing 3 chapter bosses awards 45 renown', () => {
    const delve = useDelveStore.getState().delve!;
    // Index 31 = the Underdark camp immediately after the Ch3 boss in the
    // intel-augmented godwake layout (3 intel rooms shift each boss +1).
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 31, phase: 'failed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + 45);
  });

  it('full clear still pays the clear-tier 50 (no chapter-boss stack on clear)', () => {
    const delve = useDelveStore.getState().delve!;
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 36, phase: 'completed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + 50);
  });
});

describe('Grove upgrade — Pilgrim\'s Boots', () => {
  beforeEach(() => resetStores());

  it('rank 1 costs 25 renown', () => {
    const up = getUpgrade('pilgrims-boots');
    expect(up.maxRank).toBe(1);
    expect(up.costForRank(1)).toBe(25);
  });

  it('purchase at 25 renown succeeds and bumps maximum HP', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 25 },
    });
    const before = useCharacterStore.getState().character!.permanentBonuses?.hp ?? 0;
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(res.ok).toBe(true);
    const ch = useCharacterStore.getState().character!;
    expect(ch.renown).toBe(0);
    expect((ch.permanentBonuses?.hp ?? 0) - before).toBe(2);
    expect(useMetaStore.getState().unlockedUpgrades['pilgrims-boots']).toBe(1);
  });

  it('purchase at 24 renown fails', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 24 },
    });
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(res.ok).toBe(false);
  });

  it('apply() adds +2 HP via applyPermanentUpgrade', () => {
    const ch = useCharacterStore.getState().character!;
    const beforeHp = ch.permanentBonuses?.hp ?? 0;
    const after = applyPermanentUpgrade(ch, 'pilgrims-boots', 1);
    expect((after.permanentBonuses?.hp ?? 0) - beforeHp).toBe(2);
  });
});

describe('Druid Grove unlock threshold', () => {
  beforeEach(() => resetStores());

  it('GROVE_UNLOCK_THRESHOLD is 30', () => {
    expect(GROVE_UNLOCK_THRESHOLD).toBe(30);
  });

  it('does not unlock at 29 renown after a death', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 14 },
    });
    useDelveStore.setState({
      delve: { ...useDelveStore.getState().delve!, phase: 'failed' },
    });
    useMetaStore.setState({ druidGroveUnlocked: false });
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(29);
    expect(useMetaStore.getState().druidGroveUnlocked).toBe(false);
  });

  it('unlocks at exactly 30 renown after a death', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 15 },
    });
    useDelveStore.setState({
      delve: { ...useDelveStore.getState().delve!, phase: 'failed' },
    });
    useMetaStore.setState({ druidGroveUnlocked: false });
    useGameStore.getState().finishDelve();
    expect(useCharacterStore.getState().character!.renown).toBe(30);
    expect(useMetaStore.getState().druidGroveUnlocked).toBe(true);
  });
});

describe('facade — useGameStore mirrors focused stores', () => {
  beforeEach(() => resetStores());

  it('character changes in useCharacterStore reflect in useGameStore', () => {
    const ch = makeFighter({ renown: 999 });
    useCharacterStore.setState({ character: ch });
    expect(useGameStore.getState().character?.renown).toBe(999);
  });

  it('meta changes reflect in useGameStore', () => {
    useMetaStore.setState({ deathCount: 7, druidGroveUnlocked: true });
    const s = useGameStore.getState();
    expect(s.deathCount).toBe(7);
    expect(s.druidGroveUnlocked).toBe(true);
  });

  it('screen changes reflect in useGameStore', () => {
    useScreenStore.getState().goToHub();
    expect(useGameStore.getState().screen).toBe('hub');
  });

  it('combat changes reflect in useGameStore', () => {
    expect(useGameStore.getState().combat).toBeNull();
    useCombatStore.setState({ combat: { rounds: [], log: [] } as never });
    expect(useGameStore.getState().combat).not.toBeNull();
  });

  it('facade actions delegate to focused stores', () => {
    useGameStore.getState().discoverMonster('goblin');
    expect(useMetaStore.getState().discoveredMonsters).toContain('goblin');
    expect(useGameStore.getState().discoveredMonsters).toContain('goblin');
  });
});

describe('startDelve — fresh descent resets run-scoped state', () => {
  beforeEach(() => resetStores());

  it('resets level, xp, blessings, camp boons, and conditions on descent', () => {
    const dirty = makeFighter({
      level: 5,
      xp: 999,
      blessings: ['blessing-a'],
      campBoons: ['boon-a'],
      conditions: [{ kind: 'poisoned', roundsRemaining: 2 } as never],
    });
    useCharacterStore.setState({ character: dirty });

    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useCharacterStore.getState().character!;
    expect(after.level).toBe(1);
    expect(after.xp).toBe(0);
    expect(after.blessings).toEqual([]);
    expect(after.campBoons).toEqual([]);
    expect(after.conditions).toEqual([]);
  });

  it('reseeds gold from permanent startingGold, not the prior run purse', () => {
    const rich = makeFighter({
      quirks: [],
      goldInPocket: 500,
      permanentBonuses: { startingGold: 25 },
    });
    useCharacterStore.setState({ character: rich });

    useGameStore.getState().startDelve(createGodwakeDelve(1));

    expect(useCharacterStore.getState().character!.goldInPocket).toBe(25);
  });
});
