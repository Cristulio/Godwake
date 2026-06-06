import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, SAVE_SLOT_KEY_PREFIX } from './gameStore';
import { SAVE_VERSION } from './persistMigration';
import { useCharacterStore } from './characterStore';
import { useDelveStore } from './delveStore';
import { useCombatStore } from './combatStore';
import { useScreenStore } from './screenStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { createGodwakeDelve } from '../engine/delve';
import { createCombat } from '../engine/combat';
import { getMonster } from '../content/monsters';
import {
  setActiveRoller,
  getActiveRoller,
  createDiceRoller,
  createDiceRollerFromState,
} from '../engine/dice';
import type { Character } from '../types/character';
import type { CombatState } from '../types/combat';
import type { DelveState } from '../types/delve';

const SLOT = 1 as const;
const slotKey = `${SAVE_SLOT_KEY_PREFIX}${SLOT}`;

function makeFighter(extra: Partial<Character> = {}): Character {
  return { ...buildPlayerCharacter(presetCreationInput('fighter')), ...extra };
}

/** A mid-fight combat: a fighter against a goblin, a few rounds in. */
function midFightCombat(character: Character): CombatState {
  const { state } = createCombat({
    character,
    monsters: [{ def: getMonster('goblin') }],
  });
  return { ...state, round: 3, currentTurnIndex: 1, playerHasAttacked: true };
}

function resetAll() {
  setActiveRoller('baseline-seed');
  useCharacterStore.setState({ character: null, saveSeed: null });
  useDelveStore.setState({
    delve: null,
    lastLoot: null,
    pendingSpoilsRoom: null,
    purchasedShopKeys: {},
  });
  useCombatStore.setState({ combat: null });
  useScreenStore.setState({
    screen: 'title',
    introSeen: false,
    quirksTutorialSeen: false,
    taunt: null,
    tauntQueue: [],
    tutorialQueue: [],
    hubUnlockQueue: [],
    pendingDescent: false,
    postmortem: null,
  });
  localStorage.clear();
}

beforeEach(resetAll);

describe('run persistence — an active run survives a reload (round-trip)', () => {
  it('restores delve + combat + screen and resumes the exact dice cursor', () => {
    const character = makeFighter({ renown: 100 });
    const delve: DelveState = { ...createGodwakeDelve(1), currentRoomIdx: 2, phase: 'in-room' };
    const combat = midFightCombat(character);

    useCharacterStore.setState({ character, saveSeed: 'run-seed' });
    useDelveStore.setState({ delve, purchasedShopKeys: { 'shop-1': ['gear-0'] } });
    useCombatStore.setState({ combat });
    useScreenStore.setState({ screen: 'delve' });

    // Advance the live roller so the saved cursor is well past run-start.
    const roller = getActiveRoller();
    roller.roll('2d6');
    roller.d20();
    roller.roll('1d8');
    const cursorAtSave = getActiveRoller().serialize().state;

    useGameStore.getState().saveToSlot(SLOT);

    // Wipe the run and re-seed the roller, as a fresh page load would.
    useDelveStore.setState({ delve: null, purchasedShopKeys: {} });
    useCombatStore.setState({ combat: null });
    useScreenStore.setState({ screen: 'hub' });
    setActiveRoller('a-totally-different-seed');

    const res = useGameStore.getState().loadFromSlot(SLOT);
    expect(res.ok).toBe(true);

    const restoredDelve = useDelveStore.getState().delve!;
    expect(restoredDelve).not.toBeNull();
    expect(restoredDelve.currentRoomIdx).toBe(2);
    expect(restoredDelve.phase).toBe('in-room');
    expect(restoredDelve.rooms.length).toBe(delve.rooms.length);
    expect(useDelveStore.getState().purchasedShopKeys).toEqual({ 'shop-1': ['gear-0'] });

    const restoredCombat = useCombatStore.getState().combat!;
    expect(restoredCombat).not.toBeNull();
    expect(restoredCombat.round).toBe(3);
    expect(restoredCombat.currentTurnIndex).toBe(1);
    expect(restoredCombat.status).toBe('active');
    expect(restoredCombat.turnOrder).toEqual(combat.turnOrder);
    expect(restoredCombat.combatants.length).toBe(combat.combatants.length);

    expect(useScreenStore.getState().screen).toBe('delve');

    // The cursor resumed where it was saved — NOT re-seeded to run-start.
    expect(getActiveRoller().serialize().state).toBe(cursorAtSave);
    expect(getActiveRoller().serialize().state).not.toBe(
      createDiceRoller('run-seed').serialize().state,
    );
    const control = createDiceRollerFromState({ state: cursorAtSave });
    expect(getActiveRoller().roll('1d20').total).toBe(control.roll('1d20').total);
  });

  it('restores a spoils screen with its loot summary', () => {
    const character = makeFighter();
    const delve: DelveState = { ...createGodwakeDelve(2), currentRoomIdx: 1, phase: 'in-room' };
    useCharacterStore.setState({ character, saveSeed: 'spoils-seed' });
    useDelveStore.setState({
      delve,
      lastLoot: { gold: 42, xp: 17, items: [], renown: 6 },
    });
    useScreenStore.setState({ screen: 'spoils' });

    useGameStore.getState().saveToSlot(SLOT);
    useDelveStore.setState({ delve: null, lastLoot: null });
    useScreenStore.setState({ screen: 'hub' });

    useGameStore.getState().loadFromSlot(SLOT);

    expect(useScreenStore.getState().screen).toBe('spoils');
    expect(useDelveStore.getState().delve).not.toBeNull();
    expect(useDelveStore.getState().lastLoot).toEqual({ gold: 42, xp: 17, items: [], renown: 6 });
  });

  it('restores a mid-run level-up screen with the delve intact underneath', () => {
    const character = makeFighter();
    const delve: DelveState = { ...createGodwakeDelve(3), currentRoomIdx: 4, phase: 'in-room' };
    useCharacterStore.setState({ character, saveSeed: 'levelup-seed' });
    useDelveStore.setState({ delve });
    useScreenStore.setState({ screen: 'level-up' });

    useGameStore.getState().saveToSlot(SLOT);
    useDelveStore.setState({ delve: null });
    useScreenStore.setState({ screen: 'hub' });

    useGameStore.getState().loadFromSlot(SLOT);

    expect(useScreenStore.getState().screen).toBe('level-up');
    expect(useDelveStore.getState().delve?.currentRoomIdx).toBe(4);
  });
});

describe('run persistence — back-compat with hub saves (no run fields)', () => {
  it('a v18 hub save with no delve/combat/rollerState lands at the hub, no run, roller from saveSeed', () => {
    localStorage.setItem(
      slotKey,
      JSON.stringify({
        version: 18,
        state: {
          screen: 'hub',
          saveSeed: 'veteran-seed',
          character: makeFighter({ renown: 500 }),
          introSeen: true,
          chaptersCleared: 4,
        },
      }),
    );

    setActiveRoller('scratch');
    const res = useGameStore.getState().loadFromSlot(SLOT);
    expect(res.ok).toBe(true);

    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useDelveStore.getState().delve).toBeNull();
    expect(useCombatStore.getState().combat).toBeNull();
    expect(getActiveRoller().serialize().state).toBe(
      createDiceRoller('veteran-seed').serialize().state,
    );
  });
});

describe('run persistence — defensive resume on a malformed run', () => {
  it('drops a structurally invalid combat to null but keeps a valid delve', () => {
    const character = makeFighter();
    const delve: DelveState = { ...createGodwakeDelve(4), currentRoomIdx: 0, phase: 'in-room' };
    const brokenCombat = { ...midFightCombat(character), turnOrder: [] };

    useCharacterStore.setState({ character, saveSeed: 'broken-seed' });
    useDelveStore.setState({ delve });
    useCombatStore.setState({ combat: brokenCombat });
    useScreenStore.setState({ screen: 'delve' });

    useGameStore.getState().saveToSlot(SLOT);
    useDelveStore.setState({ delve: null });
    useCombatStore.setState({ combat: null });

    useGameStore.getState().loadFromSlot(SLOT);

    expect(useDelveStore.getState().delve).not.toBeNull();
    expect(useCombatStore.getState().combat).toBeNull();
    expect(useScreenStore.getState().screen).toBe('delve');
  });

  it('falls back to a clean hub when a combat has no character underneath', () => {
    const character = makeFighter();
    const delve: DelveState = { ...createGodwakeDelve(5), currentRoomIdx: 0, phase: 'in-room' };
    const combat = midFightCombat(character);

    // Seed a slot whose combat is valid but whose character is gone — incoherent.
    localStorage.setItem(
      slotKey,
      JSON.stringify({
        version: SAVE_VERSION,
        state: { screen: 'delve', saveSeed: 'orphan-seed', character: null, delve, combat },
      }),
    );

    useGameStore.getState().loadFromSlot(SLOT);

    expect(useScreenStore.getState().screen).toBe('hub');
    expect(useDelveStore.getState().delve).toBeNull();
    expect(useCombatStore.getState().combat).toBeNull();
  });
});
