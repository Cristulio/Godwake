import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useScreenStore } from './screenStore';
import { useGameStore } from './gameStore';
import { FIRST_GEAR_TUTORIAL_ID } from '../content/tutorials';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import type { Character } from '../types/character';

function makeFighter(): Character {
  return createCharacter({
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
  });
}

/** A merchant buy is the simplest inventory-add path to exercise the trigger. */
function buyGear(itemId: string) {
  return useGameStore.getState().purchaseFromMerchant(itemId);
}

describe('first-gear tutorial trigger', () => {
  beforeEach(() => {
    useScreenStore.setState({ tutorialQueue: [] });
    useMetaStore.setState({ seenTutorials: [] });
    useCharacterStore.setState({
      character: { ...makeFighter(), goldInPocket: 1000 },
      saveSeed: null,
    });
    useDelveStore.getState().setDelve(null);
  });

  it('enqueues the first-gear card the first time gear enters the pack', () => {
    const res = buyGear('shortsword');
    expect(res.ok).toBe(true);
    expect(useScreenStore.getState().tutorialQueue).toEqual([FIRST_GEAR_TUTORIAL_ID]);
  });

  it('does not enqueue a duplicate while the card is still queued', () => {
    buyGear('shortsword');
    buyGear('shortsword');
    expect(useScreenStore.getState().tutorialQueue).toEqual([FIRST_GEAR_TUTORIAL_ID]);
  });

  it('never re-fires once the card has been seen', () => {
    buyGear('shortsword');
    // Dismissing the head marks it seen (persisted across runs).
    useGameStore.getState().dismissTutorial();
    expect(useMetaStore.getState().seenTutorials).toContain(FIRST_GEAR_TUTORIAL_ID);
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);

    // A later pickup does not re-show it.
    buyGear('shortsword');
    expect(useScreenStore.getState().tutorialQueue).toEqual([]);
  });
});
