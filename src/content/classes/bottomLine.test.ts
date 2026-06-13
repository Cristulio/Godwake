import { describe, it, expect } from 'vitest';
import { listClasses } from './index';
import { SubclassBottomLineSchema } from '../../schemas/class';
import { ARCHETYPE_ACCENTS, archetypeAccent } from '../../components/level/SchoolBottomLine';
import { combatLean } from '../../engine/character/combatLean';

describe('subclass bottom lines', () => {
  it('every school of every class carries an archetype + 2-4 levers', () => {
    const missing: string[] = [];
    for (const c of listClasses()) {
      for (const sub of c.subclasses) {
        const bl = sub.bottomLine;
        if (!bl.archetype.trim()) missing.push(`${c.id}/${sub.id}: empty archetype`);
        if (bl.levers.length < 2 || bl.levers.length > 4)
          missing.push(`${c.id}/${sub.id}: ${bl.levers.length} levers`);
        if (bl.levers.some((l) => !l.trim())) missing.push(`${c.id}/${sub.id}: empty lever`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every archetype word has a deliberate accent color (no silent fallback)', () => {
    const unmapped = listClasses()
      .flatMap((c) => c.subclasses.map((s) => `${c.id}/${s.id}: ${s.bottomLine.archetype}`))
      .filter((entry) => !(entry.split(': ')[1] in ARCHETYPE_ACCENTS));
    expect(unmapped).toEqual([]);
  });

  it('schools WITHIN one class read as different things — distinct words and accents', () => {
    for (const c of listClasses()) {
      const words = c.subclasses.map((s) => s.bottomLine.archetype);
      expect(new Set(words).size, `${c.id} archetype words: ${words.join(', ')}`).toBe(
        words.length,
      );
      const accents = words.map(archetypeAccent);
      expect(new Set(accents).size, `${c.id} accents collide: ${words.join(', ')}`).toBe(
        accents.length,
      );
    }
  });

  it('the martial/caster forks (bard, paladin) split combatLean across their schools', () => {
    for (const classId of ['bard', 'paladin'] as const) {
      const cls = listClasses().find((c) => c.id === classId)!;
      const leans = new Set(
        cls.subclasses.map((s) => combatLean({ classId, subclassId: s.id })),
      );
      expect(leans.size, `${classId} should be a cross-lean fork`).toBe(2);
    }
  });
});

describe('SubclassBottomLineSchema bounds', () => {
  it('accepts 2-4 levers and rejects out-of-band shapes', () => {
    const ok = { archetype: 'Striker', levers: ['Crits land on 19–20.', 'L10: 18–20.'] };
    expect(SubclassBottomLineSchema.safeParse(ok).success).toBe(true);
    expect(
      SubclassBottomLineSchema.safeParse({ archetype: 'Striker', levers: ['one'] }).success,
    ).toBe(false);
    expect(
      SubclassBottomLineSchema.safeParse({
        archetype: 'Striker',
        levers: ['1', '2', '3', '4', '5'],
      }).success,
    ).toBe(false);
    expect(
      SubclassBottomLineSchema.safeParse({ archetype: '', levers: ['1', '2'] }).success,
    ).toBe(false);
  });
});
