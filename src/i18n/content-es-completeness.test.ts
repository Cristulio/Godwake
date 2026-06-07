import { describe, it, expect } from 'vitest';
import { listMonsters } from '../content/monsters';
import { listEvents } from '../content/events';
import { LORE_BEATS } from '../content/loreBeats';
import { BOSS_INTEL_CARDS } from '../content/bossIntel';
import { listUpgrades } from '../content/upgrades';
import type { EventChoiceOutcome } from '../schemas/event';

import esMonsters from './locales/es/monsters.json';
import esEvents from './locales/es/events.json';
import esLore from './locales/es/lore.json';
import esBossIntel from './locales/es/bossIntel.json';
import esChapters from './locales/es/chapters.json';
import enUpgrades from './locales/en/upgrades.json';
import esUpgrades from './locales/es/upgrades.json';

type Overlay = Record<string, Record<string, string>>;

const monsters = esMonsters as Overlay;
const events = esEvents as Overlay;
const lore = esLore as Overlay;
const bossIntel = esBossIntel as Overlay;
const chapters = esChapters as Overlay;

/** A row field is "covered" when it exists and is a non-empty Spanish string. */
function covered(row: Record<string, string> | undefined, field: string): boolean {
  const v = row?.[field];
  return typeof v === 'string' && v.trim().length > 0;
}

/** The `resolution` of a choice outcome, or undefined for random-outcome choices. */
function resolutionOf(outcome: EventChoiceOutcome | undefined): string | undefined {
  if (outcome && 'resolution' in outcome) return outcome.resolution;
  return undefined;
}

describe('es/monsters.json completeness', () => {
  it('every monster has a Spanish name + flavorText overlay', () => {
    const missing: string[] = [];
    for (const m of listMonsters()) {
      const row = monsters[m.id];
      if (!covered(row, 'name')) missing.push(`${m.id}.name`);
      if (m.flavorText && !covered(row, 'flavorText')) missing.push(`${m.id}.flavorText`);
    }
    expect(missing, `missing monster overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan monster ids (every es id is a real monster)', () => {
    const ids = new Set(listMonsters().map((m) => m.id));
    const orphans = Object.keys(monsters).filter((id) => !ids.has(id));
    expect(orphans, `orphan monster overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('es/events.json completeness', () => {
  it('every event + choice has its Spanish overlay (title/flavor/label/hint/resolutions)', () => {
    const missing: string[] = [];
    for (const e of listEvents()) {
      const row = events[e.id];
      if (!covered(row, 'title')) missing.push(`${e.id}.title`);
      if (!covered(row, 'flavor')) missing.push(`${e.id}.flavor`);
      for (const c of e.choices) {
        const base = `${e.id}.choice.${c.id}`;
        if (!covered(row, `choice.${c.id}.label`)) missing.push(`${base}.label`);
        if (c.hint && !covered(row, `choice.${c.id}.hint`)) missing.push(`${base}.hint`);
        if (resolutionOf(c.outcome) && !covered(row, `choice.${c.id}.resolution`))
          missing.push(`${base}.resolution`);
        if (resolutionOf(c.failureOutcome) && !covered(row, `choice.${c.id}.failureResolution`))
          missing.push(`${base}.failureResolution`);
      }
    }
    expect(missing, `missing event overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan event ids', () => {
    const ids = new Set(listEvents().map((e) => e.id));
    const orphans = Object.keys(events).filter((id) => !ids.has(id));
    expect(orphans, `orphan event overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('es/lore.json completeness', () => {
  it('every lore beat has Spanish text', () => {
    const missing = LORE_BEATS.filter((b) => !covered(lore[b.id], 'text')).map((b) => b.id);
    expect(missing, `missing lore overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan lore ids', () => {
    const ids = new Set(LORE_BEATS.map((b) => b.id));
    const orphans = Object.keys(lore).filter((id) => !ids.has(id));
    expect(orphans, `orphan lore overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('es/bossIntel.json completeness', () => {
  const FIELDS = [
    'roomTitle',
    'roomFlavor',
    'weakSpotResolution',
    'battlePlanResolution',
    'walkPastResolution',
  ] as const;

  it('every boss intel card has all five Spanish fields', () => {
    const missing: string[] = [];
    for (const card of BOSS_INTEL_CARDS) {
      const row = bossIntel[card.bossDefId];
      for (const field of FIELDS) {
        if (!covered(row, field)) missing.push(`${card.bossDefId}.${field}`);
      }
    }
    expect(missing, `missing boss intel overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan boss intel ids', () => {
    const ids = new Set(BOSS_INTEL_CARDS.map((c) => c.bossDefId));
    const orphans = Object.keys(bossIntel).filter((id) => !ids.has(id));
    expect(orphans, `orphan boss intel overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('upgrades.json completeness (en effect templates + es overlay)', () => {
  type EffectField = string | { one?: string; other?: string };
  type UpRow = { name?: string; flavor?: string; effect?: EffectField; unlockLabel?: string };

  const en = enUpgrades as Record<string, UpRow>;
  const es = esUpgrades as Record<string, UpRow>;

  /** An effect field is covered when it's a non-empty string, or a {one,other} pair both non-empty. */
  function effectCovered(v: EffectField | undefined): boolean {
    if (typeof v === 'string') return v.trim().length > 0;
    if (v && typeof v === 'object') {
      return (
        typeof v.one === 'string' && v.one.trim().length > 0 &&
        typeof v.other === 'string' && v.other.trim().length > 0
      );
    }
    return false;
  }

  it('every upgrade has an English effect template', () => {
    const missing = listUpgrades()
      .filter((u) => !effectCovered(en[u.id]?.effect))
      .map((u) => `${u.id}.effect`);
    expect(missing, `missing en effect: ${missing.join(', ')}`).toEqual([]);
  });

  it('every upgrade has a Spanish name + flavor + effect (and unlockLabel where gated)', () => {
    const missing: string[] = [];
    for (const u of listUpgrades()) {
      const row = es[u.id];
      const strRow = row as Record<string, string> | undefined;
      if (!covered(strRow, 'name')) missing.push(`${u.id}.name`);
      if (!covered(strRow, 'flavor')) missing.push(`${u.id}.flavor`);
      if (!effectCovered(row?.effect)) missing.push(`${u.id}.effect`);
      if (u.unlock && !covered(strRow, 'unlockLabel')) missing.push(`${u.id}.unlockLabel`);
    }
    expect(missing, `missing es upgrade overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan upgrade ids in either locale', () => {
    const ids = new Set(listUpgrades().map((u) => u.id));
    const orphans = [...Object.keys(en), ...Object.keys(es)].filter((id) => !ids.has(id));
    expect([...new Set(orphans)], `orphan upgrade overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('es/chapters.json completeness', () => {
  // chapterLabel() reads `name` for every chapter in the full 14-chapter chain;
  // ChapterIntroScene reads `introTitle`/`introSubtitle` for the base arc (1-6).
  const NAME_CHAPTERS = Array.from({ length: 14 }, (_, i) => String(i + 1));
  const INTRO_CHAPTERS = ['1', '2', '3', '4', '5', '6'];

  it('every chapter has a Spanish name (chapterLabel)', () => {
    const missing = NAME_CHAPTERS.filter((id) => !covered(chapters[id], 'name'));
    expect(missing, `missing chapter names: ${missing.join(', ')}`).toEqual([]);
  });

  it('every intro chapter has a Spanish introTitle + introSubtitle', () => {
    const missing: string[] = [];
    for (const id of INTRO_CHAPTERS) {
      const row = chapters[id];
      if (!covered(row, 'introTitle')) missing.push(`${id}.introTitle`);
      if (!covered(row, 'introSubtitle')) missing.push(`${id}.introSubtitle`);
    }
    expect(missing, `missing chapter intro overlays: ${missing.join(', ')}`).toEqual([]);
  });
});
