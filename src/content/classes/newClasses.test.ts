import { describe, it, expect } from 'vitest';
import { getClass, listClasses } from './index';
import { presetCreationInput } from '../../engine/character/defaultCharacter';
import { createCharacter } from '../../engine/character/initialize';
import { getItem } from '../items';

describe('Barbarian + Ranger — class definitions', () => {
  it('both are registered and resolve through getClass', () => {
    expect(getClass('barbarian').name).toBe('Barbarian');
    expect(getClass('ranger').name).toBe('Ranger');
  });

  it('both surface as selectable souls (have a preset)', () => {
    const selectable = listClasses().filter((c) => c.preset);
    const ids = selectable.map((c) => c.id);
    expect(ids).toContain('barbarian');
    expect(ids).toContain('ranger');
  });

  it('Barbarian is a d12 STR brute with full martial training', () => {
    const b = getClass('barbarian');
    expect(b.hitDie).toBe(12);
    expect(b.primaryAbility).toContain('str');
    expect(b.weaponProficiency?.categories).toEqual(['simple', 'martial']);
  });

  it('Ranger is a d10 DEX martial with full martial training', () => {
    const r = getClass('ranger');
    expect(r.hitDie).toBe(10);
    expect(r.primaryAbility).toContain('dex');
    expect(r.weaponProficiency?.categories).toEqual(['simple', 'martial']);
  });

  it('exposes the signature mechanic keys at the reachable levels', () => {
    const b = getClass('barbarian');
    const bKeys = Object.values(b.featuresByLevel)
      .flat()
      .map((f) => f.mechanicKey);
    expect(bKeys).toContain('rage');
    expect(bKeys).toContain('unarmored-defense');
    expect(bKeys).toContain('reckless-attack');
    expect(bKeys).toContain('extra-attack');
    const frenzy = b.subclasses[0].featuresByLevel['3'].map((f) => f.mechanicKey);
    expect(frenzy).toContain('frenzy');

    const r = getClass('ranger');
    const rKeys = Object.values(r.featuresByLevel)
      .flat()
      .map((f) => f.mechanicKey);
    expect(rKeys).toContain('hunters-mark');
    expect(rKeys).toContain('archery');
    expect(rKeys).toContain('extra-attack');
    const hunter = r.subclasses[0].featuresByLevel['3'].map((f) => f.mechanicKey);
    expect(hunter).toContain('colossus-slayer');
  });

  it('preset builds a valid character with a coherent starting kit', () => {
    for (const classId of ['barbarian', 'ranger'] as const) {
      const input = presetCreationInput(classId);
      expect(() => createCharacter({ id: 't', ...input })).not.toThrow();
    }
  });

  it('new-class weapon item ids resolve (greataxe, longbow, shortsword exist)', () => {
    for (const id of ['greataxe', 'longbow', 'shortsword']) {
      expect(getItem(id).kind).toBe('weapon');
    }
  });
});
