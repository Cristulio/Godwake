import { describe, it, expect, afterEach, vi } from 'vitest';
import { detectInitialLocale } from './settingsStore';

function withLanguages(langs: string[] | undefined, run: () => void) {
  const nav =
    langs === undefined
      ? undefined
      : ({ languages: langs, language: langs[0] } as unknown as Navigator);
  vi.stubGlobal('navigator', nav);
  try {
    run();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe('detectInitialLocale', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('picks es for a Spanish browser', () => {
    withLanguages(['es-ES', 'en-US'], () => expect(detectInitialLocale()).toBe('es'));
    withLanguages(['es'], () => expect(detectInitialLocale()).toBe('es'));
  });

  it('picks en for an English browser', () => {
    withLanguages(['en-GB'], () => expect(detectInitialLocale()).toBe('en'));
  });

  it('falls back to the default for an unsupported language', () => {
    withLanguages(['fr-FR', 'de-DE'], () => expect(detectInitialLocale()).toBe('en'));
  });

  it('honours the first SUPPORTED tag in the priority list', () => {
    // French is preferred but unsupported; Spanish is next and shipped → es.
    withLanguages(['fr-FR', 'es-MX', 'en'], () => expect(detectInitialLocale()).toBe('es'));
  });

  it('defaults safely when navigator is unavailable', () => {
    withLanguages(undefined, () => expect(detectInitialLocale()).toBe('en'));
  });
});
