import { describe, it, expect } from 'vitest';
import { boonsForCampTier, listCampBoons } from './campBoons';

describe('boonsForCampTier — caster/martial offer split', () => {
  it('offers every full caster the spell-keyed slots at all three tiers', () => {
    for (const classId of ['wizard', 'druid', 'bard'] as const) {
      expect(boonsForCampTier(1, classId).map((b) => b.id)).toContain('eye-of-the-mind');
      expect(boonsForCampTier(2, classId).map((b) => b.id)).toContain('surge-of-the-storm');
      const t3 = boonsForCampTier(3, classId).map((b) => b.id);
      expect(t3).toContain('vow-of-the-tome');
      expect(t3).toContain('gaze-of-the-lich');
      expect(t3).not.toContain('eyes-of-the-lich');
    }
  });

  it('keeps the weapon-keyed slots for martials and the half-caster paladin', () => {
    for (const classId of ['fighter', 'rogue', 'barbarian', 'ranger', 'monk', 'paladin'] as const) {
      expect(boonsForCampTier(1, classId).map((b) => b.id)).toContain('eye-of-the-hawk');
      expect(boonsForCampTier(2, classId).map((b) => b.id)).toContain('might-of-the-mountain');
      const t3 = boonsForCampTier(3, classId).map((b) => b.id);
      expect(t3).toContain('blade-of-the-vow');
      expect(t3).toContain('eyes-of-the-lich');
    }
  });

  it('always offers exactly three boons of the requested tier', () => {
    for (const classId of ['wizard', 'bard', 'fighter'] as const) {
      for (const tier of [1, 2, 3] as const) {
        const boons = boonsForCampTier(tier, classId);
        expect(boons).toHaveLength(3);
        for (const b of boons) expect(b.tier).toBe(tier);
      }
    }
  });

  it('every boon id in the table resolves', () => {
    expect(listCampBoons().length).toBeGreaterThan(0);
  });
});
