import { describe, it, expect } from 'vitest';
import enHub from './locales/en/hub.json';
import esHub from './locales/es/hub.json';
import enScenes from './locales/en/scenes.json';
import esScenes from './locales/es/scenes.json';

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe.each([
  ['hub', enHub, esHub],
  ['scenes', enScenes, esScenes],
])('%s locale completeness', (_name, en, es) => {
  it('every en key exists in es', () => {
    const enKeys = flatKeys(en).sort();
    const esKeys = new Set(flatKeys(es));
    expect(enKeys.filter((k) => !esKeys.has(k))).toEqual([]);
  });

  it('es has no keys absent from en (no orphans)', () => {
    const enKeys = new Set(flatKeys(en));
    expect(flatKeys(es).filter((k) => !enKeys.has(k))).toEqual([]);
  });
});
