import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { useScreenStore } from './screenStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { materializeSetGear } from '../engine/items';
import { getSetPiece } from '../content/sets';
import { setActiveRoller } from '../engine/dice';
import type { DelveState } from '../types/delve';

function godwakeDelve(): DelveState {
  return {
    dungeonName: 'Test',
    chapterId: 'godwake',
    rooms: [{ id: 'r1', kind: 'combat', title: 'Cell', flavorText: '' }],
    currentRoomIdx: 0,
    roomsCleared: 0,
    goldEarned: 0,
    xpEarned: 0,
    phase: 'in-room',
  };
}

beforeEach(() => {
  setActiveRoller('setgear-seed');
  useCharacterStore.setState({ character: buildPlayerCharacter(presetCreationInput('fighter')) });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  useScreenStore.setState({ tutorialQueue: [], hubUnlockQueue: [] });
  useMetaStore.setState({ ownedSetPieces: [], equippedSetPieces: {} });
});

describe('materializeSetGear (pure overlay)', () => {
  it('replaces the slot item with the set piece and stamps it set-rarity', () => {
    const fresh = buildPlayerCharacter(presetCreationInput('fighter'));
    const armorPiece = getSetPiece('ironclad-greaves')!; // armor slot
    const out = materializeSetGear(fresh, [armorPiece]);
    expect(out.equipped.armor?.itemId).toBe('ironclad-greaves');
    expect(out.equipped.armor?.rolled?.rarity).toBe('set');
    expect(out.equipped.armor?.rolled?.enhancement).toBe(armorPiece.enhancement);
    // The piece also lands in the pack so the inventory + sell guard see it worn.
    expect(out.inventory.some((r) => r.itemId === 'ironclad-greaves')).toBe(true);
  });
});

describe('set gear persists into and across runs', () => {
  it('an equipped set piece materialises into the slot on descent', () => {
    useMetaStore.setState({ ownedSetPieces: ['ironclad-greaves'] });
    useMetaStore.getState().equipSetPiece('ironclad-greaves');
    // Bake check: the effect payload rode onto the soul.
    expect(useCharacterStore.getState().character!.setEffects?.length).toBeGreaterThan(0);

    useDelveStore.getState().startDelve(godwakeDelve());
    const ch = useCharacterStore.getState().character!;
    expect(ch.equipped.armor?.itemId).toBe('ironclad-greaves');
    expect(ch.equipped.armor?.rolled?.rarity).toBe('set');
  });

  it('survives the wheel — still equipped after the run resets the kit', () => {
    useMetaStore.setState({ ownedSetPieces: ['vigil-heart'] });
    useMetaStore.getState().equipSetPiece('vigil-heart'); // ring
    useDelveStore.getState().startDelve(godwakeDelve());
    expect(useCharacterStore.getState().character!.equipped.ring1?.itemId).toBe('vigil-heart');

    // A fresh descent re-runs gearResetToKit; the banked piece re-materialises.
    useDelveStore.getState().startDelve(godwakeDelve());
    expect(useCharacterStore.getState().character!.equipped.ring1?.itemId).toBe('vigil-heart');
    // Still banked + equipped at the loadout level.
    expect(useMetaStore.getState().ownedSetPieces).toContain('vigil-heart');
    expect(useMetaStore.getState().equippedSetPieces.ring1).toBe('vigil-heart');
  });

  it('set gear cannot be sold out of the pack mid-run', () => {
    useMetaStore.setState({ ownedSetPieces: ['vigil-heart'] });
    useMetaStore.getState().equipSetPiece('vigil-heart');
    useDelveStore.getState().startDelve(godwakeDelve());
    const ch = useCharacterStore.getState().character!;
    const idx = ch.inventory.findIndex((r) => r.itemId === 'vigil-heart');
    expect(idx).toBeGreaterThanOrEqual(0);
    const res = useDelveStore.getState().sellItem(idx);
    expect(res.ok).toBe(false);
  });
});
