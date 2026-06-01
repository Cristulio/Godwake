import { describe, it, expect } from 'vitest';
import { hasIllustration } from './EventIllustration';
import { TOTAL_CHAPTERS } from '../../engine/delve/constants';
import {
  EVENT_ILLUSTRATIONS,
  regionIllustrationForChapter,
  resolveEventIllustration,
  type IllustrationCategory,
} from '../../schemas/event';
import { BOSS_INTEL_CARDS, buildAllIntelEventTemplates } from '../../content/bossIntel';
import { listEvents } from '../../content/events';

describe('event illustration coverage', () => {
  it('every illustration category has an authored asset', () => {
    const missing = EVENT_ILLUSTRATIONS.filter((c) => !hasIllustration(c));
    expect(missing).toEqual([]);
  });

  it('every chapter in the chain resolves to an authored region scene', () => {
    for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
      const category = regionIllustrationForChapter(ch);
      expect(hasIllustration(category)).toBe(true);
    }
  });

  it('falls back to the omen scene for an absent or out-of-range chapter', () => {
    expect(resolveEventIllustration(undefined, undefined)).toBe('omen');
    expect(resolveEventIllustration(undefined, 99)).toBe('omen');
    expect(hasIllustration('omen')).toBe(true);
  });

  it('an explicit override wins over the chapter region', () => {
    const explicit: IllustrationCategory = 'throne-of-bhaal';
    expect(resolveEventIllustration(explicit, 1)).toBe(explicit);
  });

  it('every boss-intel card resolves to an authored illustration', () => {
    for (const card of BOSS_INTEL_CARDS) {
      const category = resolveEventIllustration(card.illustration, card.chapter);
      expect(hasIllustration(category)).toBe(true);
    }
  });

  it('every event template resolves to an authored illustration across the chain', () => {
    const templates = [...listEvents(), ...buildAllIntelEventTemplates()];
    for (const tpl of templates) {
      for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
        const category = resolveEventIllustration(tpl.illustration, ch);
        expect(hasIllustration(category)).toBe(true);
      }
    }
  });
});
