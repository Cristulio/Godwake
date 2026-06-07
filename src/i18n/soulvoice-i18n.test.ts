import { describe, it, expect, afterEach } from 'vitest';
import { getLocalized } from './index';
import { useSettingsStore } from '../stores/settingsStore';
import { ARC_QUOTES, CHAPTER_CLEAR } from '../components/lore/IrenicusTaunt';
import esSoulVoice from './locales/es/soulVoice.json';

const es = esSoulVoice as Record<string, Record<string, string>>;

afterEach(() => {
  useSettingsStore.setState({ locale: 'en' });
});

/**
 * The English pools in IrenicusTaunt are the source of truth; the component maps
 * the seeded index straight across to the es overlay via tc('soulVoice', id,
 * index). So the overlay must mirror every pool index-for-index — same ids, same
 * lengths, every entry a non-empty Spanish string. Drift here would silently fall
 * a line back to English.
 */
function expectedRows(): Record<string, number> {
  const rows: Record<string, number> = {};
  for (const speaker of Object.keys(ARC_QUOTES) as (keyof typeof ARC_QUOTES)[]) {
    for (const context of Object.keys(ARC_QUOTES[speaker])) {
      for (const tier of ['early', 'mid', 'late'] as const) {
        const pool =
          ARC_QUOTES[speaker][context as keyof (typeof ARC_QUOTES)[typeof speaker]][tier];
        rows[`arc.${speaker}.${context}.${tier}`] = pool.length;
      }
    }
  }
  for (const speaker of Object.keys(CHAPTER_CLEAR) as (keyof typeof CHAPTER_CLEAR)[]) {
    for (const chapter of Object.keys(CHAPTER_CLEAR[speaker])) {
      rows[`chapterClear.${speaker}.${chapter}`] = CHAPTER_CLEAR[speaker][Number(chapter)].length;
    }
  }
  return rows;
}

describe('es/soulVoice.json mirrors the English pools', () => {
  const expected = expectedRows();

  it('every pool has a same-length Spanish row with no empty fields', () => {
    const missing: string[] = [];
    for (const [id, count] of Object.entries(expected)) {
      const row = es[id];
      if (!row || typeof row !== 'object') {
        missing.push(`missing row: ${id}`);
        continue;
      }
      for (let i = 0; i < count; i++) {
        const v = row[String(i)];
        if (typeof v !== 'string' || v.trim().length === 0) missing.push(`${id}.${i}`);
      }
      if (Object.keys(row).length !== count) missing.push(`${id} (extra fields)`);
    }
    expect(missing, `soulVoice gaps: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan rows (every es id maps to an English pool)', () => {
    const orphans = Object.keys(es).filter((id) => !(id in expected));
    expect(orphans, `orphan soulVoice rows: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('soulVoice content seam', () => {
  it('returns Spanish in es mode and the English fallback otherwise', () => {
    useSettingsStore.setState({ locale: 'es' });
    expect(getLocalized('soulVoice', 'arc.irenicus.death.early', '0', 'EN')).toBe(
      es['arc.irenicus.death.early']['0'],
    );
    expect(getLocalized('soulVoice', 'chapterClear.imoen.1', '0', 'EN')).toBe(
      es['chapterClear.imoen.1']['0'],
    );

    useSettingsStore.setState({ locale: 'en' });
    expect(getLocalized('soulVoice', 'arc.irenicus.death.early', '0', 'EN-FALLBACK')).toBe(
      'EN-FALLBACK',
    );
  });
});
