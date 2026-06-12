import { describe, it, expect } from 'vitest';
import { boonsForCampTier, listCampBoons } from './campBoons';

/** The offer split is LEAN-aware (combatLean — class + subclass), not the
 *  blunt full-caster list: a Radiant paladin draws the spell levers, a Valor
 *  bard or Moon druid keeps the weapon ones. */
describe('boonsForCampTier — lean-based offer split', () => {
  const LEAN_CASTERS = [
    { classId: 'wizard', subclassId: null },
    { classId: 'druid', subclassId: null },
    { classId: 'bard', subclassId: null },
    { classId: 'bard', subclassId: 'lore' },
    { classId: 'paladin', subclassId: 'radiant' },
  ] as const;

  const LEAN_MARTIALS = [
    { classId: 'fighter', subclassId: null },
    { classId: 'rogue', subclassId: null },
    { classId: 'barbarian', subclassId: null },
    { classId: 'ranger', subclassId: null },
    { classId: 'monk', subclassId: null },
    { classId: 'paladin', subclassId: null },
    { classId: 'paladin', subclassId: 'bulwark' },
    { classId: 'bard', subclassId: 'valor' },
    { classId: 'druid', subclassId: 'circle-of-the-moon' },
  ] as const;

  it('offers every lean-caster soul the spell-keyed slots at all three tiers', () => {
    for (const c of LEAN_CASTERS) {
      expect(boonsForCampTier(1, c).map((b) => b.id)).toContain('eye-of-the-mind');
      expect(boonsForCampTier(2, c).map((b) => b.id)).toContain('surge-of-the-storm');
      const t3 = boonsForCampTier(3, c).map((b) => b.id);
      expect(t3).toContain('vow-of-the-tome');
      expect(t3).toContain('gaze-of-the-lich');
      expect(t3).not.toContain('eyes-of-the-lich');
    }
  });

  it('keeps the weapon-keyed slots for every lean-martial soul (incl. monk, the un-sworn paladin, Bulwark, Valor, Moon)', () => {
    for (const c of LEAN_MARTIALS) {
      expect(boonsForCampTier(1, c).map((b) => b.id)).toContain('eye-of-the-hawk');
      expect(boonsForCampTier(2, c).map((b) => b.id)).toContain('might-of-the-mountain');
      const t3 = boonsForCampTier(3, c).map((b) => b.id);
      expect(t3).toContain('blade-of-the-vow');
      expect(t3).toContain('eyes-of-the-lich');
    }
  });

  it('the paladin oath flips the offer: Radiant spell side, Bulwark weapon side', () => {
    const radiant = boonsForCampTier(3, { classId: 'paladin', subclassId: 'radiant' }).map(
      (b) => b.id,
    );
    const bulwark = boonsForCampTier(3, { classId: 'paladin', subclassId: 'bulwark' }).map(
      (b) => b.id,
    );
    expect(radiant).toContain('gaze-of-the-lich');
    expect(bulwark).toContain('eyes-of-the-lich');
    expect(radiant).not.toContain('eyes-of-the-lich');
    expect(bulwark).not.toContain('gaze-of-the-lich');
  });

  it('always offers exactly three boons of the requested tier', () => {
    for (const c of [
      { classId: 'wizard', subclassId: null },
      { classId: 'bard', subclassId: 'valor' },
      { classId: 'fighter', subclassId: null },
    ] as const) {
      for (const tier of [1, 2, 3] as const) {
        const boons = boonsForCampTier(tier, c);
        expect(boons).toHaveLength(3);
        for (const b of boons) expect(b.tier).toBe(tier);
      }
    }
  });

  it('every boon id in the table resolves', () => {
    expect(listCampBoons().length).toBeGreaterThan(0);
  });
});
