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
    renownSpent: 0,
    ownedLegendaries: [],
    equippedRelics: {},
  });
});

describe('relic loadout — one relic per typed slot', () => {
  it('seats owned relics in their slots, ignores un-owned, and bakes the summed effects', () => {
    useMetaStore.setState({
      ownedLegendaries: ['heartwood-talisman', 'bulwark-sigil', 'cloak-of-the-nightwind'],
    });
    const meta = useMetaStore.getState();
    meta.equipRelic('heartwood-talisman'); // Vampire (a starting slot)
    meta.equipRelic('bulwark-sigil'); // Aegis (a starting slot)
    meta.equipRelic('cloak-of-the-nightwind'); // Precision (a starting slot)
    meta.equipRelic('sages-diadem'); // un-owned → ignored
    const eq = useMetaStore.getState().equippedRelics;
    expect(eq.vampire).toBe('heartwood-talisman');
    expect(eq.aegis).toBe('bulwark-sigil');
    expect(eq.precision).toBe('cloak-of-the-nightwind');
    expect(Object.keys(eq)).toHaveLength(3);
    expect(eq.spellfocus).toBeUndefined();
    // Effects flow through the shared affix pipeline.
    const mods = characterAffixMods(useCharacterStore.getState().character!);
    expect(mods.lifestealPct).toBe(6);
    expect(mods.tempHpPerCombat).toBe(8);
    expect(mods.critRangeBonus).toBe(1);
  });

  it('holds at most one relic per slot — a second of the same slot replaces the first', () => {
    // heartwood-talisman and hunters-eye both seat in the Vampire slot.
    useMetaStore.setState({ ownedLegendaries: ['heartwood-talisman', 'hunters-eye'] });
    const meta = useMetaStore.getState();
    meta.equipRelic('heartwood-talisman');
    expect(useMetaStore.getState().equippedRelics.vampire).toBe('heartwood-talisman');
    meta.equipRelic('hunters-eye');
    const eq = useMetaStore.getState().equippedRelics;
    expect(eq.vampire).toBe('hunters-eye'); // replaced, not stacked
    expect(Object.keys(eq)).toHaveLength(1);
    // Only the survivor's lifesteal is baked (4, not 6 + 4).
    const mods = characterAffixMods(useCharacterStore.getState().character!);
    expect(mods.lifestealPct).toBe(4);
  });

  it('clears the baked effects when the slot is unbound', () => {
    useMetaStore.setState({ ownedLegendaries: ['bulwark-sigil'] });
    useMetaStore.getState().equipRelic('bulwark-sigil');
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(1);
    useMetaStore.getState().unequipRelicSlot('aegis');
    expect(useCharacterStore.getState().character!.legendaryEffects).toEqual([]);
    expect(useMetaStore.getState().equippedRelics).toEqual({});
  });

  it('refuses to seat a relic whose slot has not unlocked yet', () => {
    // gauntlets-of-the-titan seats in Rend (slot 4), sealed until 100 renown spent.
    useMetaStore.setState({ ownedLegendaries: ['gauntlets-of-the-titan'], renownSpent: 0 });
    useMetaStore.getState().equipRelic('gauntlets-of-the-titan');
    expect(useMetaStore.getState().equippedRelics.rend).toBeUndefined();
    // Lay the tribute and the slot opens.
    useMetaStore.setState({ renownSpent: 100 });
    useMetaStore.getState().equipRelic('gauntlets-of-the-titan');
    expect(useMetaStore.getState().equippedRelics.rend).toBe('gauntlets-of-the-titan');
  });

  it('refuses to seat a class-bound relic for the wrong class (kept owned, just stashed)', () => {
    useCharacterStore.setState({ character: makeCharacter('wizard') });
    useMetaStore.setState({
      ownedLegendaries: ['warsong-gauntlet', 'bulwark-sigil'],
      renownSpent: 1500, // every slot open
    });
    const meta = useMetaStore.getState();
    meta.equipRelic('warsong-gauntlet'); // Fighter-bound → ignored for a Wizard
    meta.equipRelic('bulwark-sigil'); // agnostic → seats
    const eq = useMetaStore.getState().equippedRelics;
    expect(eq.aegis).toBe('bulwark-sigil');
    expect(eq.cascade).toBeUndefined();
    expect(useMetaStore.getState().ownedLegendaries).toContain('warsong-gauntlet');
  });

  it('seats a class-bound relic for the right class', () => {
    useCharacterStore.setState({ character: makeCharacter('fighter') });
    useMetaStore.setState({ ownedLegendaries: ['warsong-gauntlet'], renownSpent: 1500 });
    useMetaStore.getState().equipRelic('warsong-gauntlet'); // Cascade slot
    expect(useMetaStore.getState().equippedRelics.cascade).toBe('warsong-gauntlet');
  });
});

describe('legendary effects apply through the affix pipeline', () => {
  it('a 2-piece set (pieces in distinct slots) stacks its bonus on top of the pieces', () => {
    // Sets unlock at game completion (chaptersCleared 14). Two Vigil pieces in
    // DISTINCT slots: helm (Aegis) + heart (Vampire), both open from the start.
    useMetaStore.setState({
      ownedLegendaries: ['vigil-helm', 'vigil-heart'],
      delveCount: 999,
      chaptersCleared: 14,
    });
    const meta = useMetaStore.getState();
    meta.equipRelic('vigil-helm'); // Aegis, 4 temp HP
    meta.equipRelic('vigil-heart'); // Vampire, 5% lifesteal
    const mods = characterAffixMods(useCharacterStore.getState().character!);
    // helm 4 + 2-piece set 4 = 8 temp HP each combat; heart's lifesteal rides too.
    expect(mods.tempHpPerCombat).toBe(8);
    expect(mods.lifestealPct).toBe(5);
  });
});

describe('legendary persistence across reincarnation', () => {
  it('keeps owned relics, the loadout, and the baked effects through a clear (the wheel)', () => {
    useMetaStore.setState({ ownedLegendaries: ['heartwood-talisman'] });
    useMetaStore.getState().equipRelic('heartwood-talisman'); // Vampire slot
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(1);

    useDelveStore.setState({ delve: baseDelve({ phase: 'completed', currentRoomIdx: 1 }) });
    useDelveStore.getState().finishDelve();

    // Survived the wheel; the loadout + baked effects ride reincarnateSoul's spread.
    expect(useMetaStore.getState().ownedLegendaries).toEqual(['heartwood-talisman']);
    expect(useMetaStore.getState().equippedRelics.vampire).toBe('heartwood-talisman');
    expect(useCharacterStore.getState().character!.legendaryEffects).toHaveLength(1);
  });
});
