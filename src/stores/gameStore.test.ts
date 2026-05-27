import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_DELVE_FAILURE,
  RENOWN_PER_CHAPTER_BOSS,
  GROVE_UNLOCK_THRESHOLD,
} from './gameStore';
import { getUpgrade } from '../content/upgrades';
import { applyPermanentUpgrade } from '../engine/character/upgrades';
import { withResetActionEconomy } from '../engine/character/actions';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { createGodwakeDelve } from '../engine/delve';
import { effectiveAbilityScores } from '../engine/character/derived';
import { hasPendingLevelUp } from '../engine/character/leveling';
import { abilityModifier } from '../types/abilities';
import { getClass } from '../content/classes';
import { getRace } from '../content/races';
import type { Character } from '../types/character';

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

function resetStore(extra: Partial<ReturnType<typeof useGameStore.getState>> = {}) {
  useGameStore.setState({
    screen: 'delve',
    character: makeFighter(),
    delve: createGodwakeDelve(1),
    combat: null,
    introSeen: true,
    hasReincarnated: false,
    deathCount: 0,
    druidGroveUnlocked: false,
    chapter1Cleared: false,
    unlockedUpgrades: {},
    ...extra,
  });
}

describe('gameStore.startDelve — HP preservation', () => {
  beforeEach(() => {
    useGameStore.setState({
      character: null,
      delve: null,
      combat: null,
      unlockedUpgrades: {},
      screen: 'hub',
    });
  });

  it('preserves the wizard +1/level baseline across a descent', () => {
    const wizard = makeWizard();
    const expectedAtCreation = expectedBaseHpMax(wizard);
    expect(wizard.hp.max).toBe(expectedAtCreation);

    useGameStore.setState({ character: wizard });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expectedAtCreation);
    expect(after.hp.current).toBe(expectedAtCreation);
  });

  it('preserves Mantle of the Wakened R3 (+15 HP) for a wizard across startDelve', () => {
    const wizard = makeWizard({ permanentHpBonus: 15 });
    const expected = expectedBaseHpMax(wizard) + 15;

    useGameStore.setState({
      character: wizard,
      unlockedUpgrades: { 'mantle-of-the-wakened': 3 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expected);
    expect(after.hp.current).toBe(expected);
  });

  it('preserves Mantle R5 (+25 HP) for a fighter across startDelve', () => {
    const fighter = makeFighter({ permanentHpBonus: 25 });
    const expected = expectedBaseHpMax(fighter) + 25;

    useGameStore.setState({
      character: fighter,
      unlockedUpgrades: { 'mantle-of-the-wakened': 5 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expected);
    expect(after.hp.current).toBe(expected);
  });

  it('stacks permanentHpBonus with the wizard baseline', () => {
    // Mantle R2 (+10) + Iron Will (+5) = +15 over baseline.
    const wizard = makeWizard({ permanentHpBonus: 15 });
    const expected = expectedBaseHpMax(wizard) + 15;

    useGameStore.setState({
      character: wizard,
      unlockedUpgrades: { 'mantle-of-the-wakened': 2, 'iron-will': 1 },
    });
    useGameStore.getState().startDelve(createGodwakeDelve(1));

    const after = useGameStore.getState().character!;
    expect(after.hp.max).toBe(expected);
  });
});

describe('addDelveReward — XP propagation (Hades-style within-run)', () => {
  beforeEach(() => resetStore());

  it('increments character.xp, not just delve.xpEarned', () => {
    const before = useGameStore.getState();
    expect(before.character?.xp ?? 0).toBe(0);
    expect(before.delve?.xpEarned ?? 0).toBe(0);

    useGameStore.getState().addDelveReward(0, 100);

    const after = useGameStore.getState();
    expect(after.character?.xp).toBe(100);
    expect(after.delve?.xpEarned).toBe(100);
  });

  it('stacks across multiple reward grants', () => {
    useGameStore.getState().addDelveReward(0, 80);
    useGameStore.getState().addDelveReward(0, 150);
    const s = useGameStore.getState();
    expect(s.character?.xp).toBe(230);
    expect(s.delve?.xpEarned).toBe(230);
  });

  it('hitting 300 XP from addDelveReward flips hasPendingLevelUp true and routes to level-up', () => {
    expect(hasPendingLevelUp(useGameStore.getState().character!)).toBe(false);
    useGameStore.getState().addDelveReward(0, 300);
    const s = useGameStore.getState();
    expect(hasPendingLevelUp(s.character!)).toBe(true);
    expect(s.screen).toBe('level-up');
  });

  it('keeps screen unchanged when the reward does not cross a threshold', () => {
    useGameStore.setState({ screen: 'delve' });
    useGameStore.getState().addDelveReward(0, 100);
    expect(useGameStore.getState().screen).toBe('delve');
  });
});

describe('finishDelve — renown economy', () => {
  beforeEach(() => resetStore());

  it('death awards 15 renown (soul-mark = 0)', () => {
    expect(RENOWN_PER_DELVE_FAILURE).toBe(15);
    // failed delve = phase !== 'completed'
    useGameStore.setState({
      delve: { ...useGameStore.getState().delve!, phase: 'failed' },
    });
    const startingRenown = useGameStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useGameStore.getState().character!.renown).toBe(startingRenown + 15);
  });

  it('clear awards 50 renown (soul-mark = 0)', () => {
    expect(RENOWN_PER_DELVE_CLEAR).toBe(50);
    useGameStore.setState({
      delve: { ...useGameStore.getState().delve!, phase: 'completed' },
    });
    const startingRenown = useGameStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useGameStore.getState().character!.renown).toBe(startingRenown + 50);
  });

  it('death mid-Ch2 after Ilyich-kill awards 25 renown (15 + 10)', () => {
    expect(RENOWN_PER_CHAPTER_BOSS).toBe(10);
    const delve = useGameStore.getState().delve!;
    // Position the player past the Ilyich boss (room-10, idx 9) — say in
    // room-12 (idx 11), the first Ch2 combat. phase='failed' = dying there.
    useGameStore.setState({
      delve: { ...delve, currentRoomIdx: 11, phase: 'failed' },
    });
    const startingRenown = useGameStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useGameStore.getState().character!.renown).toBe(startingRenown + 25);
  });

  it('death mid-Ch4 after killing 3 chapter bosses awards 45 renown', () => {
    const delve = useGameStore.getState().delve!;
    // Position the player after Ilyich (idx 9), Magistrate (idx 18), and
    // the Asylum Director (idx 27) — say in room-31 (idx 30), early Ch4.
    useGameStore.setState({
      delve: { ...delve, currentRoomIdx: 30, phase: 'failed' },
    });
    const startingRenown = useGameStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useGameStore.getState().character!.renown).toBe(startingRenown + 45);
  });

  it('full clear still pays the clear-tier 50 (no chapter-boss stack on clear)', () => {
    const delve = useGameStore.getState().delve!;
    // currentRoomIdx pinned at the Matron Mother room (idx 36) — the only
    // position phase='completed' should ever fire from on the chained delve.
    useGameStore.setState({
      delve: { ...delve, currentRoomIdx: 36, phase: 'completed' },
    });
    const startingRenown = useGameStore.getState().character!.renown;
    useGameStore.getState().finishDelve();
    expect(useGameStore.getState().character!.renown).toBe(startingRenown + 50);
  });
});

describe('Grove upgrade — Pilgrim\'s Boots', () => {
  beforeEach(() => resetStore());

  it('rank 1 costs 25 renown', () => {
    const up = getUpgrade('pilgrims-boots');
    expect(up.maxRank).toBe(1);
    expect(up.costForRank(1)).toBe(25);
  });

  it('purchase at 25 renown succeeds and bumps movement at delve start', () => {
    useGameStore.setState({
      character: { ...useGameStore.getState().character!, renown: 25 },
    });
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(res.ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.character!.renown).toBe(0);
    expect(s.character!.permanentSpeedBonus).toBe(5);
    expect(s.unlockedUpgrades['pilgrims-boots']).toBe(1);
    // Movement on a fresh-economy turn picks up the +5 over base race speed.
    const baseSpeed = withResetActionEconomy({
      ...s.character!,
      permanentSpeedBonus: 0,
    }).actionEconomy.movementRemaining;
    const withBoots = withResetActionEconomy(s.character!).actionEconomy.movementRemaining;
    expect(withBoots).toBe(baseSpeed + 5);
  });

  it('purchase at 24 renown fails', () => {
    useGameStore.setState({
      character: { ...useGameStore.getState().character!, renown: 24 },
    });
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(res.ok).toBe(false);
  });

  it('apply() adds +5 ft via applyPermanentUpgrade', () => {
    const ch = { ...useGameStore.getState().character!, permanentSpeedBonus: 0 };
    const after = applyPermanentUpgrade(ch, 'pilgrims-boots', 1);
    expect(after.permanentSpeedBonus).toBe(5);
  });
});

describe('Druid Grove unlock threshold', () => {
  beforeEach(() => resetStore());

  it('GROVE_UNLOCK_THRESHOLD is 30', () => {
    expect(GROVE_UNLOCK_THRESHOLD).toBe(30);
  });

  it('does not unlock at 29 renown after a death', () => {
    // Start with 14 renown so death (+15) lands at 29.
    useGameStore.setState({
      character: { ...useGameStore.getState().character!, renown: 14 },
      delve: { ...useGameStore.getState().delve!, phase: 'failed' },
      druidGroveUnlocked: false,
    });
    useGameStore.getState().finishDelve();
    const s = useGameStore.getState();
    expect(s.character!.renown).toBe(29);
    expect(s.druidGroveUnlocked).toBe(false);
  });

  it('unlocks at exactly 30 renown after a death', () => {
    useGameStore.setState({
      character: { ...useGameStore.getState().character!, renown: 15 },
      delve: { ...useGameStore.getState().delve!, phase: 'failed' },
      druidGroveUnlocked: false,
    });
    useGameStore.getState().finishDelve();
    const s = useGameStore.getState();
    expect(s.character!.renown).toBe(30);
    expect(s.druidGroveUnlocked).toBe(true);
  });
});
