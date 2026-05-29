import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore, RENOWN_PER_DELVE_CLEAR } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { useCombatStore } from './combatStore';
import { createGodwakeDelve, getAscensionLevel, MAX_ASCENSION } from '../engine/delve';
import { setActiveRoller } from '../engine/dice';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { renownSoulMarkMultiplier } from '../engine/character/quirks';
import type { Character } from '../types/character';

function makeFighter(extra: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: 'test-fighter',
      name: 'Brick',
      raceId: 'human',
      classId: 'fighter',
      baseAbilityScores: {
        str: STANDARD_ARRAY[0],
        con: STANDARD_ARRAY[1],
        dex: STANDARD_ARRAY[2],
        wis: STANDARD_ARRAY[3],
        cha: STANDARD_ARRAY[4],
        int: STANDARD_ARRAY[5],
      },
      skillProficiencies: ['athletics', 'perception'],
    }),
    ...extra,
  };
}

function seedRun(overrides: Partial<Character> = {}) {
  const character = makeFighter({ level: 3, ...overrides });
  useCharacterStore.setState({ character, saveSeed: null });
  useDelveStore.setState({ delve: createGodwakeDelve(1) });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({
    hasReincarnated: false,
    chaptersCleared: 0,
    chapter1Cleared: false,
    druidGroveUnlocked: false,
    knownNpcs: [],
  });
  useScreenStore.setState({ screen: 'delve' });
  return character;
}

function setDelve(patch: Record<string, unknown>) {
  useDelveStore.setState({
    delve: { ...useDelveStore.getState().delve!, ...patch },
  });
}

const char = () => useCharacterStore.getState().character!;

describe('delveStore.finishDelve — reincarnate on clear', () => {
  beforeEach(() => {
    setActiveRoller('reincarnate-seed');
    seedRun();
  });

  it('a clear reincarnates the soul: rerolls quirks and resets level/xp + wipes the life', () => {
    seedRun({ quirks: [], level: 5, xp: 999, blessings: ['glob'], renown: 10 });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    const c = char();
    expect(c.level).toBe(1);
    expect(c.xp).toBe(0);
    expect(c.blessings).toEqual([]);
    expect(c.campBoons).toEqual([]);
    expect(c.quirks.length).toBeGreaterThanOrEqual(2);
    expect(useMetaStore.getState().hasReincarnated).toBe(true);
    expect(useDelveStore.getState().delve).toBeNull();
    expect(useScreenStore.getState().screen).toBe('hub');
  });

  it('a clear still settles the clear-tier renown (soul-mark = 0)', () => {
    seedRun({ quirks: [], renown: 10 });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    expect(char().renown).toBe(10 + RENOWN_PER_DELVE_CLEAR);
  });

  it('a clear records the chapter-progression high-water mark', () => {
    seedRun({ quirks: [] });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    expect(useMetaStore.getState().chaptersCleared).toBeGreaterThanOrEqual(1);
    expect(useMetaStore.getState().chapter1Cleared).toBe(true);
  });

  it('Wheelturner carries the first quirk identity through a clear', () => {
    seedRun({ quirks: ['glass-jaw', 'ironhide'], wheelturnerUnlocked: true });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    const c = char();
    expect(c.quirks[0]).toBe('glass-jaw');
    expect(c.quirks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('delveStore.failDelve — reincarnation', () => {
  beforeEach(() => {
    setActiveRoller('death-seed');
    seedRun();
  });

  it('death reincarnates: marks failed, rerolls quirks, resets and wipes the life', () => {
    seedRun({ quirks: ['glass-jaw', 'ironhide'], blessings: ['glob'], level: 4 });

    useDelveStore.getState().failDelve();

    const c = char();
    expect(useDelveStore.getState().delve!.phase).toBe('failed');
    expect(c.quirks.length).toBeGreaterThanOrEqual(2);
    expect(c.blessings).toEqual([]);
    expect(c.campBoons).toEqual([]);
    expect(c.level).toBe(1);
    expect(useMetaStore.getState().hasReincarnated).toBe(true);
  });

  it('guarantees >= 2 quirks even when the soul carried fewer', () => {
    seedRun({ quirks: ['glass-jaw'], wheelturnerUnlocked: false });

    useDelveStore.getState().failDelve();

    expect(char().quirks.length).toBeGreaterThanOrEqual(2);
  });

  it('guarantees >= 2 quirks starting from none', () => {
    seedRun({ quirks: [] });

    useDelveStore.getState().failDelve();

    expect(char().quirks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('delveStore.abandonDelve — wipe without reincarnation', () => {
  beforeEach(() => {
    setActiveRoller('abandon-seed');
  });

  it('long-rests, wipes run buffs, drops the delve, and does NOT reincarnate', () => {
    seedRun({
      quirks: ['glass-jaw', 'ironhide'],
      blessings: ['glob'],
      campBoons: ['boon'],
    });

    useDelveStore.getState().abandonDelve();

    const c = char();
    expect(c.blessings).toEqual([]);
    expect(c.campBoons).toEqual([]);
    // Abandon is not death — the soul keeps its quirks and never turns the wheel.
    expect(c.quirks).toEqual(['glass-jaw', 'ironhide']);
    expect(useMetaStore.getState().hasReincarnated).toBe(false);
    expect(useDelveStore.getState().delve).toBeNull();
    expect(useScreenStore.getState().screen).toBe('hub');
  });
});

describe('delveStore.pickCampChoice — class-aware prayer', () => {
  beforeEach(() => {
    setActiveRoller('prayer-seed');
    seedRun({ quirks: [] });
  });

  it('prayer rolls and returns a blessing id, and locks the camp choice', () => {
    const granted = useDelveStore.getState().pickCampChoice('prayer');
    expect(typeof granted).toBe('string');
    expect(granted).toBeTruthy();
    expect(useDelveStore.getState().delve!.campChoice).toBe('prayer');
    // The granted blessing is mirrored onto the character.
    expect(char().blessings).toContain(granted);
  });

  it('a second camp choice is ignored once one is taken', () => {
    useDelveStore.getState().pickCampChoice('prayer');
    const second = useDelveStore.getState().pickCampChoice('rest');
    expect(second).toBeNull();
    expect(useDelveStore.getState().delve!.campChoice).toBe('prayer');
  });
});

describe('delveStore — gold stacking', () => {
  beforeEach(() => {
    setActiveRoller('gold-seed');
    seedRun({ quirks: [] });
  });

  it('addDelveReward stacks onto both purse and run ledger', () => {
    const startPurse = char().goldInPocket;
    const startLedger = useDelveStore.getState().delve!.goldEarned;

    useDelveStore.getState().addDelveReward(100, 0);
    useDelveStore.getState().addDelveReward(50, 0);

    expect(char().goldInPocket).toBe(startPurse + 150);
    expect(useDelveStore.getState().delve!.goldEarned).toBe(startLedger + 150);
  });

  it('grantTitheGold stacks onto both purse and run ledger', () => {
    const startPurse = char().goldInPocket;
    const startLedger = useDelveStore.getState().delve!.goldEarned;

    useDelveStore.getState().grantTitheGold(30);
    useDelveStore.getState().grantTitheGold(20);

    expect(char().goldInPocket).toBe(startPurse + 50);
    expect(useDelveStore.getState().delve!.goldEarned).toBe(startLedger + 50);
  });

  it('grantTitheGold ignores non-positive amounts', () => {
    const startPurse = char().goldInPocket;
    useDelveStore.getState().grantTitheGold(0);
    useDelveStore.getState().grantTitheGold(-5);
    expect(char().goldInPocket).toBe(startPurse);
  });
});

describe('delveStore — ascension ladder', () => {
  beforeEach(() => {
    setActiveRoller('ascension-seed');
    seedRun({ quirks: [] });
  });

  it('clearing the chain at the current highest unlocked opens the next rung', () => {
    useMetaStore.setState({ ascensionUnlocked: 2 });
    setDelve({ phase: 'completed', currentRoomIdx: 36, ascensionLevel: 2 });

    useDelveStore.getState().finishDelve();

    expect(useMetaStore.getState().ascensionUnlocked).toBe(3);
  });

  it('replaying a LOWER level than the highest unlocks nothing new', () => {
    useMetaStore.setState({ ascensionUnlocked: 3 });
    setDelve({ phase: 'completed', currentRoomIdx: 36, ascensionLevel: 1 });

    useDelveStore.getState().finishDelve();

    expect(useMetaStore.getState().ascensionUnlocked).toBe(3);
  });

  it('a death at the highest level does NOT advance the ladder', () => {
    useMetaStore.setState({ ascensionUnlocked: 2 });
    setDelve({ phase: 'failed', currentRoomIdx: 36, ascensionLevel: 2 });

    useDelveStore.getState().finishDelve();

    expect(useMetaStore.getState().ascensionUnlocked).toBe(2);
  });

  it('the ladder caps at MAX_ASCENSION', () => {
    useMetaStore.setState({ ascensionUnlocked: MAX_ASCENSION });
    setDelve({ phase: 'completed', currentRoomIdx: 36, ascensionLevel: MAX_ASCENSION });

    useDelveStore.getState().finishDelve();

    expect(useMetaStore.getState().ascensionUnlocked).toBe(MAX_ASCENSION);
  });

  it('renown composes the soul-mark and ascension multipliers multiplicatively', () => {
    // Two banes give a non-trivial soul-mark; Ascension 4 gives a non-trivial
    // reward bump. The payout must reflect BOTH, multiplied.
    const character = makeFighter({ level: 3, quirks: ['vertigo', 'glassbone'], renown: 0 });
    useCharacterStore.setState({ character, saveSeed: null });
    useMetaStore.setState({ ascensionUnlocked: 4, hasReincarnated: false });
    useDelveStore.setState({
      delve: {
        ...createGodwakeDelve(1),
        phase: 'completed',
        currentRoomIdx: 36,
        ascensionLevel: 4,
      },
    });

    const soulMark = renownSoulMarkMultiplier(character);
    const ascMult = getAscensionLevel(4).renownMult;
    expect(soulMark).toBeGreaterThan(1);
    expect(ascMult).toBeGreaterThan(1);
    const expected = Math.floor(RENOWN_PER_DELVE_CLEAR * soulMark * ascMult);

    useDelveStore.getState().finishDelve();

    expect(char().renown).toBe(expected);
    // Sanity: applying only one multiplier would land short of the product.
    expect(expected).toBeGreaterThan(Math.floor(RENOWN_PER_DELVE_CLEAR * ascMult));
    expect(expected).toBeGreaterThan(Math.floor(RENOWN_PER_DELVE_CLEAR * soulMark));
  });

  it('startDelve scales seeded starting gold by the ascension startingGoldMult', () => {
    const character = makeFighter({
      level: 3,
      quirks: [],
      permanentBonuses: { startingGold: 100 },
    });
    useCharacterStore.setState({ character, saveSeed: null });
    useMetaStore.setState({ unlockedUpgrades: {} });

    useDelveStore.getState().startDelve(createGodwakeDelve({ seed: 1, ascension: 6 }));

    const expected = Math.floor(100 * getAscensionLevel(6).startingGoldMult);
    expect(char().goldInPocket).toBe(expected);
    expect(expected).toBeLessThan(100);
  });
});
