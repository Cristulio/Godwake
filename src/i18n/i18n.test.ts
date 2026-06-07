import { describe, it, expect, afterEach } from 'vitest';
import { t, getLocalized } from './index';
import { useSettingsStore } from '../stores/settingsStore';
import enUi from './locales/en/ui.json';
import esUi from './locales/es/ui.json';
import enScreens from './locales/en/screens.json';
import esScreens from './locales/es/screens.json';

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

afterEach(() => {
  useSettingsStore.setState({ locale: 'en' });
});

describe('ui locale completeness', () => {
  it('every en key exists in es', () => {
    const en = flatKeys(enUi).sort();
    const es = new Set(flatKeys(esUi));
    const missing = en.filter((k) => !es.has(k));
    expect(missing).toEqual([]);
  });

  it('es has no keys absent from en (no orphans)', () => {
    const en = new Set(flatKeys(enUi));
    const orphan = flatKeys(esUi).filter((k) => !en.has(k));
    expect(orphan).toEqual([]);
  });
});

describe('screens locale completeness', () => {
  it('every en key exists in es', () => {
    const en = flatKeys(enScreens).sort();
    const es = new Set(flatKeys(esScreens));
    const missing = en.filter((k) => !es.has(k));
    expect(missing).toEqual([]);
  });

  it('es has no keys absent from en (no orphans)', () => {
    const en = new Set(flatKeys(enScreens));
    const orphan = flatKeys(esScreens).filter((k) => !en.has(k));
    expect(orphan).toEqual([]);
  });
});

describe('t()', () => {
  it('resolves the active locale', () => {
    useSettingsStore.setState({ locale: 'es' });
    expect(t('ui.common.cancel')).toBe('Cancelar');
    useSettingsStore.setState({ locale: 'en' });
    expect(t('ui.common.cancel')).toBe('Cancel');
  });

  it('interpolates named params', () => {
    expect(t('ui.settings.savedToSlot', { n: 2 })).toBe('Saved to slot 2.');
  });

  it('falls back to en when es is missing a key, then to the key itself', () => {
    useSettingsStore.setState({ locale: 'es' });
    expect(t('ui.does.not.exist')).toBe('ui.does.not.exist');
  });
});

describe('getLocalized() content seam', () => {
  it('returns the English fallback when locale is en', () => {
    useSettingsStore.setState({ locale: 'en' });
    expect(getLocalized('spells', 'fire-bolt', 'name', 'Fire Bolt')).toBe('Fire Bolt');
  });

  it('returns the English fallback when no es overlay exists for the namespace', () => {
    useSettingsStore.setState({ locale: 'es' });
    expect(getLocalized('spells', 'fire-bolt', 'name', 'Fire Bolt')).toBe('Fire Bolt');
  });
});
