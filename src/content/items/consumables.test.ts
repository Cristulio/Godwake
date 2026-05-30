import { describe, it, expect } from 'vitest';
import { getItem } from './index';
import type { Consumable } from '../../schemas/item';

/**
 * Healing draughts and antitoxin are quaffed as a BONUS action so a wounded
 * delver can top up and still attack the same turn. No consumable should cost
 * a full action.
 */
describe('consumables — quick-quaff action economy', () => {
  const bonusIds = [
    'potion-of-healing',
    'potion-of-greater-healing',
    'potion-of-heroism',
    'antitoxin',
  ];

  it.each(bonusIds)('%s costs a bonus action', (id) => {
    const item = getItem(id) as Consumable;
    expect(item.kind).toBe('consumable');
    expect(item.actionCost).toBe('bonus');
  });
});
