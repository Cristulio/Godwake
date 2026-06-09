import { describe, it, expect } from 'vitest';
import enEquip from './locales/en/equip.json';
import esEquip from './locales/es/equip.json';

const keys = (o: Record<string, unknown>) => Object.keys(o).sort();

describe('equip locale completeness', () => {
  it('en and es have identical key sets', () => {
    expect(keys(esEquip)).toEqual(keys(enEquip));
  });
});
