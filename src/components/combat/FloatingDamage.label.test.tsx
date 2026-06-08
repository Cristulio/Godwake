import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FloatingDamage, type FloatingDamageItem } from './FloatingDamage';

function labelFor(kind: FloatingDamageItem['kind']): string {
  const { container } = render(<FloatingDamage items={[{ id: 1, amount: 0, kind }]} />);
  return container.textContent ?? '';
}

describe('FloatingDamage — control verdict labels', () => {
  it('floats LANDED for a control spell that took hold', () => {
    expect(labelFor('landed')).toBe('LANDED');
  });

  it('floats RESISTED for a control spell the foe shrugged off', () => {
    expect(labelFor('resisted')).toBe('RESISTED');
  });

  it('still floats MISS for a whiffed swing (unchanged)', () => {
    expect(labelFor('miss')).toBe('MISS');
  });
});
