import { describe, it, expect } from 'vitest';
import enCombat from './locales/en/combat.json';
import esCombat from './locales/es/combat.json';

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('combat locale completeness', () => {
  it('every en/combat key exists in es/combat', () => {
    const en = flatKeys(enCombat).sort();
    const es = new Set(flatKeys(esCombat));
    expect(en.filter((k) => !es.has(k))).toEqual([]);
  });

  it('es/combat has no keys absent from en (no orphans)', () => {
    const en = new Set(flatKeys(enCombat));
    expect(flatKeys(esCombat).filter((k) => !en.has(k))).toEqual([]);
  });
});
