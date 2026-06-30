import { describe, it, expect } from 'vitest';
import { baseStatLine, itemTypeLabel, twoHandedScaledTag } from './itemDisplay';
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

describe('twoHandedScaledTag', () => {
  const greataxe = getItem('greataxe'); // heavy two-handed → earns the premium
  const longsword = getItem('longsword'); // one-handed → no premium

  it('shows the ×1.35 amplified value of each affix on a true two-hander', () => {
    expect(twoHandedScaledTag('cruel', greataxe)).toBe('+3'); // damageBonus 2 → 3
    expect(twoHandedScaledTag('honed', greataxe)).toBe('+2'); // attackBonus 1 → 2
    expect(twoHandedScaledTag('vampiric', greataxe)).toBe('7%'); // lifestealPct 5 → 7
    expect(twoHandedScaledTag('keen', greataxe)).toBe('18–20'); // critRangeBonus 1 → 2
    expect(twoHandedScaledTag('bloodletting', greataxe)).toBe('3'); // bleedDamage 2 → 3 (bare)
  });

  it('is null on a one-handed weapon (no premium to disclose)', () => {
    expect(twoHandedScaledTag('cruel', longsword)).toBeNull();
    expect(twoHandedScaledTag('vampiric', longsword)).toBeNull();
  });

  it('is null for an unknown affix id', () => {
    expect(twoHandedScaledTag('not-a-real-affix', greataxe)).toBeNull();
  });
});
