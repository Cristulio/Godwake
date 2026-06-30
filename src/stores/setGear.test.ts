import { describe, it, expect, beforeEach } from 'vitest';
import { useDelveStore } from './delveStore';
import { useCharacterStore } from './characterStore';
import { useMetaStore } from './metaStore';
import { useCombatStore } from './combatStore';
import { useScreenStore } from './screenStore';
import { buildPlayerCharacter, presetCreationInput } from '../engine/character/defaultCharacter';
import { injectSetPieces, rollItem } from '../engine/items';
import { characterAffixMods } from '../engine/items/affixMods';
import { equipItem, slotForItem } from '../engine/character/equip';
import { getSetPiece, setForPiece, canEquipSetPiece } from '../content/sets';
import { getItem } from '../content/items';
import { setActiveRoller, getActiveRoller } from '../engine/dice';
import type { Character } from '../types/character';
import type { ItemRef } from '../schemas/item';
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

/** Equip the first backpack ref whose itemId matches. */
function equipById(ch: Character, id: string): Character {
  return equipItem(ch, ch.inventory.findIndex((r) => r.itemId === id));
}

beforeEach(() => {
  setActiveRoller('setgear-seed');
  useCharacterStore.setState({ character: buildPlayerCharacter(presetCreationInput('fighter')) });
  useDelveStore.setState({ delve: null });
  useCombatStore.setState({ combat: null });
  useScreenStore.setState({ tutorialQueue: [], hubUnlockQueue: [] });
  useMetaStore.setState({ unlockedSets: [] });
});

describe('injectSetPieces (real backpack loot)', () => {
  it('adds the piece to the pack (not equipped) stamped set-rarity + setId', () => {
    const fresh = buildPlayerCharacter(presetCreationInput('fighter'));
    const out = injectSetPieces(fresh, [getSetPiece('ironclad-greaves')!]);
    const ref = out.inventory.find((r) => r.itemId === 'ironclad-greaves');
    expect(ref?.rolled?.rarity).toBe('set');
    expect(ref?.rolled?.setId).toBe('ironclad');
    expect(ref?.rolled?.enhancement).toBe(getSetPiece('ironclad-greaves')!.enhancement);
    // Injected into the pack only — never auto-equipped.
    expect(out.equipped.armor?.itemId).not.toBe('ironclad-greaves');
  });
});

describe('set gear equips and its bonuses fold live', () => {
  it('equipping a piece replaces the slot and a 2-piece bonus stacks on top', () => {
    let ch = injectSetPieces(buildPlayerCharacter(presetCreationInput('fighter')), [
      getSetPiece('vigil-helm')!, // helm, 4 temp HP
      getSetPiece('vigil-heart')!, // ring, 5% lifesteal
    ]);
    ch = equipById(ch, 'vigil-helm');
    ch = equipById(ch, 'vigil-heart');
    expect(ch.equipped.helm?.itemId).toBe('vigil-helm');
    expect(ch.equipped.helm?.rolled?.rarity).toBe('set');
    const mods = characterAffixMods(ch);
    expect(mods.tempHpPerCombat).toBe(8); // helm 4 + 2-piece 4
    expect(mods.lifestealPct).toBe(5);
  });

  it('blocks a class-bound piece on the wrong class', () => {
    const ch = injectSetPieces(buildPlayerCharacter(presetCreationInput('wizard')), [
      getSetPiece('warsong-crest')!, // fighter-bound
    ]);
    const idx = ch.inventory.findIndex((r) => r.itemId === 'warsong-crest');
    expect(equipItem(ch, idx)).toBe(ch);
  });
});

describe('set gear is run-scoped; only the set UNLOCK persists', () => {
  it('a found set piece is wiped on the next descent (reset to the class kit)', () => {
    // A piece found into the run pack (the drop / buy path materialises it here).
    const seeded = injectSetPieces(buildPlayerCharacter(presetCreationInput('fighter')), [
      getSetPiece('vigil-heart')!,
    ]);
    useCharacterStore.setState({ character: seeded });
    expect(seeded.inventory.some((r) => r.itemId === 'vigil-heart')).toBe(true);

    // A fresh descent rebuilds the kit — set pieces no longer re-inject.
    useDelveStore.getState().startDelve(godwakeDelve());
    const ch = useCharacterStore.getState().character!;
    expect(ch.inventory.some((r) => r.itemId === 'vigil-heart')).toBe(false);
    // Kit restored: a fighter descends with the longsword.
    expect(ch.inventory.some((r) => r.itemId === 'longsword')).toBe(true);
  });

  it('finding a set piece permanently unlocks its set (survives the wheel)', () => {
    const pieceId = useMetaStore.getState().grantSetPieceDrop(false);
    expect(pieceId).not.toBeNull();
    const set = setForPiece(pieceId!);
    expect(set).toBeDefined();
    expect(useMetaStore.getState().unlockedSets).toContain(set!.id);

    // The unlock persists across a descent (the piece does not).
    useDelveStore.getState().startDelve(godwakeDelve());
    expect(useMetaStore.getState().unlockedSets).toContain(set!.id);
  });

  it('only drops a piece the worn class can equip', () => {
    useCharacterStore.setState({ character: buildPlayerCharacter(presetCreationInput('wizard')) });
    const pieceId = useMetaStore.getState().grantSetPieceDrop(false);
    expect(pieceId).not.toBeNull();
    expect(canEquipSetPiece(pieceId!, 'wizard')).toBe(true);
  });

  it('a set piece can be sold from the pack (run-scoped loot now)', () => {
    const seeded = injectSetPieces(buildPlayerCharacter(presetCreationInput('fighter')), [
      getSetPiece('vigil-heart')!,
    ]);
    useCharacterStore.setState({ character: seeded });
    const idx = seeded.inventory.findIndex((r) => r.itemId === 'vigil-heart');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(useDelveStore.getState().sellItem(idx).ok).toBe(true);
    expect(
      useCharacterStore.getState().character!.inventory.some((r) => r.itemId === 'vigil-heart'),
    ).toBe(false);
  });
});

describe('orbs are caster off-hands', () => {
  it('slot into the off-hand', () => {
    expect(slotForItem('crystal-orb')).toBe('offHand');
  });

  it('a caster can equip an orb; a martial cannot', () => {
    const orb: ItemRef = { itemId: 'crystal-orb' };
    const wiz = buildPlayerCharacter(presetCreationInput('wizard'));
    const wizWith = { ...wiz, inventory: [...wiz.inventory, orb] };
    const wizAfter = equipItem(wizWith, wizWith.inventory.length - 1);
    expect(wizAfter.equipped.offHand?.itemId).toBe('crystal-orb');

    const ftr = buildPlayerCharacter(presetCreationInput('fighter'));
    const ftrWith = { ...ftr, inventory: [...ftr.inventory, orb] };
    expect(equipItem(ftrWith, ftrWith.inventory.length - 1)).toBe(ftrWith); // blocked
  });

  it('equipping an orb clears a two-handed main hand (mirrors a shield)', () => {
    const wiz = buildPlayerCharacter(presetCreationInput('wizard'));
    const twoHander: ItemRef = { itemId: 'greatsword' }; // two-handed
    const orb: ItemRef = { itemId: 'crystal-orb' };
    const staged = {
      ...wiz,
      equipped: { ...wiz.equipped, mainHand: twoHander },
      inventory: [...wiz.inventory, orb],
    };
    const after = equipItem(staged, staged.inventory.length - 1);
    expect(after.equipped.offHand?.itemId).toBe('crystal-orb');
    expect(after.equipped.mainHand).toBeNull();
  });
});

describe('shields roll the full rarity range', () => {
  it('a shield base can roll an epic (purple) with the full affix budget', () => {
    setActiveRoller('shield-roll-seed');
    let sawPurpleShield = false;
    for (let i = 0; i < 400 && !sawPurpleShield; i++) {
      const ref = rollItem(getActiveRoller(), {
        rarity: 'purple',
        classId: 'fighter',
        kind: 'armor',
        depth: 8,
      });
      const base = getItem(ref.itemId);
      if (base.kind === 'armor' && base.category === 'shield') {
        sawPurpleShield = true;
        // Purple = 3 affixes; the shield is no longer capped below that.
        expect(ref.rolled?.affixes.length).toBe(3);
      }
    }
    expect(sawPurpleShield).toBe(true);
  });
});
