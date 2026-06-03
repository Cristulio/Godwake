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
  useMetaStore.setState({ delveCount, seenTutorials });
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

  it('holds the descent until EVERY crossed unlock is dismissed', () => {
    primeSoul(2); // 2 -> 3 crosses affixes-rare (@3) AND the Ranger soul (class @3)
    descend();
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['affixes-rare', 'ranger']);
    expect(useScreenStore.getState().screen).toBe('hub');

    useGameStore.getState().dismissHubTutorial(); // affixes-rare
    expect(useScreenStore.getState().screen).toBe('hub'); // still parked for the Ranger card
    expect(useScreenStore.getState().hubUnlockQueue).toEqual(['ranger']);

    useGameStore.getState().dismissHubTutorial(); // ranger
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
