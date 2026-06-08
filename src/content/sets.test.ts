import { describe, it, expect } from 'vitest';
import {
  GEAR_SETS,
  SET_PIECES,
  SET_PIECE_ORDER,
  getSetPiece,
  getGearSet,
  setForPiece,
  canEquipSetPiece,
  setPieceDropPool,
  computeSetBonuses,
  aggregateSetEffects,
  setProgress,
} from './sets';
import { getItem } from './items';
import { slotForItem, EQUIP_SLOTS } from '../engine/character/equip';

describe('set gear — pieces & bases', () => {
  it('every set piece is a real, equippable base item whose slot matches its declared slot', () => {
    for (const piece of SET_PIECES) {
      const item = getItem(piece.id); // throws if the base is unregistered
      const slot = slotForItem(piece.id);
      expect(slot, `${piece.id} has no equip slot`).not.toBeNull();
      // Rings declare ring1 canonically but slotForItem also reports ring1.
      expect(EQUIP_SLOTS).toContain(piece.slot);
      expect(slot).toBe(piece.slot === 'ring2' ? 'ring1' : piece.slot);
      expect(item.kind === 'weapon' || item.kind === 'armor' || item.kind === 'accessory').toBe(true);
    }
  });

  it('has a stable, duplicate-free piece-id list', () => {
    expect(SET_PIECE_ORDER).toEqual(SET_PIECES.map((p) => p.id));
    expect(new Set(SET_PIECE_ORDER).size).toBe(SET_PIECE_ORDER.length);
  });

  it('every piece belongs to a real set, and every set piece resolves back', () => {
    for (const set of GEAR_SETS) {
      expect(set.pieceIds.length).toBeGreaterThanOrEqual(2);
      for (const pid of set.pieceIds) {
        const piece = getSetPiece(pid);
        expect(piece, `${pid} is not a real set piece`).toBeDefined();
        expect(piece!.setId).toBe(set.id);
        expect(setForPiece(pid)?.id).toBe(set.id);
      }
    }
  });

  it('weapon/armour pieces carry a +N enhancement so they beat rolled purple gear', () => {
    for (const piece of SET_PIECES) {
      const item = getItem(piece.id);
      // Robes and orbs carry no AC, so a +N would do nothing — they lift through
      // their effect payload instead.
      const liftsViaEnhancement =
        item.kind === 'weapon' ||
        (item.kind === 'armor' && item.category !== 'robe' && item.category !== 'orb');
      if (liftsViaEnhancement) {
        expect(piece.enhancement ?? 0, `${piece.id} should carry an enhancement`).toBeGreaterThan(0);
      }
    }
  });

  it('every piece carries a real effect payload and an effect line', () => {
    for (const piece of SET_PIECES) {
      const hasEffect = Object.values(piece.effects).some((v) => typeof v === 'number' && v !== 0);
      expect(hasEffect, `${piece.id} has no effect`).toBe(true);
      expect(piece.effectLine.length).toBeGreaterThan(0);
    }
  });
});

describe('set bonuses (2-/3-piece scaling)', () => {
  it('grants no bonus below the 2-piece threshold', () => {
    expect(computeSetBonuses(['vigil-helm'])).toEqual([]);
  });

  it('grants the 2-piece bonus at two equipped pieces', () => {
    const out = computeSetBonuses(['vigil-helm', 'vigil-mantle']);
    expect(out).toHaveLength(1);
    expect(out[0].tempHpPerCombat).toBe(4);
  });

  it('stacks the 3-piece bonus ON TOP of the 2-piece', () => {
    const out = computeSetBonuses(['vigil-helm', 'vigil-mantle', 'vigil-heart']);
    expect(out).toHaveLength(2);
    expect(out.some((m) => (m.tempHpPerCombat ?? 0) > 0)).toBe(true);
    expect(out.some((m) => (m.lifestealPct ?? 0) > 0)).toBe(true);
  });

  it('aggregateSetEffects sums piece effects PLUS met set tiers', () => {
    // Full Vigil set: 3 piece effects + 2 met tiers (2-piece, 3-piece) = 5.
    const out = aggregateSetEffects(['vigil-helm', 'vigil-mantle', 'vigil-heart']);
    expect(out).toHaveLength(5);
    expect(aggregateSetEffects([])).toEqual([]);
    expect(aggregateSetEffects(['nonexistent'])).toEqual([]);
  });

  it('reports equipped set progress', () => {
    const vigil = getGearSet('vigil')!;
    expect(setProgress(vigil, ['vigil-helm', 'vigil-heart'])).toBe(2);
    expect(setProgress(vigil, [])).toBe(0);
  });
});

describe('set gear — class gate & drop pool', () => {
  it('gates class-bound pieces to their class', () => {
    expect(canEquipSetPiece('warsong-crest', 'fighter')).toBe(true);
    expect(canEquipSetPiece('warsong-crest', 'wizard')).toBe(false);
    // Universal pieces equip for anyone.
    expect(canEquipSetPiece('vigil-helm', 'wizard')).toBe(true);
    expect(canEquipSetPiece('nonexistent', 'fighter')).toBe(false);
  });

  it('the drop pool offers universal + own-class pieces and gates the NG+ exclusive sets', () => {
    const normalFighter = setPieceDropPool('fighter', false);
    // First-chain starter sets drop on a normal run.
    expect(normalFighter).toContain('vigil-helm');
    expect(normalFighter).toContain('warsong-crest');
    // Ascension-exclusive sets do not, on a normal run.
    expect(normalFighter).not.toContain('ironclad-helm');
    expect(normalFighter).not.toContain('revenant-heart');

    const ngFighter = setPieceDropPool('fighter', true);
    expect(ngFighter).toContain('ironclad-helm'); // fighter's own NG+ set
    expect(ngFighter).not.toContain('archmagi-orb'); // another class's bound set
    expect(ngFighter).toContain('revenant-heart'); // universal NG+ set
  });
});
