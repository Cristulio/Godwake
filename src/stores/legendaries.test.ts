import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { characterAffixMods } from '../engine/items/affixMods';
import { setActiveRoller } from '../engine/dice';
import type { ClassId } from '../schemas/ids';
import type { DelveState } from '../types/delve';

function makeCharacter(classId: ClassId = 'fighter') {
  return buildPlayerCharacter(presetCreationInput(classId));
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

describe('legendary equip (effect-only, no slot cap)', () => {
  it('rejects un-owned ids and bakes the owned effect payloads with no cap', () => {
    useMetaStore.setState({
      ownedLegendaries: ['heartwood-talisman', 'bulwark-sigil', 'cloak-of-the-nightwind'],
    });
    useMetaStore.getState().setActiveLegendaries([
      'heartwood-talisman',
      'bulwark-sigil',
      'cloak-of-the-nightwind',
      'sages-diadem', // un-owned — dropped
    ]);
    const active = useMetaStore.getState().activeLegendaries;
    expect(active).toHaveLength(3); // no slot cap
    expect(active).not.toContain('sages-diadem');
    // Effects flow through the shared affix pipeline.
    const mods = characterAffixMods(useCharacterStore.getState().character!);
    expect(mods.lifestealPct).toBe(12);
    expect(mods.tempHpPerCombat).toBe(8);
    expect(mods.critRangeBonus).toBe(1);
  });

  it('clears the baked effects when all relics are released', () => {
    useMetaStore.setState({ ownedLegendaries: ['bulwark-sigil'] });
    useMetaStore.getState().setActiveLegendaries(['bulwark-sigil']);
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(1);
    useMetaStore.getState().setActiveLegendaries([]);
    expect(useCharacterStore.getState().character!.legendaryEffects).toEqual([]);
  });

  it('refuses to equip a class-bound relic for the wrong class', () => {
    useCharacterStore.setState({ character: makeCharacter('wizard') });
    useMetaStore.setState({ ownedLegendaries: ['warsong-gauntlet', 'bulwark-sigil'] });
    useMetaStore.getState().setActiveLegendaries(['warsong-gauntlet', 'bulwark-sigil']);
    const active = useMetaStore.getState().activeLegendaries;
    expect(active).toContain('bulwark-sigil');
    expect(active).not.toContain('warsong-gauntlet');
  });

  it('equips a class-bound relic for the right class', () => {
    useCharacterStore.setState({ character: makeCharacter('fighter') });
    useMetaStore.setState({ ownedLegendaries: ['warsong-gauntlet'] });
    useMetaStore.getState().setActiveLegendaries(['warsong-gauntlet']);
    expect(useMetaStore.getState().activeLegendaries).toEqual(['warsong-gauntlet']);
  });
});

describe('legendary effects apply through the affix pipeline', () => {
  it('a completed 2-piece set stacks its bonus on top of the pieces', () => {
    useMetaStore.setState({ ownedLegendaries: ['vigil-helm', 'vigil-mantle'], delveCount: 999 });
    useMetaStore.getState().setActiveLegendaries(['vigil-helm', 'vigil-mantle']);
    const mods = characterAffixMods(useCharacterStore.getState().character!);
    // helm 4 + mantle 4 + 2-piece set 4 = 12 temp HP each combat.
    expect(mods.tempHpPerCombat).toBe(12);
  });
});

describe('legendary persistence across reincarnation', () => {
  it('keeps owned relics and the baked effects through a clear (which turns the wheel)', () => {
    useMetaStore.setState({ ownedLegendaries: ['heartwood-talisman'] });
    useMetaStore.getState().setActiveLegendaries(['heartwood-talisman']);
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(1);

    useDelveStore.setState({ delve: baseDelve({ phase: 'completed', currentRoomIdx: 1 }) });
    useDelveStore.getState().finishDelve();

    // Survived the wheel; the baked effects ride reincarnateSoul's object spread.
    expect(useMetaStore.getState().ownedLegendaries).toEqual(['heartwood-talisman']);
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(1);
  });
});
