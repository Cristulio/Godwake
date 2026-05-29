import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_DELVE_FAILURE,
  RENOWN_PER_CHAPTER_BOSS,
  RENOWN_PER_ROOM_REACHED,
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
    ascensionUnlocked: 0,
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

  it('death mid-Ch2 after Ilyich-kill stacks failure base + 1 boss + depth', () => {
    expect(RENOWN_PER_CHAPTER_BOSS).toBe(10);
    const delve = useDelveStore.getState().delve!;
    // currentRoomIdx 20 → slice(0, 20) counts Ilyich (idx 12); depth = 20.
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 20, phase: 'failed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    const expectedGain =
      RENOWN_PER_DELVE_FAILURE + RENOWN_PER_CHAPTER_BOSS * 1 + RENOWN_PER_ROOM_REACHED * 20;
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + expectedGain);
  });

  it('death mid-Ch4 stacks failure base + 3 bosses + the deeper depth credit', () => {
    const delve = useDelveStore.getState().delve!;
    // Index 43 = the Underdark camp immediately after the Ch3 boss (idx 42) in
    // the 58-room godwake layout. slice(0, 43) counts Ilyich/Magistrate/Director;
    // depth = 43, so this deep death pays far more than a shallow one.
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 43, phase: 'failed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    const expectedGain =
      RENOWN_PER_DELVE_FAILURE + RENOWN_PER_CHAPTER_BOSS * 3 + RENOWN_PER_ROOM_REACHED * 43;
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + expectedGain);
  });

  it('full clear pays the clear premium + all four bosses + full depth', () => {
    const delve = useDelveStore.getState().delve!;
    // currentRoomIdx 57 → slice(0, 58) counts all four bosses; depth = 57.
    useDelveStore.setState({
      delve: { ...delve, currentRoomIdx: 57, phase: 'completed' },
    });
    const startingRenown = useCharacterStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    const expectedGain =
      RENOWN_PER_DELVE_CLEAR + RENOWN_PER_CHAPTER_BOSS * 4 + RENOWN_PER_ROOM_REACHED * 57;
    expect(useCharacterStore.getState().character!.renown).toBe(startingRenown + expectedGain);
  });

  it('orders clear > deep death > shallow death (depth rewards pushing farther)', () => {
    const base = useDelveStore.getState().delve!;
    const payout = (patch: Partial<DelveState>): number => {
      useCharacterStore.setState({
        character: { ...useCharacterStore.getState().character!, renown: 0 },
      });
      useDelveStore.setState({ delve: { ...base, ...patch } });
      useGameStore.getState().finishDelve();
      return useCharacterStore.getState().character!.renown;
    };

    const shallowDeath = payout({ currentRoomIdx: 3, phase: 'failed' });
    const deepDeath = payout({ currentRoomIdx: 43, phase: 'failed' });
    const clear = payout({ currentRoomIdx: 57, phase: 'completed' });

    expect(shallowDeath).toBeLessThan(deepDeath);
    expect(deepDeath).toBeLessThan(clear);
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

describe('Grove gating — ascension-locked deeper tiers', () => {
  beforeEach(() => resetStores());

  it('refuses a clear-gated upgrade before the chain has been cleared', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 1000 },
    });
    useMetaStore.setState({ ascensionUnlocked: 0, unlockedUpgrades: {} });
    const res = useGameStore.getState().purchaseUpgrade('wellspring-depths');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('Clear the chain to unlock.');
    expect(useMetaStore.getState().unlockedUpgrades['wellspring-depths']).toBeUndefined();
    // Renown is untouched by a refused purchase.
    expect(useCharacterStore.getState().character!.renown).toBe(1000);
  });

  it('allows the clear-gated upgrade once ascensionUnlocked meets the gate', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 1000 },
    });
    useMetaStore.setState({ ascensionUnlocked: 1, unlockedUpgrades: {} });
    const res = useGameStore.getState().purchaseUpgrade('wellspring-depths');
    expect(res.ok).toBe(true);
    expect(useMetaStore.getState().unlockedUpgrades['wellspring-depths']).toBe(1);
  });

  it('keeps the Ascension-3 tier sealed at Ascension 1', () => {
    useCharacterStore.setState({
      character: { ...useCharacterStore.getState().character!, renown: 1000 },
    });
    useMetaStore.setState({ ascensionUnlocked: 1, unlockedUpgrades: {} });
    const res = useGameStore.getState().purchaseUpgrade('crown-of-the-returned');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('Reach Ascension 3 to unlock.');
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

describe('selectCharacter — hub character swap keeps the soul', () => {
  beforeEach(() => resetStores());

  it('rebuilds the vessel from the chosen class preset and routes to the hub', () => {
    useCharacterStore.setState({ character: makeFighter() });
    useGameStore.getState().selectCharacter('wizard');

    const after = useCharacterStore.getState().character!;
    expect(after.classId).toBe('wizard');
    expect(after.name).toBe(getClass('wizard').preset!.characterName);
    expect(after.level).toBe(1);
    expect(after.xp).toBe(0);
    expect(useScreenStore.getState().screen).toBe('hub');
  });

  it('preserves renown, Grove HP, and quirks across the swap', () => {
    useCharacterStore.setState({
      character: makeFighter({
        renown: 240,
        quirks: ['test-quirk'],
        permanentBonuses: { hp: 10 },
      }),
    });

    useGameStore.getState().selectCharacter('wizard');

    const after = useCharacterStore.getState().character!;
    expect(after.renown).toBe(240);
    expect(after.quirks).toEqual(['test-quirk']);
    expect(after.permanentBonuses?.hp).toBe(10);
    // HP reads the fresh L1 ceiling plus the carried Grove bonus.
    expect(after.hp.max).toBe(expectedBaseHpMax(after) + 10);
    expect(after.hp.current).toBe(after.hp.max);
  });

  it('does not touch the metaStore Grove ledger', () => {
    useCharacterStore.setState({ character: makeFighter({ renown: 100 }) });
    useMetaStore.setState({ unlockedUpgrades: { 'mantle-of-the-wakened': 2 } });

    useGameStore.getState().selectCharacter('rogue');

    expect(useMetaStore.getState().unlockedUpgrades).toEqual({
      'mantle-of-the-wakened': 2,
    });
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
