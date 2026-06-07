import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { useCharacterStore } from './characterStore';
import { useDelveStore } from './delveStore';
import { useCombatStore } from './combatStore';
import { createCharacter, STANDARD_ARRAY } from '../engine/character/initialize';
import { createGodwakeDelve } from '../engine/delve';
import type { Character } from '../types/character';

function makeFighter(): Character {
  return createCharacter({
    id: 'risk-store-tester',
    name: 'Pilgrim',
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

function reset() {
  useCharacterStore.setState({ character: makeFighter(), saveSeed: null });
  useDelveStore.setState({ delve: createGodwakeDelve(1) });
  useCombatStore.setState({ combat: null });
}

describe('camp risk (throw the bones) — delve store', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null, saveSeed: null });
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });
  });

  it('records the throw outcome on the delve', () => {
    reset();
    const result = useGameStore.getState().resolveCampRisk(1);
    expect(result).not.toBeNull();
    expect(useDelveStore.getState().delve!.campRisk).toEqual(result);
  });

  it('cannot throw twice at the same camp (the backpack exploit)', () => {
    reset();
    const first = useGameStore.getState().resolveCampRisk(1);
    const firstResult = useDelveStore.getState().delve!.campRisk;
    // A second throw — as if the player opened the pack and returned — no-ops
    // and leaves the recorded outcome untouched.
    const second = useGameStore.getState().resolveCampRisk(1);
    expect(second).toBeNull();
    expect(useDelveStore.getState().delve!.campRisk).toEqual(firstResult);
    expect(firstResult).toEqual(first);
  });

  it('clears the gate on entering the next room so the next camp throws fresh', () => {
    reset();
    useGameStore.getState().resolveCampRisk(1);
    expect(useDelveStore.getState().delve!.campRisk).not.toBeUndefined();

    const delve = useDelveStore.getState().delve!;
    const next = delve.rooms[delve.currentRoomIdx]?.next?.[0];
    expect(next).toBeTruthy();
    useDelveStore.getState().chooseRoom(next!);

    expect(useDelveStore.getState().delve!.campRisk).toBeUndefined();
  });
});
