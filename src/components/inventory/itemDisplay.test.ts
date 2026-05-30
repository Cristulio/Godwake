import { describe, it, expect } from 'vitest';
import { baseStatLine, itemTypeLabel } from './itemDisplay';
import { getItem } from '../../content/items';

describe('baseStatLine', () => {
  it('reads a weapon base damage (shop rows are not "affixes only")', () => {
    expect(baseStatLine(getItem('shortbow'))).toMatch(/d\d/);
    expect(baseStatLine(getItem('longsword'))).toContain('slashing');
  });

  it('shows an accessory by the slot it fills, with no "affixes only" tag', () => {
    const line = baseStatLine(getItem('bone-charm'));
    expect(line).toBe('Amulet');
    expect(line.toLowerCase()).not.toContain('affix');
  });
});

describe('itemTypeLabel', () => {
  it('names the slot/type an item fills', () => {
    expect(itemTypeLabel(getItem('iron-ring'))).toBe('Ring');
    expect(itemTypeLabel(getItem('bone-charm'))).toBe('Amulet');
    expect(itemTypeLabel(getItem('shortbow'))).toBe('Weapon');
    expect(itemTypeLabel(getItem('shield'))).toBe('Shield');
  });
});
