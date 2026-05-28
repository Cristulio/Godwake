import { describe, it, expect } from 'vitest';
import { FIGHTER } from './fighter';

describe('Fighter class — feature layout', () => {
  const champion = FIGHTER.subclasses.find((s) => s.id === 'champion');

  it('has a Champion subclass', () => {
    expect(champion).toBeDefined();
  });

  it('Champion grants Improved Critical at L2', () => {
    const l2 = champion!.featuresByLevel['2'] ?? [];
    expect(l2.map((f) => f.id)).toContain('improved-critical');
  });

  it('Champion no longer grants Remarkable Athlete (initiative was removed)', () => {
    const l5 = champion!.featuresByLevel['5'] ?? [];
    const l7 = champion!.featuresByLevel['7'] ?? [];
    expect(l5.map((f) => f.id)).not.toContain('remarkable-athlete');
    expect(l7.map((f) => f.id)).not.toContain('remarkable-athlete');
  });

  it('Fighter base still grants Extra Attack at L5', () => {
    const l5 = FIGHTER.featuresByLevel['5'] ?? [];
    expect(l5.map((f) => f.id)).toContain('extra-attack');
  });
});
