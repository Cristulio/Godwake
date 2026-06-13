import { describe, it, expect } from 'vitest';
import { listMonsters } from '../content/monsters';
import { listEvents } from '../content/events';
import { LORE_BEATS } from '../content/loreBeats';
import { BOSS_INTEL_CARDS } from '../content/bossIntel';
import { listUpgrades } from '../content/upgrades';
import { GEAR_SETS, SET_PIECES } from '../content/sets';
import { listAffixes } from '../content/items';
import {
  WEAPON_BASE_IDS,
  MONK_WEAPON_BASE_IDS,
  BARD_WEAPON_BASE_IDS,
  ARMOR_BASE_IDS,
  ACCESSORY_BASE_IDS,
} from '../engine/items/rollItem';
import { LEGENDARIES, RELIC_SLOTS } from '../content/legendaries';
import { DUNGEON_TWISTS } from '../engine/delve';
import { TUTORIALS, CLASS_TUTORIALS, STANDALONE_TUTORIALS } from '../content/tutorials';
import type { TutorialContent } from '../content/tutorials';
import type { EventChoiceOutcome } from '../schemas/event';
import type { Monster, MonsterAction } from '../schemas/monster';

import esMonsters from './locales/es/monsters.json';
import esEvents from './locales/es/events.json';
import esLore from './locales/es/lore.json';
import esBossIntel from './locales/es/bossIntel.json';
import esChapters from './locales/es/chapters.json';
import enUpgrades from './locales/en/upgrades.json';
import esUpgrades from './locales/es/upgrades.json';
import esSetGear from './locales/es/setGear.json';
import esItems from './locales/es/items.json';
import esLegendaries from './locales/es/legendaries.json';
import esRelicSlots from './locales/es/relicSlots.json';
import esTutorials from './locales/es/tutorials.json';
import esTwists from './locales/es/twists.json';
import { GLOSSARY } from '../content/glossary';
import esGlossary from './locales/es/glossary.json';
import { listCampBoons } from '../content/campBoons';
import esCampBoons from './locales/es/campBoons.json';

type Overlay = Record<string, Record<string, string>>;

const monsters = esMonsters as unknown as Overlay;
const events = esEvents as Overlay;
const lore = esLore as Overlay;
const bossIntel = esBossIntel as Overlay;
const chapters = esChapters as Overlay;
const setGear = esSetGear as Overlay;
const items = esItems as Overlay;
const legendaries = esLegendaries as Overlay;
const relicSlots = esRelicSlots as Overlay;
const tutorials = esTutorials as Overlay;
const twists = esTwists as Overlay;
const glossary = esGlossary as Overlay;
const campBoons = esCampBoons as Overlay;

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

type MonsterRow = {
  actions?: Record<string, { name?: string; desc?: string; charge?: string }>;
  phases?: Record<string, { name?: string; enterText?: string }>;
};

/**
 * Every action the combat log can name — the base list PLUS the actions a phase
 * grants on entry (`addActions`). Phase-added actions are localized by the engine
 * the same way (getLocalizedMonsterActionName), so their names/descs/charges must
 * be covered too. Deduped by the English action name, which is the overlay key.
 */
function allMonsterActions(m: Monster): MonsterAction[] {
  const seen = new Map<string, MonsterAction>();
  for (const a of m.actions) if (!seen.has(a.name)) seen.set(a.name, a);
  for (const p of m.phases ?? []) {
    for (const a of p.addActions ?? []) if (!seen.has(a.name)) seen.set(a.name, a);
  }
  return [...seen.values()];
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

  it('every monster action (base + phase-added) has a Spanish name overlay (combat log + Codex)', () => {
    const missing: string[] = [];
    for (const m of listMonsters()) {
      const row = monsters[m.id] as unknown as MonsterRow | undefined;
      for (const a of allMonsterActions(m)) {
        const esName = row?.actions?.[a.name]?.name;
        if (typeof esName !== 'string' || esName.trim().length === 0) {
          missing.push(`${m.id}.${a.name}`);
        }
      }
    }
    expect(missing, `missing monster action-name overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('every monster action with an English description has a Spanish desc overlay (Codex)', () => {
    const missing: string[] = [];
    for (const m of listMonsters()) {
      const row = monsters[m.id] as unknown as MonsterRow | undefined;
      for (const a of allMonsterActions(m)) {
        if (typeof a.description !== 'string' || a.description.trim().length === 0) continue;
        const esDesc = row?.actions?.[a.name]?.desc;
        if (typeof esDesc !== 'string' || esDesc.trim().length === 0) {
          missing.push(`${m.id}.${a.name}`);
        }
      }
    }
    expect(missing, `missing monster action-desc overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('every boss telegraph chargeText has a Spanish charge overlay (combat log + intent)', () => {
    const missing: string[] = [];
    for (const m of listMonsters()) {
      const row = monsters[m.id] as unknown as MonsterRow | undefined;
      for (const a of allMonsterActions(m)) {
        if (!a.telegraph?.chargeText) continue;
        const esCharge = row?.actions?.[a.name]?.charge;
        if (typeof esCharge !== 'string' || esCharge.trim().length === 0) {
          missing.push(`${m.id}.${a.name}`);
        }
      }
    }
    expect(missing, `missing telegraph charge overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('every boss phase enterText + name has a Spanish overlay keyed by phase index', () => {
    const missing: string[] = [];
    for (const m of listMonsters()) {
      const row = monsters[m.id] as unknown as MonsterRow | undefined;
      (m.phases ?? []).forEach((p, idx) => {
        const esPhase = row?.phases?.[String(idx)];
        if (p.enterText && (typeof esPhase?.enterText !== 'string' || esPhase.enterText.trim().length === 0)) {
          missing.push(`${m.id}.phases[${idx}].enterText`);
        }
        if (p.name && (typeof esPhase?.name !== 'string' || esPhase.name.trim().length === 0)) {
          missing.push(`${m.id}.phases[${idx}].name`);
        }
      });
    }
    expect(missing, `missing phase overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan phase indices (every es phase key is a real phase carrying text)', () => {
    const orphans: string[] = [];
    for (const m of listMonsters()) {
      const row = monsters[m.id] as unknown as MonsterRow | undefined;
      if (!row?.phases) continue;
      const realIndices = new Set(
        (m.phases ?? [])
          .map((p, idx) => (p.enterText || p.name ? String(idx) : null))
          .filter((x): x is string => x !== null),
      );
      for (const key of Object.keys(row.phases)) {
        if (!realIndices.has(key)) orphans.push(`${m.id}.phases[${key}]`);
      }
    }
    expect(orphans, `orphan phase overlays: ${orphans.join(', ')}`).toEqual([]);
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

describe('es/setGear.json completeness', () => {
  it('every set has a Spanish name + flavor + a label for each bonus tier', () => {
    const missing: string[] = [];
    for (const set of GEAR_SETS) {
      if (!covered(setGear[set.id], 'name')) missing.push(`${set.id}.name`);
      if (!covered(setGear[set.id], 'flavor')) missing.push(`${set.id}.flavor`);
      for (const tier of set.bonuses) {
        if (!covered(setGear[`${set.id}.bonus`], String(tier.piecesRequired)))
          missing.push(`${set.id}.bonus.${tier.piecesRequired}`);
      }
    }
    expect(missing, `missing set overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('every set piece has a Spanish name + effect', () => {
    const missing: string[] = [];
    for (const piece of SET_PIECES) {
      if (!covered(setGear[piece.id], 'name')) missing.push(`${piece.id}.name`);
      if (!covered(setGear[piece.id], 'effect')) missing.push(`${piece.id}.effect`);
    }
    expect(missing, `missing set-piece overlays: ${missing.join(', ')}`).toEqual([]);
  });
});

// --- i18n-audit lane: rolled item names, affix strings, legendaries, tutorials ---

describe('es/items.json rolled-loot completeness', () => {
  it('every rollable base id has a Spanish name', () => {
    const baseIds = [
      ...WEAPON_BASE_IDS,
      ...MONK_WEAPON_BASE_IDS,
      ...BARD_WEAPON_BASE_IDS,
      ...ARMOR_BASE_IDS,
      ...ACCESSORY_BASE_IDS,
    ];
    const missing = baseIds.filter((id) => !covered(items[id], 'name'));
    expect(missing, `missing base name overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('every affix has a Spanish name word + effect (drives the rolled name + tooltip)', () => {
    const missing: string[] = [];
    for (const a of listAffixes()) {
      if (!covered(items[a.id], 'word')) missing.push(`${a.id}.word`);
      if (!covered(items[a.id], 'effect')) missing.push(`${a.id}.effect`);
    }
    expect(missing, `missing affix overlays: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('es/legendaries.json + es/relicSlots.json completeness', () => {
  // BG2-canonical proper nouns kept verbatim in both locales (no `name` overlay).
  const PROPER_NOUN_RELICS = new Set([
    'crom-faeyr',
    'robe-of-vecna',
    'ring-of-gaxx',
    'carsomyr',
    'blackrazor',
    'staff-of-the-magi',
  ]);

  it('every relic has a Spanish flavor + effect (and a name unless a proper noun)', () => {
    const missing: string[] = [];
    for (const relic of LEGENDARIES) {
      if (!covered(legendaries[relic.id], 'flavor')) missing.push(`${relic.id}.flavor`);
      if (!covered(legendaries[relic.id], 'effect')) missing.push(`${relic.id}.effect`);
      if (!PROPER_NOUN_RELICS.has(relic.id) && !covered(legendaries[relic.id], 'name'))
        missing.push(`${relic.id}.name`);
    }
    expect(missing, `missing legendary overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('every relic slot has a Spanish name + blurb', () => {
    const missing: string[] = [];
    for (const slot of RELIC_SLOTS) {
      if (!covered(relicSlots[slot], 'name')) missing.push(`${slot}.name`);
      if (!covered(relicSlots[slot], 'blurb')) missing.push(`${slot}.blurb`);
    }
    expect(missing, `missing relic-slot overlays: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('es/tutorials.json completeness', () => {
  const ALL: Record<string, TutorialContent> = {
    ...TUTORIALS,
    ...CLASS_TUTORIALS,
    ...STANDALONE_TUTORIALS,
  };

  it('every unlock card has Spanish unlocked/title/key + a line for each body paragraph', () => {
    const missing: string[] = [];
    for (const [id, content] of Object.entries(ALL)) {
      const row = tutorials[id];
      if (!covered(row, 'unlocked')) missing.push(`${id}.unlocked`);
      if (!covered(row, 'title')) missing.push(`${id}.title`);
      if (!covered(row, 'key')) missing.push(`${id}.key`);
      content.body.forEach((_, i) => {
        if (!covered(row, `body${i}`)) missing.push(`${id}.body${i}`);
      });
    }
    expect(missing, `missing tutorial overlays: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('es/twists.json completeness', () => {
  // RoomHeader reads name + flavorText; DelveMap reads telegraph on the route map.
  const FIELDS = ['name', 'flavorText', 'telegraph'] as const;

  it('every dungeon twist has all three Spanish fields', () => {
    const missing: string[] = [];
    for (const tw of DUNGEON_TWISTS) {
      for (const field of FIELDS) {
        if (!covered(twists[tw.id], field)) missing.push(`${tw.id}.${field}`);
      }
    }
    expect(missing, `missing twist overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan twist ids', () => {
    const ids = new Set<string>(DUNGEON_TWISTS.map((t) => t.id));
    const orphans = Object.keys(twists).filter((id) => !ids.has(id));
    expect(orphans, `orphan twist overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('es/campBoons.json completeness', () => {
  it('every camp boon has a Spanish name + description + flavor', () => {
    const missing: string[] = [];
    for (const b of listCampBoons()) {
      if (!covered(campBoons[b.id], 'name')) missing.push(`${b.id}.name`);
      if (!covered(campBoons[b.id], 'description')) missing.push(`${b.id}.description`);
      if (!covered(campBoons[b.id], 'flavor')) missing.push(`${b.id}.flavor`);
    }
    expect(missing, `missing camp-boon overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan camp-boon ids', () => {
    const ids = new Set(listCampBoons().map((b) => b.id));
    const orphans = Object.keys(campBoons).filter((id) => !ids.has(id));
    expect(orphans, `orphan camp-boon overlays: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('es/glossary.json completeness', () => {
  it('every section has a Spanish title and every entry a Spanish term + desc', () => {
    const missing: string[] = [];
    for (const section of GLOSSARY) {
      if (!covered(glossary[section.id], 'title')) missing.push(`${section.id}.title`);
      for (const entry of section.entries) {
        if (!covered(glossary[entry.id], 'term')) missing.push(`${entry.id}.term`);
        if (!covered(glossary[entry.id], 'desc')) missing.push(`${entry.id}.desc`);
      }
    }
    expect(missing, `missing glossary overlays: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphan glossary ids', () => {
    const ids = new Set<string>([
      ...GLOSSARY.map((s) => s.id),
      ...GLOSSARY.flatMap((s) => s.entries.map((e) => e.id)),
    ]);
    const orphans = Object.keys(glossary).filter((id) => !ids.has(id));
    expect(orphans, `orphan glossary overlays: ${orphans.join(', ')}`).toEqual([]);
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
