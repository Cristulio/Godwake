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

  it('queues the feature whose threshold the descent crosses on the HUB surface', () => {
    primeSoul(4); // 4 -> 5 crosses elite-nodes (@5), with no class unlock there
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['elite-nodes']);
    // It does NOT land on the in-delve queue (chapter/first-gear reveals).
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });

  it('never queues the Grove on a descent — it is reincarnation-gated now', () => {
    primeSoul(1); // crossing the old delve-2 step must no longer fire the Grove
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).not.toContain('grove');
  });

  it('queues nothing on a descent that crosses no threshold', () => {
    primeSoul(10); // 10 -> 11: no delve-gated reveal sits above elite-nodes @5
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });

  it('never re-fires a tutorial already in seenTutorials', () => {
    primeSoul(4, ['elite-nodes']); // 4 -> 5 would cross elite-nodes, but it's already seen
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });

  it('does NOT flood a migrated veteran with back-tutorials', () => {
    primeSoul(999); // 999 -> 1000 crosses no threshold (all are <= 999 already)
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });

  it('dismissing the head marks it seen (persisted) and shifts the queue', () => {
    primeSoul(4); // 4 -> 5 crosses elite-nodes (@5)
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['elite-nodes']);

    useGameStore.getState().dismissHubTutorial();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
    expect(useMetaStore.getState().seenTutorials).toContain('elite-nodes');
  });

  it('a re-run after dismissal does not re-show the same card', () => {
    primeSoul(4);
    descend();
    useGameStore.getState().dismissHubTutorial();
    expect(useMetaStore.getState().seenTutorials).toContain('elite-nodes');

    // Reincarnate and descend again from the same threshold — already seen.
    useScreenStore.setState({ screen: 'hub', hubUnlockQueue: [], pendingDescent: false });
    useMetaStore.setState({ delveCount: 4 });
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });
});

describe('delve-count unlocks surface at the HUB, never over the delve', () => {
  beforeEach(() => {
    useScreenStore.setState({
      screen: 'hub',
      tutorialQueue: [],
      hubUnlockQueue: [],
      pendingDescent: false,
    });
  });

  it('parks the descent at the hub while the card is up — the delve has NOT been entered', () => {
    primeSoul(4); // 4 -> 5 crosses elite-nodes (@5)
    descend();

    const sc = useScreenStore.getState();
    expect(sc.hubUnlockQueue).toEqual(['elite-nodes']);
    expect(sc.screen).toBe('hub'); // not 'delve' — the card shows at the hub first
    expect(sc.pendingDescent).toBe(true);

    // Dismissing the card releases the held descent into the delve.
    useGameStore.getState().dismissHubTutorial();
    const after = useScreenStore.getState();
    expect(after.screen).toBe('delve');
    expect(after.hubUnlockQueue).toEqual([]);
    expect(after.pendingDescent).toBe(false);
  });

  it('queues only the FEATURE card on a descent — class reveals moved off the delve axis', () => {
    // 2 -> 3 crosses affixes-rare (@3). The Mage soul used to ride this very step
    // on the old delve ladder; it now opens on RENOWN SPENT (a Grove purchase), so
    // the descent must no longer queue it — only the feature card shows, and
    // dismissing that single card releases the held descent.
    primeSoul(2);
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['affixes-rare']);
    expect(useScreenStore.getState().hubUnlockQueue).not.toContain('wizard');
    expect(useScreenStore.getState().screen).toBe('hub');

    useGameStore.getState().dismissHubTutorial(); // affixes-rare
    expect(useScreenStore.getState().screen).toBe('delve');
    expect(useScreenStore.getState().pendingDescent).toBe(false);
  });

  it('a threshold-less descent enters the delve immediately (no hub hold)', () => {
    primeSoul(10); // crosses nothing
    descend();
    const sc = useScreenStore.getState();
    expect(sc.hubUnlockQueue).toEqual([]);
    expect(sc.screen).toBe('delve');
    expect(sc.pendingDescent).toBe(false);
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

  it('the first Grove offering surfaces the first alternate soul (Hunter for a fighter origin)', () => {
    primeGroveSoul();
    const res = useGameStore.getState().purchaseUpgrade('pilgrims-boots'); // 25 renown — clears the >0 bar
    expect(res.ok).toBe(true);
    expect(useMetaStore.getState().renownSpent).toBe(25);
    // Surfaces on the general tutorial queue (pops at the Grove), not the hub-descent queue.
    expect(useScreenStore.getState().tutorialQueue).toContain('ranger');
    expect(useScreenStore.getState().hubUnlockQueue).toEqual([]);
  });

  it('does not re-surface a soul already in seenTutorials', () => {
    primeGroveSoul(0, ['ranger']);
    useGameStore.getState().purchaseUpgrade('pilgrims-boots');
    expect(useScreenStore.getState().tutorialQueue).not.toContain('ranger');
  });

  it('crossing no new class bar surfaces nothing (already past the first offering)', () => {
    primeGroveSoul(50); // already > 0: the Hunter is open, nothing new at this spend
    useGameStore.getState().purchaseUpgrade('pilgrims-boots'); // 50 -> 75, no bar between
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });
});
