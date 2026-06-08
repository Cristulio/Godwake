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
import { getSetPiece } from '../content/sets';
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
  useMetaStore.setState({ ownedSetPieces: [] });
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

describe('set gear persists in the backpack across the wheel', () => {
  it('a banked piece is re-injected into the pack on every descent', () => {
    useMetaStore.setState({ ownedSetPieces: ['vigil-heart'] });
    useDelveStore.getState().startDelve(godwakeDelve());
    let ch = useCharacterStore.getState().character!;
    expect(ch.inventory.some((r) => r.itemId === 'vigil-heart')).toBe(true);

    // A fresh descent rebuilds the kit; the banked piece re-appears in the pack.
    useDelveStore.getState().startDelve(godwakeDelve());
    ch = useCharacterStore.getState().character!;
    expect(ch.inventory.some((r) => r.itemId === 'vigil-heart')).toBe(true);
    expect(useMetaStore.getState().ownedSetPieces).toContain('vigil-heart');
  });

  it('only injects pieces the worn class can equip', () => {
    useMetaStore.setState({ ownedSetPieces: ['warsong-crest', 'vigil-heart'] });
    // Worn class is a wizard — the fighter-bound warsong piece stays banked but
    // out of the pack; the universal vigil piece surfaces.
    useCharacterStore.setState({ character: buildPlayerCharacter(presetCreationInput('wizard')) });
    useDelveStore.getState().startDelve(godwakeDelve());
    const ch = useCharacterStore.getState().character!;
    expect(ch.inventory.some((r) => r.itemId === 'warsong-crest')).toBe(false);
    expect(ch.inventory.some((r) => r.itemId === 'vigil-heart')).toBe(true);
  });

  it('cannot be sold out of the pack mid-run', () => {
    useMetaStore.setState({ ownedSetPieces: ['vigil-heart'] });
    useDelveStore.getState().startDelve(godwakeDelve());
    const ch = useCharacterStore.getState().character!;
    const idx = ch.inventory.findIndex((r) => r.itemId === 'vigil-heart');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(useDelveStore.getState().sellItem(idx).ok).toBe(false);
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
