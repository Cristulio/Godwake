import { describe, it, expect } from 'vitest';
import type { Character } from '../../../types/character';
import { listSpells } from '../../../content/spells';
import { listClasses } from '../../../content/classes';
import { listItems, listAffixes } from '../../../content/items';
import { listBlessings } from '../../../content/blessings';
import { listAllQuirks } from '../../../content/quirks';
import { listRaces } from '../../../content/races';
import { listAchievements } from '../../../content/achievements';
import { martialFlavor } from '../../../engine/combat/martialResource';

import racesEs from './races.json';
import spellsEs from './spells.json';
import classesEs from './classes.json';
import abilitiesEs from './abilities.json';
import itemsEs from './items.json';
import blessingsEs from './blessings.json';
import quirksEs from './quirks.json';
import achievementsEs from './achievements.json';

/** key -> the string fields the es overlay row must carry. */
type Expected = Record<string, string[]>;
type Overlay = Record<string, Record<string, unknown>>;

/**
 * The completeness gate: every id the EN content source exposes must have an es
 * overlay row carrying the required fields, and the overlay must hold no rows
 * that don't map back to an EN id (no orphans). This is what proves the data
 * lane translated everything and nothing stale lingers.
 */
function audit(es: Overlay, expected: Expected) {
  const missing: string[] = [];
  for (const [key, fields] of Object.entries(expected)) {
    const row = es[key];
    if (!row || typeof row !== 'object') {
      missing.push(`missing row: ${key}`);
      continue;
    }
    for (const f of fields) {
      const v = row[f];
      if (typeof v !== 'string' || v.length === 0) missing.push(`missing field: ${key}.${f}`);
    }
  }
  const orphans = Object.keys(es).filter((k) => !(k in expected));
  return { missing, orphans };
}

describe('es/spells.json completeness', () => {
  const expected: Expected = {};
  for (const s of listSpells()) expected[s.id] = ['name', 'description'];

  it('covers every spell id with name + description and no orphans', () => {
    const { missing, orphans } = audit(spellsEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/classes.json completeness', () => {
  // Key scheme (collision-free across class / base feature / subclass / subclass
  // feature, since a subclass and its like-named inner feature would otherwise
  // share an id):
  //   class            -> `${classId}`
  //   base feature     -> `${classId}.${featureId}`
  //   subclass         -> `${classId}.${subclassId}`
  //   subclass feature -> `${classId}.${subclassId}.${featureId}`
  const expected: Expected = {};
  for (const c of listClasses()) {
    expected[c.id] = c.preset ? ['name', 'flavorBlurb'] : ['name'];
    for (const feats of Object.values(c.featuresByLevel)) {
      for (const f of feats) expected[`${c.id}.${f.id}`] = ['name', 'description'];
    }
    for (const sub of c.subclasses) {
      expected[`${c.id}.${sub.id}`] = ['name', 'description'];
      for (const feats of Object.values(sub.featuresByLevel)) {
        for (const f of feats) expected[`${c.id}.${sub.id}.${f.id}`] = ['name', 'description'];
      }
    }
  }

  it('covers every class, feature, subclass and subclass-feature with no orphans', () => {
    const { missing, orphans } = audit(classesEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/abilities.json completeness', () => {
  // Martial pool flavor (pool + the three spend names) for every class the
  // engine flags as martial, keyed by class id.
  const expected: Expected = {};
  for (const c of listClasses()) {
    const flavor = martialFlavor({ classId: c.id } as Character);
    if (flavor) expected[c.id] = ['pool', 'offense', 'defense', 'disrupt'];
  }

  it('covers every martial class pool flavor with no orphans', () => {
    const { missing, orphans } = audit(abilitiesEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/items.json completeness', () => {
  const expected: Expected = {};
  for (const it of listItems()) {
    const fields = ['name'];
    if (typeof (it as { description?: unknown }).description === 'string') fields.push('description');
    expected[it.id] = fields;
  }
  for (const a of listAffixes()) expected[a.id] = ['word', 'effect'];

  it('covers every item (+ description where the source has one) and affix with no orphans', () => {
    const { missing, orphans } = audit(itemsEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/blessings.json completeness', () => {
  const expected: Expected = {};
  for (const b of listBlessings()) expected[b.id] = ['name', 'flavor', 'effect'];

  it('covers every blessing with name + flavor + effect and no orphans', () => {
    const { missing, orphans } = audit(blessingsEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/quirks.json completeness', () => {
  // listAllQuirks (not listQuirks) so the disabled flavor-only quirks still in
  // the codebase are translated too — they surface from stored save data.
  const expected: Expected = {};
  for (const q of listAllQuirks()) expected[q.id] = ['name', 'flavor', 'effect'];

  it('covers every quirk with name + flavor + effect and no orphans', () => {
    const { missing, orphans } = audit(quirksEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/achievements.json completeness', () => {
  // Every achievement id (hidden ones too — their revealed text still needs es)
  // must carry a name + description, and the overlay holds no orphan rows.
  const expected: Expected = {};
  for (const a of listAchievements()) expected[a.id] = ['name', 'description'];

  it('covers every achievement with name + description and no orphans', () => {
    const { missing, orphans } = audit(achievementsEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});

describe('es/races.json completeness', () => {
  // race -> the name plus every feature's name + description, keyed flat within
  // the race row as `${featureId}.name` / `${featureId}.description` (the tc
  // seam looks up es[raceId][field], so the feature key is just a field string).
  const expected: Expected = {};
  for (const r of listRaces()) {
    const fields = ['name'];
    for (const f of r.features) {
      fields.push(`${f.id}.name`, `${f.id}.description`);
    }
    expected[r.id] = fields;
  }

  it('covers every race name + feature name/description with no orphans', () => {
    const { missing, orphans } = audit(racesEs as Overlay, expected);
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });
});
