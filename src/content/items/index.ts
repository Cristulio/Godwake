import type { Item } from '../../schemas/item';
import { ALL_WEAPONS } from './weapons';
import { ALL_ARMOR } from './armor';
import { ALL_CONSUMABLES } from './consumables';

const ALL_ITEMS: Item[] = [...ALL_WEAPONS, ...ALL_ARMOR, ...ALL_CONSUMABLES];

const ITEM_BY_ID: Map<string, Item> = new Map(ALL_ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): Item {
  const item = ITEM_BY_ID.get(id);
  if (!item) {
    throw new Error(`Item not found: ${id}`);
  }
  return item;
}

export function listItems(): Item[] {
  return ALL_ITEMS;
}

export * from './weapons';
export * from './armor';
export * from './consumables';
