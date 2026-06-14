import { describe, it, expect } from 'vitest';
import { getClass } from './index';
import { presetCreationInput } from '../../engine/character/defaultCharacter';
import { createCharacter } from '../../engine/character/initialize';
import { characterHasMechanic } from '../../engine/character/derived';
import type { ClassId } from '../../schemas/ids';

// Each class's archetypes: subclass id -> the mechanicKey granted at the
// subclass level. The FIRST archetype of each class must stay the original
// (formerly auto-granted) one so headless callers (sims) and existing saves
// keep their build via the applyLevelUp fallback.
const ARCHETYPES: Record<string, { first: string; byId: Record<string, string> }> = {
  fighter: {
    first: 'champion',
    byId: {
      champion: 'improved-critical',
      'battle-master': 'battle-master',
      defender: 'defender',
    },
  },
  rogue: {
    first: 'thief',
    byId: { thief: 'fast-hands', assassin: 'assassin', swashbuckler: 'swashbuckler' },
  },
  wizard: {
    first: 'evocation',
    byId: {
      evocation: 'sculpt-spells',
      abjuration: 'abjurer',
      illusion: 'illusionist',
      necromancy: 'grim-harvest',
    },
  },
  barbarian: {
    first: 'berserker',
    byId: { berserker: 'frenzy', 'totem-warrior': 'totem-warrior' },
  },
  ranger: {
    first: 'hunter',
    byId: {
      hunter: 'colossus-slayer',
      'horde-breaker': 'horde-breaker',
      'giant-killer': 'giant-killer',
      'blade-dancer': 'dual-wielder',
    },
  },
  paladin: {
    first: 'radiant',
    byId: {
      radiant: 'radiant-smite',
      bulwark: 'aura-of-the-bulwark',
      vengeance: 'vow-of-enmity',
    },
  },
  bard: {
    first: 'lore',
    byId: {
      lore: 'cutting-words',
      valor: 'martial-training',
      whispers: 'words-of-terror',
    },
  },
  monk: {
    first: 'way-of-the-open-hand',
    byId: {
      'way-of-the-open-hand': 'open-hand-technique',
      'way-of-shadow': 'shadow-strike',
      'way-of-the-four-elements': 'elemental-burst',
    },
  },
};

describe('class archetypes — choices, not auto-grants', () => {
  for (const [classId, spec] of Object.entries(ARCHETYPES)) {
    const cls = getClass(classId as ClassId);

    it(`${classId} offers multiple archetypes with the original first`, () => {
      expect(cls.subclasses.length).toBeGreaterThan(1);
      expect(cls.subclasses[0].id).toBe(spec.first);
    });

    it(`${classId} archetypes each grant a distinct mechanicKey at the subclass level`, () => {
      const lvl = String(cls.subclassLevel);
      const keys: string[] = [];
      for (const [subId, mechanicKey] of Object.entries(spec.byId)) {
        const sub = cls.subclasses.find((s) => s.id === subId);
        expect(sub, `${classId}/${subId} exists`).toBeDefined();
        const feat = sub!.featuresByLevel[lvl]?.[0];
        expect(feat?.mechanicKey, `${classId}/${subId} mechanicKey`).toBe(mechanicKey);
        keys.push(mechanicKey);
      }
      // Distinct effects — no two archetypes of a class share a mechanicKey.
      expect(new Set(keys).size).toBe(keys.length);
    });
  }
});

describe('characterHasMechanic gates archetype features on the chosen subclass', () => {
  function make(classId: ClassId, level: number, subclassId: string | null) {
    const c = createCharacter({ id: `t-${classId}`, ...presetCreationInput(classId) });
    return { ...c, level, subclassId };
  }

  it('grants the picked archetype, not the sibling archetypes', () => {
    const champ = make('fighter', 2, 'champion');
    expect(characterHasMechanic(champ, 'improved-critical')).toBe(true);
    expect(characterHasMechanic(champ, 'defender')).toBe(false);

    const def = make('fighter', 2, 'defender');
    expect(characterHasMechanic(def, 'defender')).toBe(true);
    expect(characterHasMechanic(def, 'improved-critical')).toBe(false);
  });

  it('grants nothing until an archetype is chosen (subclassId null)', () => {
    const undecided = make('rogue', 3, null);
    expect(characterHasMechanic(undecided, 'assassin')).toBe(false);
    expect(characterHasMechanic(undecided, 'swashbuckler')).toBe(false);
    expect(characterHasMechanic(undecided, 'fast-hands')).toBe(false);
  });
});
