import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { computeAC, effectiveAbilityScores } from '../engine/character/derived';
import { LEGENDARY_ORDER, LEGENDARIES } from '../content/legendaries';
import { setActiveRoller } from '../engine/dice';
import type { DelveState } from '../types/delve';

function makeCharacter() {
  return buildPlayerCharacter(presetCreationInput('fighter'));
}

function baseDelve(overrides: Partial<DelveState> = {}): DelveState {
  return {
    dungeonName: 'Test Delve',
    chapterId: 'godwake',
    rooms: [
      { id: 'room-1', kind: 'combat', title: 'Cell', flavorText: '' },
      { id: 'room-2', kind: 'boss', title: 'Warden', flavorText: '' },
    ],
    currentRoomIdx: 0,
    roomsCleared: 0,
    goldEarned: 0,
    xpEarned: 0,
    phase: 'in-room',
    ...overrides,
  };
}

beforeEach(() => {
  // reincarnateSoul (fired by a clear) rerolls quirks off the active roller.
  setActiveRoller('legendary-test-seed');
  useCharacterStore.setState({ character: makeCharacter() });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  useMetaStore.setState({
    chaptersCleared: 0,
    chapter1Cleared: false,
    druidGroveUnlocked: false,
    ascensionUnlocked: 0,
    ownedLegendaries: [],
    activeLegendaries: [],
  });
});

describe('legendary grant', () => {
  it('grants the next un-owned relic in order', () => {
    const meta = useMetaStore.getState();
    expect(meta.grantNextLegendary()).toBe(LEGENDARY_ORDER[0]);
    expect(useMetaStore.getState().grantNextLegendary()).toBe(LEGENDARY_ORDER[1]);
    expect(useMetaStore.getState().ownedLegendaries).toEqual([
      LEGENDARY_ORDER[0],
      LEGENDARY_ORDER[1],
    ]);
  });

  it('is a no-op once the whole set is owned', () => {
    for (let i = 0; i < LEGENDARIES.length; i++) useMetaStore.getState().grantNextLegendary();
    expect(useMetaStore.getState().ownedLegendaries).toHaveLength(LEGENDARIES.length);
    expect(useMetaStore.getState().grantNextLegendary()).toBeNull();
    expect(useMetaStore.getState().ownedLegendaries).toHaveLength(LEGENDARIES.length);
  });

  it('finishDelve on a CLEAR no longer auto-grants a legendary (Wave 2: drops are rare, in-run)', () => {
    useDelveStore.setState({ delve: baseDelve({ phase: 'completed', currentRoomIdx: 1 }) });
    useDelveStore.getState().finishDelve();
    expect(useMetaStore.getState().ownedLegendaries).toEqual([]);
  });

  it('finishDelve on a FAILURE drops nothing', () => {
    useDelveStore.setState({ delve: baseDelve({ phase: 'failed', currentRoomIdx: 1 }) });
    useDelveStore.getState().finishDelve();
    expect(useMetaStore.getState().ownedLegendaries).toEqual([]);
  });
});

describe('legendary attunement', () => {
  it('rejects un-owned ids and clamps to the slot cap, baking the aggregate', () => {
    useMetaStore.setState({
      ownedLegendaries: ['heartwood-talisman', 'bulwark-sigil', 'gauntlets-of-the-titan'],
    });
    // Includes an un-owned id and exceeds the cap of 2.
    useMetaStore.getState().setActiveLegendaries([
      'heartwood-talisman',
      'gauntlets-of-the-titan',
      'bulwark-sigil',
      'sages-diadem',
    ]);
    const active = useMetaStore.getState().activeLegendaries;
    expect(active).toHaveLength(2);
    expect(active).not.toContain('sages-diadem');
    const ch = useCharacterStore.getState().character!;
    // Aggregate of the first two attuned: +2 STR and +2 CON.
    expect(ch.legendaryBonuses?.abilityScores).toEqual({ str: 2, con: 2 });
  });

  it('clears the baked aggregate when all relics are released', () => {
    useMetaStore.setState({ ownedLegendaries: ['bulwark-sigil'] });
    useMetaStore.getState().setActiveLegendaries(['bulwark-sigil']);
    expect(useCharacterStore.getState().character!.legendaryBonuses).toEqual({ ac: 1 });
    useMetaStore.getState().setActiveLegendaries([]);
    expect(useCharacterStore.getState().character!.legendaryBonuses).toEqual({});
  });
});

describe('legendary bonus application', () => {
  it('folds ability-score bonuses into effective scores', () => {
    const base = makeCharacter();
    const baseStr = effectiveAbilityScores(base).str;
    const withRelic = { ...base, legendaryBonuses: { abilityScores: { str: 2 } } };
    expect(effectiveAbilityScores(withRelic).str).toBe(baseStr + 2);
  });

  it('adds flat AC on top of the computed value', () => {
    const base = makeCharacter();
    const baseAC = computeAC(base);
    const withRelic = { ...base, legendaryBonuses: { ac: 1 } };
    expect(computeAC(withRelic)).toBe(baseAC + 1);
  });
});

describe('legendary persistence across reincarnation', () => {
  it('keeps owned relics and the baked bonus through a clear (which turns the wheel)', () => {
    useMetaStore.setState({ ownedLegendaries: ['heartwood-talisman'] });
    useMetaStore.getState().setActiveLegendaries(['heartwood-talisman']);
    expect(useCharacterStore.getState().character!.legendaryBonuses?.abilityScores).toEqual({
      con: 2,
    });

    useDelveStore.setState({ delve: baseDelve({ phase: 'completed', currentRoomIdx: 1 }) });
    useDelveStore.getState().finishDelve();

    const meta = useMetaStore.getState();
    // Survived the wheel (a clear no longer auto-grants the next relic in Wave 2).
    expect(meta.ownedLegendaries).toEqual(['heartwood-talisman']);
    // The attuned bonus rides reincarnateSoul's object spread.
    expect(useCharacterStore.getState().character!.legendaryBonuses?.abilityScores).toEqual({
      con: 2,
    });
  });
});
