import { describe, it, expect } from 'vitest';
import { WIZARD } from './wizard';

describe('Wizard class — arcane-tradition feature layout', () => {
  const evocation = WIZARD.subclasses.find((s) => s.id === 'evocation');

  it('has an Evocation subclass', () => {
    expect(evocation).toBeDefined();
  });

  it('no longer surfaces a choice-implying "Arcane Tradition" placeholder at L2', () => {
    const l2 = WIZARD.featuresByLevel['2'] ?? [];
    expect(l2.map((f) => f.id)).not.toContain('arcane-tradition');
  });

  it('folds Evocation → Sculpt Spells into one subclass feature at L2', () => {
    const l2 = evocation!.featuresByLevel['2'] ?? [];
    const sculpt = l2.find((f) => f.id === 'sculpt-spells');
    expect(sculpt).toBeDefined();
    expect(sculpt!.name).toBe('Arcane Tradition: Evocation');
    expect(sculpt!.mechanicKey).toBe('sculpt-spells');
  });
});
