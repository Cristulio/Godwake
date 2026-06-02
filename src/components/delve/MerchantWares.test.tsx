import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GearWareRow } from './MerchantWares';
import type { GearStock } from './shopStock';

function gearStock(enhancement: number): GearStock {
  return {
    cost: 50,
    ref: {
      itemId: 'longsword',
      rolled: {
        baseId: 'longsword',
        rarity: 'green',
        affixes: ['honed'],
        enhancement,
        name: 'Honed Longsword',
      },
    },
  };
}

describe('GearWareRow enhancement line', () => {
  it('renders no stray "0" for an affix-only item with enhancement 0', () => {
    const { container } = render(
      <GearWareRow stock={gearStock(0)} bought={false} gold={1000} onBuy={() => {}} />,
    );
    // The affix-list container holds only ◆-prefixed lines — never a bare "0"
    // from the `{0 && …}` JSX footgun.
    const affixList = container.querySelector('.space-y-0\\.5')!;
    expect(affixList.textContent?.trim().startsWith('◆')).toBe(true);
    expect(affixList.textContent).not.toContain('0');
  });

  it('shows the +N enhancement line when enhancement is 2', () => {
    const { container } = render(
      <GearWareRow stock={gearStock(2)} bought={false} gold={1000} onBuy={() => {}} />,
    );
    expect(container.textContent).toContain('+2 to attack and damage rolls');
  });
});
