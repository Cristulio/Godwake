import { describe, it, expect, beforeEach } from 'vitest';
import {
  useDelveStore,
  computeDelveRenown,
  RENOWN_PER_DELVE_CLEAR,
  RENOWN_PER_CHAPTER_BOSS,
  RENOWN_PER_ROOM_REACHED,
} from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { useCombatStore } from './combatStore';
import {
  createGodwakeDelve,
  getAscensionLevel,
  MAX_ASCENSION,
  TOTAL_CHAPTERS,
} from '../engine/delve';
import { isFeatureUnlocked } from '../engine/progression/unlocks';
import { setActiveRoller } from '../engine/dice';
import type { RoomSpec } from '../types/delve';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { presetCreationInput } from '../engine/character/defaultCharacter';
import { renownSoulMarkMultiplier } from '../engine/character/quirks';
import { effectiveAbilityScores } from '../engine/character/derived';
import { abilityModifier } from '../types/abilities';
import { getClass } from '../content/classes';
import { getRace } from '../content/races';
import type { Character } from '../types/character';
import { combatShouldSpawn, type CombatSpawnGate } from '../components/delve/combatSpawn';
import { LORE_BEATS } from '../content/loreBeats';

/** A combat room ready to fight; `dialogueActive` is filled per-assertion. */
const READY_FIGHT: Omit<CombatSpawnGate, 'dialogueActive'> = {
  phase: 'in-room',
  hasCombat: false,
  roomKind: 'combat',
  hasMonsters: true,
  eliteEngaged: false,
};
const fightHeld = () =>
  combatShouldSpawn({ ...READY_FIGHT, dialogueActive: useScreenStore.getState().taunt !== null });

/** Mirror of delveStore's private level1HpMax — the level-1 descent ceiling. */
function level1HpMax(ch: Character): number {
  const cls = getClass(ch.classId);
  const conMod = abilityModifier(effectiveAbilityScores(ch).con);
  const raceBonusHp = getRace(ch.raceId).bonusHpPerLevel ?? 0;
  const classBonusHp = ch.classId === 'wizard' ? 1 : 0;
  const permanentHp = ch.permanentBonuses?.hp ?? 0;
  return cls.hitDie + conMod + raceBonusHp + classBonusHp + permanentHp;
}

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
    gameCompleted: false,
    throneCompleted: false,
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

  it('a clear settles the clear premium + boss + depth credit (soul-mark = 0)', () => {
    seedRun({ quirks: [], renown: 10 });
    // Boss count is read from the flat slice up to the current node (independent
    // of node numbering); depth credit reads the route ACTUALLY VISITED — a real
    // route walks fewer nodes than the flat index spans, so the two differ.
    const idx = 42;
    const rooms = useDelveStore.getState().delve!.rooms;
    const visited = rooms.slice(0, 24).map((r) => r.id);
    setDelve({ phase: 'completed', currentRoomIdx: idx, visitedRoomIds: visited });
    const bosses = rooms.slice(0, idx + 1).filter((r) => r.kind === 'boss').length;

    useDelveStore.getState().finishDelve();

    const expectedGain =
      RENOWN_PER_DELVE_CLEAR +
      RENOWN_PER_CHAPTER_BOSS * bosses +
      RENOWN_PER_ROOM_REACHED * (visited.length - 1);
    expect(char().renown).toBe(10 + expectedGain);
  });

  it('a clear records the chapter-progression high-water mark', () => {
    seedRun({ quirks: [] });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    expect(useMetaStore.getState().chaptersCleared).toBeGreaterThanOrEqual(1);
    expect(useMetaStore.getState().chapter1Cleared).toBe(true);
  });

  it('Wheelturner carries the first BOON through a clear, skipping a leading bane', () => {
    // glassbone = bane (skipped), stonehide = boon (the bright thread kept).
    seedRun({ quirks: ['glassbone', 'stonehide'], wheelturnerUnlocked: true });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    const c = char();
    expect(c.quirks[0]).toBe('stonehide');
    expect(c.quirks.length).toBeGreaterThanOrEqual(2);
  });

});

describe('delveStore.finishDelve — true-ending capstone', () => {
  /** Index of the chain's terminal Melissan boss room (all 14 bosses behind it). */
  function melissanIdx(): number {
    const rooms = useDelveStore.getState().delve!.rooms;
    const idx = rooms.findIndex((r) => r.monsters?.[0]?.defId === 'melissan');
    expect(idx).toBeGreaterThanOrEqual(0);
    return idx;
  }

  /** Seed a run on the FULL chain — the Melissan capstone only exists there
   *  (base ends at Irenicus, Ch11). */
  function seedCapstoneRun(overrides: Partial<Character> = {}) {
    const c = seedRun(overrides);
    useDelveStore.setState({ delve: createGodwakeDelve({ seed: 1, fullChain: true }) });
    return c;
  }

  beforeEach(() => {
    setActiveRoller('ending-seed');
    seedCapstoneRun({ quirks: [] });
    useMetaStore.setState({ gameCompleted: false });
  });

  it('records completion AND banks renown at the WIN MOMENT, then detours to the ending before settling', () => {
    seedCapstoneRun({ quirks: [], level: 6, renown: 0 });
    useMetaStore.setState({ gameCompleted: false });
    setDelve({ phase: 'completed', currentRoomIdx: melissanIdx() });

    // The amount DelveSummary just displayed — the win-moment bank must match it.
    const expectedGain = computeDelveRenown(useDelveStore.getState().delve!, char()).total;
    expect(expectedGain).toBeGreaterThan(0);

    useDelveStore.getState().finishDelve();

    // gameCompleted is locked in HERE — before the lazy ending screen renders —
    // so a crashed ending chunk can't cost the player the clear / New Game+.
    expect(useMetaStore.getState().gameCompleted).toBe(true);
    // Routed to the capstone; the soul's settle (reincarnation, hub) is still
    // deferred — the delve is held 'completed' so the ending's finishDelve()
    // re-entry resolves it (hence still level 6, delve not null).
    expect(useScreenStore.getState().screen).toBe('ending');
    expect(useDelveStore.getState().delve).not.toBeNull();
    expect(char().level).toBe(6);
    // Renown is banked NOW, not deferred to the conclude re-entry: leaving the
    // finale any other way (refresh, straight to New Game+) must not lose it.
    expect(char().renown).toBe(expectedGain);
  });

  it('concluding the flavor ending (finishDelve re-entry) runs the normal clear path', () => {
    seedCapstoneRun({ quirks: [], level: 6, renown: 0 });
    useMetaStore.setState({ gameCompleted: false });
    setDelve({ phase: 'completed', currentRoomIdx: melissanIdx() });

    // First pass = the win moment: completion recorded, renown banked, ending fires.
    useDelveStore.getState().finishDelve();
    expect(useScreenStore.getState().screen).toBe('ending');
    expect(useMetaStore.getState().gameCompleted).toBe(true);
    const renownAfterWin = char().renown;
    expect(renownAfterWin).toBeGreaterThan(0);

    // The flavor-only ending records nothing itself — it just re-enters
    // finishDelve (which now falls through the capstone gate), then the screen
    // routes on to the title.
    useDelveStore.getState().finishDelve();

    // Second pass settles: reincarnated, depth recorded, hub. Renown is NOT
    // banked again — it stays exactly what the win moment paid (no double-count).
    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useDelveStore.getState().delve).toBeNull();
    expect(char().level).toBe(1);
    expect(char().renown).toBe(renownAfterWin);
    expect(useMetaStore.getState().chaptersCleared).toBe(TOTAL_CHAPTERS);
    expect(useMetaStore.getState().hasReincarnated).toBe(true);
    expect(useMetaStore.getState().gameCompleted).toBe(true);
  });

  it('base-game clear (Irenicus, Ch11) banks renown at the win moment, no re-entry needed', () => {
    // A base delve ends on Irenicus at Ch11 — the full chain's Melissan capstone
    // doesn't exist here. seedRun lays down a base (11-chapter) delve; the same
    // win-moment bank must hold, gated on gameCompleted rather than throneCompleted.
    seedRun({ quirks: [], level: 6, renown: 0 });
    const rooms = useDelveStore.getState().delve!.rooms;
    const irenicusIdx = rooms.findIndex((r) => r.monsters?.[0]?.defId === 'irenicus');
    expect(irenicusIdx).toBeGreaterThanOrEqual(0);
    setDelve({ phase: 'completed', currentRoomIdx: irenicusIdx });

    const expectedGain = computeDelveRenown(useDelveStore.getState().delve!, char()).total;
    expect(expectedGain).toBeGreaterThan(0);

    // First pass = the win moment: base game marked complete (unlocking New
    // Game+), renown banked immediately. If the player walks off to the title to
    // start NG+ instead of concluding, this is the ONLY pass — and renown is safe.
    useDelveStore.getState().finishDelve();
    expect(useMetaStore.getState().gameCompleted).toBe(true);
    expect(useMetaStore.getState().throneCompleted).toBe(false);
    expect(useScreenStore.getState().screen).toBe('ending');
    expect(char().renown).toBe(expectedGain);

    // Concluding the finale settles the soul without paying renown a second time.
    useDelveStore.getState().finishDelve();
    expect(char().renown).toBe(expectedGain);
    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useDelveStore.getState().delve).toBeNull();
    expect(char().level).toBe(1);
  });

  it('REPLAYS the Throne finale on every full clear, even when throneCompleted is already set', () => {
    // The owner's exact case: a past clear set throneCompleted (the win-moment
    // record fires even if the credits never rendered — crashed lazy chunk,
    // refresh, straight to NG+; gameStore hydration also recovers it from
    // chaptersCleared >= 14). The true-clear payoff must still play.
    seedCapstoneRun({ quirks: [], level: 6, renown: 0 });
    useMetaStore.setState({ gameCompleted: true, throneCompleted: true });
    setDelve({ phase: 'completed', currentRoomIdx: melissanIdx() });

    const expectedGain = computeDelveRenown(useDelveStore.getState().delve!, char()).total;
    expect(expectedGain).toBeGreaterThan(0);

    useDelveStore.getState().finishDelve();

    // The finale fires again; renown is banked this run too (not suppressed).
    expect(useScreenStore.getState().screen).toBe('ending');
    expect(useDelveStore.getState().delve).not.toBeNull();
    expect(char().renown).toBe(expectedGain);

    // Concluding settles without double-banking the renown.
    useDelveStore.getState().finishDelve();
    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useDelveStore.getState().delve).toBeNull();
    expect(char().renown).toBe(expectedGain);
  });

  it('does NOT replay the base Pit ending once the base game is already complete', () => {
    // The base (Irenicus, Ch11) ending stays first-time — gated on gameCompleted,
    // not the Throne flag. A veteran replaying the base chain skips straight to hub.
    seedRun({ quirks: [], level: 6, renown: 0 });
    useMetaStore.setState({ gameCompleted: true });
    const rooms = useDelveStore.getState().delve!.rooms;
    const irenicusIdx = rooms.findIndex((r) => r.monsters?.[0]?.defId === 'irenicus');
    setDelve({ phase: 'completed', currentRoomIdx: irenicusIdx });

    useDelveStore.getState().finishDelve();

    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useDelveStore.getState().delve).toBeNull();
  });

  it('does NOT fire on a non-final clear (fewer than all chapters felled)', () => {
    const rooms = useDelveStore.getState().delve!.rooms;
    const ch1Boss = rooms.findIndex((r) => r.monsters?.[0]?.defId === 'duergar-ilyich');
    expect(ch1Boss).toBeGreaterThanOrEqual(0);
    setDelve({ phase: 'completed', currentRoomIdx: ch1Boss });

    useDelveStore.getState().finishDelve();

    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useMetaStore.getState().gameCompleted).toBe(false);
  });

  it('does NOT fire on death, even standing in the Melissan room', () => {
    setDelve({ phase: 'failed', currentRoomIdx: melissanIdx() });

    useDelveStore.getState().finishDelve();

    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useMetaStore.getState().gameCompleted).toBe(false);
  });

  it('markGameCompleted marks the chain cleared and is idempotent', () => {
    expect(useMetaStore.getState().gameCompleted).toBe(false);
    useMetaStore.getState().markGameCompleted();
    expect(useMetaStore.getState().gameCompleted).toBe(true);
    // Replaying the finale never un-sets it.
    useMetaStore.getState().markGameCompleted();
    expect(useMetaStore.getState().gameCompleted).toBe(true);
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

describe('delveStore — the chosen school resets for a new life/run', () => {
  function makeWizard(extra: Partial<Character> = {}): Character {
    return {
      ...createCharacter({
        id: 'test-wizard',
        name: 'Cristulio',
        raceId: 'human',
        classId: 'wizard',
        baseAbilityScores: {
          int: STANDARD_ARRAY[0],
          dex: STANDARD_ARRAY[1],
          con: STANDARD_ARRAY[2],
          wis: STANDARD_ARRAY[3],
          cha: STANDARD_ARRAY[4],
          str: STANDARD_ARRAY[5],
        },
      }),
      ...extra,
    };
  }

  function seedWizardRun(overrides: Partial<Character> = {}) {
    const character = makeWizard({ level: 4, subclassId: 'evocation', ...overrides });
    useCharacterStore.setState({ character, saveSeed: null });
    useDelveStore.setState({ delve: createGodwakeDelve(1) });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({
      hasReincarnated: false,
      chaptersCleared: 0,
      chapter1Cleared: false,
      druidGroveUnlocked: false,
      gameCompleted: false,
      throneCompleted: false,
      knownNpcs: [],
    });
    useScreenStore.setState({ screen: 'delve' });
  }

  beforeEach(() => {
    setActiveRoller('school-reset-seed');
  });

  it('death clears the chosen school so the next life re-picks at level 2', () => {
    seedWizardRun();
    expect(char().subclassId).toBe('evocation');

    useDelveStore.getState().failDelve();

    expect(char().subclassId).toBeNull();
  });

  it('a clear clears the chosen school', () => {
    seedWizardRun({ quirks: [] });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    expect(char().subclassId).toBeNull();
  });

  it('a fresh descent clears a school carried on the soul (abandon path)', () => {
    seedWizardRun();
    useDelveStore.getState().startDelve(createGodwakeDelve(1));

    expect(char().subclassId).toBeNull();
  });
});

describe('delveStore — Druid Grove arrives at the first reincarnation', () => {
  beforeEach(() => {
    setActiveRoller('grove-intro-seed');
    seedRun({ quirks: [] });
    useScreenStore.setState({ tutorialQueue: [] });
    useMetaStore.setState({ seenTutorials: [] });
  });

  it('is locked before the first death and unlocked after the first reincarnation', () => {
    // A fresh soul: never died, no legacy flag.
    expect(useMetaStore.getState().hasReincarnated).toBe(false);
    expect(isFeatureUnlocked('grove', useMetaStore.getState())).toBe(false);

    useDelveStore.getState().failDelve();

    expect(useMetaStore.getState().hasReincarnated).toBe(true);
    expect(isFeatureUnlocked('grove', useMetaStore.getState())).toBe(true);
  });

  it('enqueues the grove tutorial exactly once, on the first death', () => {
    useDelveStore.getState().failDelve();

    const queue = useScreenStore.getState().tutorialQueue;
    expect(queue.filter((id) => id === 'grove')).toEqual(['grove']);

    // A later death does not replay it: mark it seen (as the dismiss would) and
    // clear the session queue, then die again — the wheel has already turned.
    useMetaStore.getState().markTutorialSeen('grove');
    useScreenStore.setState({ tutorialQueue: [] });
    useDelveStore.getState().failDelve();
    expect(useScreenStore.getState().tutorialQueue).not.toContain('grove');
  });

  it('does NOT enqueue the grove tutorial on the old delve-2 descent', () => {
    // Crossing the former delve-2 threshold must no longer fire the Grove card —
    // it rides the reincarnation event now, not the onboarding ladder.
    useMetaStore.setState({ delveCount: 1, hasReincarnated: false, seenTutorials: [] });
    useScreenStore.setState({ tutorialQueue: [] });

    useDelveStore.getState().startDelve(createGodwakeDelve(1));

    expect(useScreenStore.getState().tutorialQueue).not.toContain('grove');
  });

  it('a veteran who already turned the wheel never re-triggers the grove card', () => {
    // hasReincarnated already true, the card already seen: a clear-driven
    // reincarnation must stay silent.
    useMetaStore.setState({ hasReincarnated: true, seenTutorials: ['grove'] });
    useScreenStore.setState({ tutorialQueue: [] });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    expect(useScreenStore.getState().tutorialQueue).not.toContain('grove');
  });
});

describe('delveStore — reincarnation refills HP for the between-lives screen', () => {
  beforeEach(() => {
    setActiveRoller('hp-seed');
  });

  it('death fills hp.current to max and clears temp (a whole soul, not a corpse at 0)', () => {
    seedRun({ quirks: [], hp: { current: 0, max: 19, temp: 4 } });

    useDelveStore.getState().failDelve();

    const c = char();
    expect(c.hp.current).toBe(c.hp.max);
    expect(c.hp.current).toBeGreaterThan(0);
    expect(c.hp.temp).toBe(0);
  });

  it('a clear also reincarnates with a full body', () => {
    seedRun({ quirks: [], hp: { current: 0, max: 25, temp: 0 } });
    setDelve({ phase: 'completed', currentRoomIdx: 36 });

    useDelveStore.getState().finishDelve();

    const c = char();
    expect(c.hp.current).toBe(c.hp.max);
    expect(c.hp.current).toBeGreaterThan(0);
  });

  it('refills to the LEVEL-1 ceiling, not the dead life leveled max', () => {
    // A level-6 soul carrying a leveled max of 46 dies. The between-lives screen
    // must show the level-1 ceiling it will actually descend with (~13 for this
    // fighter), so HP no longer reads 46/46 then snaps down on Descend.
    seedRun({ quirks: [], level: 6, hp: { current: 5, max: 46, temp: 0 } });
    const expected = level1HpMax(char());

    useDelveStore.getState().failDelve();

    const c = char();
    expect(c.hp.max).toBe(expected);
    expect(c.hp.current).toBe(expected);
    expect(c.hp.max).toBeLessThan(46);
  });
});

describe('delveStore — permanent Grove bonuses survive reincarnation', () => {
  beforeEach(() => {
    setActiveRoller('grove-seed');
  });

  it('a purchased permanent HP upgrade survives the wheel and re-applies on descent', () => {
    // Baseline: identical soul, no upgrade, descended fresh.
    seedRun({ quirks: [] });
    useMetaStore.setState({ ascensionUnlocked: 0, unlockedUpgrades: {} });
    useDelveStore.getState().startDelve(createGodwakeDelve(1));
    const baselineMax = char().hp.max;

    // Buy +5 permanent HP (Mantle of the Wakened, rank 1).
    seedRun({ quirks: [], renown: 1000 });
    useMetaStore.setState({ ascensionUnlocked: 0, unlockedUpgrades: {} });
    expect(useMetaStore.getState().purchaseUpgrade('mantle-of-the-wakened').ok).toBe(true);
    expect(char().permanentBonuses?.hp).toBe(5);

    // Death turns the wheel — the meta-backed bonus must NOT be wiped.
    useDelveStore.getState().failDelve();
    expect(char().permanentBonuses?.hp).toBe(5);

    // Re-descend: the +5 is baked back into the level-1 HP ceiling.
    useDelveStore.getState().startDelve(createGodwakeDelve(1));
    expect(char().permanentBonuses?.hp).toBe(5);
    expect(char().hp.max).toBe(baselineMax + 5);
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
    const fresh = createGodwakeDelve(1);
    const visited = fresh.rooms.slice(0, 24).map((r) => r.id);
    useDelveStore.setState({
      delve: {
        ...fresh,
        phase: 'completed',
        currentRoomIdx: 42,
        ascensionLevel: 4,
        visitedRoomIds: visited,
      },
    });

    const soulMark = renownSoulMarkMultiplier(character);
    const ascMult = getAscensionLevel(4).renownMult;
    expect(soulMark).toBeGreaterThan(1);
    expect(ascMult).toBeGreaterThan(1);
    // base = clear premium + bosses behind the current node + depth (the route
    // actually visited), read from the layout rather than hard-coded indices.
    const idx = 42;
    const bosses = fresh.rooms.slice(0, idx + 1).filter((r) => r.kind === 'boss').length;
    const base =
      RENOWN_PER_DELVE_CLEAR +
      RENOWN_PER_CHAPTER_BOSS * bosses +
      RENOWN_PER_ROOM_REACHED * (visited.length - 1);
    const expected = Math.floor(base * soulMark * ascMult);

    useDelveStore.getState().finishDelve();

    expect(char().renown).toBe(expected);
    // Sanity: applying only one multiplier would land short of the product.
    expect(expected).toBeGreaterThan(Math.floor(base * ascMult));
    expect(expected).toBeGreaterThan(Math.floor(base * soulMark));
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

describe('delveStore — ASI gains do not persist across lives', () => {
  const presetStr = presetCreationInput('fighter').baseAbilityScores.str;

  beforeEach(() => {
    setActiveRoller('asi-seed');
  });

  it('death clears runAsiGains — in-run ASI does not compound into the next life', () => {
    // Simulate a fighter who picked STR +2 at level 4 (LevelUpScreen writes to runAsiGains).
    const ch = makeFighter({ runAsiGains: { str: 2 } });
    useCharacterStore.setState({ character: ch, saveSeed: null });
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

    // Within the run the ASI is live: runAsiGains holds it, baseAbilityScores unchanged.
    expect(char().runAsiGains?.str).toBe(2);
    expect(char().baseAbilityScores.str).toBe(presetStr);

    useDelveStore.getState().failDelve();

    // After death the gain is wiped — baseAbilityScores unchanged, runAsiGains gone.
    expect(char().baseAbilityScores.str).toBe(presetStr);
    expect(char().runAsiGains).toBeUndefined();
  });

  it('startDelve clears runAsiGains — abandon then redescend cannot carry ASI gains', () => {
    // Simulate a character at hub with a stale in-run ASI on the soul (e.g. after abandonDelve).
    const ch = makeFighter({ runAsiGains: { str: 2 } });
    useCharacterStore.setState({ character: ch, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
    useMetaStore.setState({
      hasReincarnated: false,
      chaptersCleared: 0,
      chapter1Cleared: false,
      druidGroveUnlocked: false,
      knownNpcs: [],
      unlockedUpgrades: {},
    });
    useScreenStore.setState({ screen: 'hub' });

    useDelveStore.getState().startDelve(createGodwakeDelve(1));

    // Descent resets the run-scoped gain — the new run starts clean.
    expect(char().runAsiGains).toBeUndefined();
    expect(char().baseAbilityScores.str).toBe(presetStr);
  });
});

describe('delveStore.acceptSpoils — mid-run chapter-unlock reveals', () => {
  /** Boss rooms in chain order; [0] = chapter 1, [4] = chapter 5, … */
  function bossRooms(): RoomSpec[] {
    return useDelveStore.getState().delve!.rooms.filter((r) => r.kind === 'boss');
  }

  /** Stage the run so the next acceptSpoils() resolves `room` as the cleared room. */
  function stageClear(room: RoomSpec) {
    const idx = useDelveStore.getState().delve!.rooms.findIndex((r) => r.id === room.id);
    setDelve({ currentRoomIdx: idx, currentRoomId: room.id });
    useDelveStore.setState({ pendingSpoilsRoom: room });
  }

  beforeEach(() => {
    setActiveRoller('midrun-unlock-seed');
    seedRun({ quirks: [] });
    // hasReincarnated: true keeps the first-reincarnation Grove reveal (fired in
    // reincarnateSoul on a won finishDelve) from polluting these chapter-card
    // assertions — grove-on-first-death is covered in its own suite.
    useMetaStore.setState({ seenTutorials: [], chaptersCleared: 0, hasReincarnated: true });
    useScreenStore.setState({ tutorialQueue: [], taunt: null, tauntQueue: [] });
  });

  it('enqueues the chapter-unlock reveal the instant the chapter falls, before any finishDelve', () => {
    stageClear(bossRooms()[0]); // felling the ch1 boss crosses boss-intel (@1)

    useDelveStore.getState().acceptSpoils();

    // Card queued and the high-water bumped — both WITHOUT a finishDelve.
    expect(useScreenStore.getState().tutorialQueue).toEqual(['boss-intel']);
    expect(useMetaStore.getState().chaptersCleared).toBe(1);
  });

  it('advances the high-water mid-run so the unlocked feature goes LIVE for the rest of the run', () => {
    // Sitting at a ch4 high-water, felling the ch5 boss crosses legendaries (@5).
    useMetaStore.setState({ chaptersCleared: 4, seenTutorials: [] });
    expect(isFeatureUnlocked('legendaries', useMetaStore.getState())).toBe(false);

    stageClear(bossRooms()[4]);
    useDelveStore.getState().acceptSpoils();

    expect(useScreenStore.getState().tutorialQueue).toEqual(['legendaries']);
    expect(useMetaStore.getState().chaptersCleared).toBe(5);
    // The whole point: legendary drops are live for the REST of this run now.
    expect(isFeatureUnlocked('legendaries', useMetaStore.getState())).toBe(true);
  });

  it('a later finishDelve does NOT re-enqueue a card already revealed mid-run (no double-fire)', () => {
    const ch1Boss = bossRooms()[0];
    const idx = useDelveStore.getState().delve!.rooms.findIndex((r) => r.id === ch1Boss.id);
    stageClear(ch1Boss);

    useDelveStore.getState().acceptSpoils();
    expect(useScreenStore.getState().tutorialQueue).toEqual(['boss-intel']);

    // Run ends on that same ch1 clear: finishDelve re-runs the chapter bookkeeping,
    // but the high-water is already 1, so it enqueues nothing new.
    setDelve({ phase: 'completed', currentRoomIdx: idx });
    useDelveStore.getState().finishDelve();

    expect(useScreenStore.getState().tutorialQueue).toEqual(['boss-intel']);
    expect(useMetaStore.getState().chaptersCleared).toBe(1);
  });

  it('a non-boss room clear queues no chapter card and leaves the high-water untouched', () => {
    const combat = useDelveStore.getState().delve!.rooms.find((r) => r.kind === 'combat')!;
    stageClear(combat);

    useDelveStore.getState().acceptSpoils();

    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
    expect(useMetaStore.getState().chaptersCleared).toBe(0);
  });

  it('clearing chapter 2 fires NO soul-swapping card — that generic notice was removed', () => {
    // Sitting at a ch1 high-water, felling the ch2 boss crosses chapter 2. The old
    // ladder fired a 'class-roster' soul-swapping teaser here; it has been removed
    // entirely (the per-soul unlock cards are the only soul-swap onboarding now), so
    // the chapter step fires nothing.
    useMetaStore.setState({ chaptersCleared: 1, seenTutorials: [] });
    stageClear(bossRooms()[1]);

    useDelveStore.getState().acceptSpoils();

    expect(useMetaStore.getState().chaptersCleared).toBe(2);
    expect(useScreenStore.getState().tutorialQueue).not.toContain('class-roster');
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });
});

describe('delveStore.acceptSpoils — Irenicus falls silent after his Ch11 death', () => {
  function bossRooms(): RoomSpec[] {
    return useDelveStore.getState().delve!.rooms.filter((r) => r.kind === 'boss');
  }
  function stageClear(room: RoomSpec) {
    const idx = useDelveStore.getState().delve!.rooms.findIndex((r) => r.id === room.id);
    setDelve({ currentRoomIdx: idx, currentRoomId: room.id });
    useDelveStore.setState({ pendingSpoilsRoom: room });
  }

  beforeEach(() => {
    setActiveRoller('irenicus-silence-seed');
    seedRun({ quirks: [] });
    // The full NG+ chain so the Throne-of-Bhaal bosses (Ch12-14) exist to clear.
    useDelveStore.setState({ delve: createGodwakeDelve({ seed: 1, fullChain: true }) });
    useMetaStore.setState({ seenTutorials: [], chaptersCleared: 0, hasReincarnated: true });
    useScreenStore.setState({ tutorialQueue: [], taunt: null, tauntQueue: [] });
  });

  it('clearing Ch11 — his death — still fires a final Irenicus chapter-clear taunt', () => {
    stageClear(bossRooms()[10]); // 11th boss = Chapter 11, Irenicus himself
    useDelveStore.getState().acceptSpoils();

    const taunt = useScreenStore.getState().taunt;
    expect(taunt).not.toBeNull();
    expect(taunt!.speaker).toBe('irenicus');
    expect(taunt!.context).toBe('chapter-clear');
    expect(taunt!.chapter).toBe(11);
  });

  it('clearing a Throne-of-Bhaal chapter (Ch12-14) fires NO Irenicus taunt', () => {
    for (const bossIndex of [11, 12, 13]) {
      useScreenStore.setState({ taunt: null, tauntQueue: [] });
      stageClear(bossRooms()[bossIndex]); // 12th/13th/14th boss = Ch12/13/14
      useDelveStore.getState().acceptSpoils();
      expect(useScreenStore.getState().taunt).toBeNull();
    }
  });
});

describe('delveStore — dialogue plays BEFORE the fight, never over it', () => {
  beforeEach(() => {
    setActiveRoller('dialogue-before-fight-seed');
    seedRun({ quirks: [] });
    useScreenStore.setState({ screen: 'hub', taunt: null, tauntQueue: [], hubUnlockQueue: [], pendingDescent: false });
    // Fresh first-ever soul at the start of the arc: the descent must drip beat 1.
    useMetaStore.setState({ delveCount: 0, seenDialogueBeats: [], knownNpcs: [] });
  });

  it('startDelve fires the soul-bond beat as the active dialogue, and HOLDS the first fight behind it', () => {
    const beat1 = LORE_BEATS[0]; // lore-01-the-cage-held — "So. The cage held…"

    useDelveStore.getState().startDelve(createGodwakeDelve(1));

    // The beat is the active dialogue the instant we land on the delve screen…
    const taunt = useScreenStore.getState().taunt;
    expect(useScreenStore.getState().screen).toBe('delve');
    expect(taunt).not.toBeNull();
    expect(taunt!.speaker).toBe(beat1.speaker);
    expect(taunt!.line).toBe(beat1.text);
    expect(useMetaStore.getState().seenDialogueBeats).toContain(beat1.id);
    // …so the first fight is HELD: combat (and the first-combat coach) must not
    // build while the beat is up. This is the bug fix — the beat precedes combat.
    expect(fightHeld()).toBe(false);
  });

  it('dismissing the soul-bond beat then releases the held fight', () => {
    useDelveStore.getState().startDelve(createGodwakeDelve(1));
    expect(fightHeld()).toBe(false);

    useScreenStore.getState().dismissTaunt();

    expect(useScreenStore.getState().taunt).toBeNull();
    expect(fightHeld()).toBe(true); // combat builds only now, after the dialogue
  });

  it('a boss clear fires the chapter-clear taunt SYNCHRONOUSLY (no setTimeout), holding the next room', () => {
    const ch1Boss = useDelveStore.getState().delve!.rooms.filter((r) => r.kind === 'boss')[0];
    const idx = useDelveStore.getState().delve!.rooms.findIndex((r) => r.id === ch1Boss.id);
    setDelve({ currentRoomIdx: idx, currentRoomId: ch1Boss.id });
    useDelveStore.setState({ pendingSpoilsRoom: ch1Boss });
    useScreenStore.setState({ taunt: null, tauntQueue: [] });

    useDelveStore.getState().acceptSpoils();

    // No fake timers, no await: the taunt is already up right after the call —
    // it precedes the next room instead of landing on top of it 1.5s later.
    const taunt = useScreenStore.getState().taunt;
    expect(taunt).not.toBeNull();
    expect(taunt!.speaker).toBe('irenicus');
    expect(taunt!.context).toBe('chapter-clear');
    expect(fightHeld()).toBe(false);
  });

  it('a reveal beat on descent flips ONLY its own NPC — Imoen early, Irenicus held to Ch10', () => {
    const idsBefore = (id: string) =>
      LORE_BEATS.slice(0, LORE_BEATS.findIndex((b) => b.id === id)).map((b) => b.id);
    const imoenReveal = LORE_BEATS.find((b) => b.reveals === 'imoen')!;
    const irenicusReveal = LORE_BEATS.find((b) => b.reveals === 'irenicus')!;

    // The descent that drips Imoen's reveal: every earlier beat already seen, deep
    // in delves, no chapter cleared. Her name flips; the antagonist stays "The Voice".
    useMetaStore.setState({
      delveCount: 999,
      chaptersCleared: 0,
      seenDialogueBeats: idsBefore(imoenReveal.id),
      knownNpcs: [],
    });
    useDelveStore.getState().startDelve(createGodwakeDelve(1));
    expect(useMetaStore.getState().seenDialogueBeats).toContain(imoenReveal.id);
    expect(useMetaStore.getState().knownNpcs).toEqual(['imoen']);

    // The descent that drips Irenicus's reveal needs Suldanessellar (Ch10) cleared.
    // His name flips now — and only now; Imoen was already known, independently.
    useScreenStore.setState({ taunt: null, tauntQueue: [] });
    useMetaStore.setState({
      delveCount: 999,
      chaptersCleared: 10,
      seenDialogueBeats: idsBefore(irenicusReveal.id),
      knownNpcs: ['imoen'],
    });
    useDelveStore.getState().startDelve(createGodwakeDelve(1));
    expect(useMetaStore.getState().seenDialogueBeats).toContain(irenicusReveal.id);
    expect(useMetaStore.getState().knownNpcs).toEqual(['imoen', 'irenicus']);
  });
});

describe('delveStore — a pending level-up is forced before the next fight', () => {
  beforeEach(() => {
    setActiveRoller('levelup-gate-seed');
    seedRun({ quirks: [] });
    useScreenStore.setState({ screen: 'delve', taunt: null, tauntQueue: [], tutorialQueue: [] });
  });

  it('acceptSpoils routes to the level-up screen when the clear crossed a threshold', () => {
    // Level 3 carrying L4 XP (xpForLevel(4) = 1000) → a level-up is owed.
    seedRun({ quirks: [], level: 3, xp: 1000 });
    const combat = useDelveStore.getState().delve!.rooms.find((r) => r.kind === 'combat')!;
    const idx = useDelveStore.getState().delve!.rooms.findIndex((r) => r.id === combat.id);
    setDelve({ currentRoomIdx: idx, currentRoomId: combat.id });
    useDelveStore.setState({ pendingSpoilsRoom: combat });

    useDelveStore.getState().acceptSpoils();

    expect(useScreenStore.getState().screen).toBe('level-up');
  });

  it('chooseRoom will not enter a node while a level-up is owed — it routes to level-up and the run stays put', () => {
    seedRun({ quirks: [], level: 3, xp: 1000 });
    setDelve({ phase: 'between-rooms', currentRoomIdx: 0 });
    useScreenStore.setState({ screen: 'delve' });
    const entry = useDelveStore.getState().delve!.rooms[0];
    const target = entry.next![0];

    useDelveStore.getState().chooseRoom(target);

    // Sent to level up — and crucially the run did NOT step into the node or
    // build a combat, so no extra fight can happen before leveling.
    expect(useScreenStore.getState().screen).toBe('level-up');
    const d = useDelveStore.getState().delve!;
    expect(d.phase).toBe('between-rooms');
    expect(d.currentRoomIdx).toBe(0);
    expect(useCombatStore.getState().combat).toBeNull();
  });

  it('chooseRoom steps into the node normally once nothing is owed (gate is transparent)', () => {
    // Level 3, default xp 0 → no pending level-up.
    seedRun({ quirks: [] });
    setDelve({ phase: 'between-rooms', currentRoomIdx: 0 });
    const entry = useDelveStore.getState().delve!.rooms[0];
    const target = entry.next![0];

    useDelveStore.getState().chooseRoom(target);

    const d = useDelveStore.getState().delve!;
    expect(d.phase).toBe('in-room');
    expect(d.currentRoomId).toBe(target);
  });
});
