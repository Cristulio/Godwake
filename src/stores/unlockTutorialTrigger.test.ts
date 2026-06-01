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

/** Set the soul up to START its next delve from `delveCount`. */
function primeSoul(delveCount: number, seenTutorials: string[] = []) {
  useCharacterStore.setState({ character: makeFighter(), saveSeed: null });
  useScreenStore.setState({ tutorialQueue: [] });
  useMetaStore.setState({ delveCount, seenTutorials });
}

function descend() {
  useDelveStore.getState().startDelve(createGodwakeDelve(1));
}

describe('unlock-tutorial trigger (startDelve)', () => {
  beforeEach(() => {
    useScreenStore.setState({ tutorialQueue: [] });
  });

  it('queues the feature whose threshold the descent crosses', () => {
    primeSoul(1); // 1 -> 2 crosses grove (@2)
    descend();
    expect(useScreenStore.getState().tutorialQueue).toEqual(['grove']);
  });

  it('queues nothing on a descent that crosses no threshold', () => {
    primeSoul(10); // 10 -> 11: no delve-gated reveal sits above elite-nodes @5
    descend();
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });

  it('never re-fires a tutorial already in seenTutorials', () => {
    primeSoul(1, ['grove']); // 1 -> 2 would cross grove, but it's already seen
    descend();
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });

  it('does NOT flood a migrated veteran with back-tutorials', () => {
    primeSoul(999); // 999 -> 1000 crosses no threshold (all are <= 999 already)
    descend();
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });

  it('dismissing the head marks it seen (persisted) and shifts the queue', () => {
    primeSoul(4); // 4 -> 5 crosses elite-nodes (@5)
    descend();
    expect(useScreenStore.getState().tutorialQueue).toEqual(['elite-nodes']);

    useGameStore.getState().dismissTutorial();
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
    expect(useMetaStore.getState().seenTutorials).toContain('elite-nodes');
  });

  it('a re-run after dismissal does not re-show the same card', () => {
    primeSoul(4);
    descend();
    useGameStore.getState().dismissTutorial();
    expect(useMetaStore.getState().seenTutorials).toContain('elite-nodes');

    // Reincarnate and descend again from the same threshold — already seen.
    useScreenStore.setState({ tutorialQueue: [] });
    useMetaStore.setState({ delveCount: 4 });
    descend();
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
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
