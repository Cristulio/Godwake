import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { useGameStore } from './gameStore';
import { createGodwakeDelve } from '../engine/delve';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
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

/** Set the soul up to START its next delve from `delveCount`, standing at the hub. */
function primeSoul(delveCount: number, seenTutorials: string[] = []) {
  useCharacterStore.setState({ character: makeFighter(), saveSeed: null });
  useScreenStore.setState({
    screen: 'hub',
    tutorialQueue: [],
    hubUnlockQueue: [],
    pendingDescent: false,
  });
  // A fighter-origin soul: the relative ladder opens the Mage at delve 3, the
  // Hunter at 6, then the non-starters at 9/12/15/18.
  useMetaStore.setState({ delveCount, seenTutorials, originClass: 'fighter' });
}

function descend() {
  useDelveStore.getState().startDelve(createGodwakeDelve(1));
}

describe('unlock-tutorial trigger (startDelve)', () => {
  beforeEach(() => {
    useScreenStore.setState({
      screen: 'hub',
      tutorialQueue: [],
      hubUnlockQueue: [],
      pendingDescent: false,
    });
  });

  it('fires NO hub reveal across the old elite-nodes step — elites are always available now', () => {
    primeSoul(4); // 4 -> 5 used to cross elite-nodes (@5); the delve gate is disabled now
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
    // Nothing lands on the in-delve queue either (chapter/first-gear reveals).
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
    // Nothing to hold for — the descent drops straight into the delve.
    expect(useScreenStore.getState().screen).toBe('delve');
  });

  it('a brand-new soul descends with SELECTABLE elites and no hub hold', () => {
    primeSoul(0); // first-ever descent: 0 -> 1, no renown, no chapters cleared
    descend();
    const sc = useScreenStore.getState();
    expect(sc.hubUnlockQueue).toEqual([]); // no "Elites unlocked" card
    expect(sc.screen).toBe('delve');
    expect(sc.pendingDescent).toBe(false);
    // The delve itself carries elite rooms, all selectable (never locked).
    const elites = useDelveStore.getState().delve!.rooms.filter((r) => r.kind === 'elite');
    expect(elites.length).toBeGreaterThan(0);
    expect(elites.some((r) => r.locked)).toBe(false);
  });

  it('never queues the Grove on a descent — it is reincarnation-gated now', () => {
    primeSoul(1); // crossing the old delve-2 step must no longer fire the Grove
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).not.toContain('grove');
  });

  it('queues nothing on any descent — no delve-paced reveal remains', () => {
    primeSoul(10);
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });

  it('does NOT flood a migrated veteran with back-tutorials', () => {
    primeSoul(999); // 999 -> 1000 crosses no threshold (all are <= 999 already)
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });
});

describe('hub-unlock queue plumbing (hold → dismiss → resume)', () => {
  // No feature gates on delve count anymore (elites are always available), so nothing
  // auto-fills the hub-unlock queue. The hold/dismiss/resume plumbing is feature-
  // agnostic though — drive it directly with arbitrary ids to guard the mechanism for
  // any future delve-paced reveal.
  beforeEach(() => {
    useScreenStore.setState({
      screen: 'hub',
      tutorialQueue: [],
      hubUnlockQueue: [],
      pendingDescent: false,
    });
    useMetaStore.setState({ seenTutorials: [] });
  });

  it('parks a held descent at the hub and releases it into the delve on the last dismissal', () => {
    const sc = useScreenStore.getState();
    sc.enqueueHubUnlocks(['elite-nodes']);
    sc.holdForHubUnlock();
    expect(useScreenStore.getState().screen).toBe('hub'); // not 'delve' — the card shows first
    expect(useScreenStore.getState().pendingDescent).toBe(true);

    useGameStore.getState().dismissHubTutorial();
    const after = useScreenStore.getState();
    expect(after.screen).toBe('delve');
    expect(after.hubUnlockQueue).toEqual([]);
    expect(after.pendingDescent).toBe(false);
    // Dismissal persists the card as seen so it never re-shows.
    expect(useMetaStore.getState().seenTutorials).toContain('elite-nodes');
  });

  it('holds the descent until the LAST of several cards is dismissed', () => {
    const sc = useScreenStore.getState();
    sc.enqueueHubUnlocks(['elite-nodes', 'boss-intel']);
    sc.holdForHubUnlock();

    useGameStore.getState().dismissHubTutorial(); // first card — still held
    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useScreenStore.getState().pendingDescent).toBe(true);
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['boss-intel']);

    useGameStore.getState().dismissHubTutorial(); // last card — resume into the delve
    expect(useScreenStore.getState().screen).toBe('delve');
    expect(useScreenStore.getState().pendingDescent).toBe(false);
  });

  it('dedupes ids already queued', () => {
    const sc = useScreenStore.getState();
    sc.enqueueHubUnlocks(['elite-nodes']);
    sc.enqueueHubUnlocks(['elite-nodes', 'boss-intel']);
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['elite-nodes', 'boss-intel']);
  });
});

describe('screenStore tutorial queue', () => {
  beforeEach(() => useScreenStore.setState({ tutorialQueue: [] }));

  it('enqueues in order and dedupes ids already queued', () => {
    const sc = useScreenStore.getState();
    sc.enqueueTutorials(['grove', 'affixes-rare']);
    sc.enqueueTutorials(['affixes-rare', 'legendaries']); // affixes-rare already queued
    expect(useScreenStore.getState().tutorialQueue).toEqual([
      'grove',
      'affixes-rare',
      'legendaries',
    ]);
  });

  it('shiftTutorial drops the head', () => {
    useScreenStore.setState({ tutorialQueue: ['grove', 'legendaries'] });
    useScreenStore.getState().shiftTutorial();
    expect(useScreenStore.getState().tutorialQueue).toEqual(['legendaries']);
  });
});

describe('class reveals fire on RENOWN SPENT (a Grove purchase), not on a descent', () => {
  /** A fighter-origin soul at the Grove with renown to spend and nothing unlocked. */
  function primeGroveSoul(renownSpent = 0, seenTutorials: string[] = []) {
    useCharacterStore.setState({ character: makeFighter({ renown: 1000 }), saveSeed: null });
    useScreenStore.setState({
      screen: 'druid-grove',
      tutorialQueue: [],
      hubUnlockQueue: [],
      pendingDescent: false,
    });
    // Fighter origin: the Hunter opens on the first offering (>0), the Mage at 100.
    useMetaStore.setState({
      originClass: 'fighter',
      renownSpent,
      seenTutorials,
      unlockedUpgrades: {},
      ascensionUnlocked: 0,
      druidGroveUnlocked: true,
    });
  }

  it('the first Grove offering surfaces the soul-swapping explainer AND names the first alternate soul', () => {
    primeGroveSoul();
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots'); // 25 renown — clears the >0 bar
    expect(res.ok).toBe(true);
    expect(useMetaStore.getState().renownSpent).toBe(25);
    // Combined, first time only: the 'class-roster' explainer leads, then the named
    // soul (Hunter for a fighter origin). On the general queue (pops at the Grove).
    expect(useScreenStore.getState().tutorialQueue).toEqual(['class-roster', 'ranger']);
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });

  it('the soul-swapping explainer rides only the FIRST unlock — later purchases just name the soul', () => {
    // class-roster already seen, the Hunter already open; this purchase crosses the
    // Mage bar (@100). Only the named soul surfaces — no second explainer.
    primeGroveSoul(99, ['class-roster', 'ranger']);
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots'); // 99 -> 124, crosses wizard @100
    expect(res.ok).toBe(true);
    expect(useScreenStore.getState().tutorialQueue).toEqual(['wizard']);
  });

  it('does not re-surface a soul already in seenTutorials (and no lone explainer without a soul)', () => {
    primeGroveSoul(0, ['ranger']);
    useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(useScreenStore.getState().tutorialQueue).not.toContain('ranger');
    // The explainer only ever rides WITH a surfacing soul — none here, so none fires.
    expect(useScreenStore.getState().tutorialQueue).not.toContain('class-roster');
  });

  it('crossing no new class bar surfaces nothing (already past the first offering)', () => {
    primeGroveSoul(50); // already > 0: the Hunter is open, nothing new at this spend
    useGameStore.getState().purchaseUpgrade('pilgrims-boots'); // 50 -> 75, no bar between
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });
});
