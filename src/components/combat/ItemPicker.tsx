import type { Character } from '../../types/character';
import { getItem } from '../../content/items';
import { Button } from '../ui/Button';

interface ItemPickerProps {
  character: Character;
  onPick: (inventoryIndex: number) => void;
  onCancel: () => void;
}

export function ItemPicker({ character, onPick, onCancel }: ItemPickerProps) {
  // Group consumables by item id with counts
  const consumables = character.inventory
    .map((ref, idx) => ({ ref, idx, item: getItem(ref.itemId) }))
    .filter(({ item }) => item.kind === 'consumable');

  // Count by id for display
  const counts = new Map<string, number>();
  const firstIdxById = new Map<string, number>();
  consumables.forEach(({ item, idx }) => {
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
    if (!firstIdxById.has(item.id)) firstIdxById.set(item.id, idx);
  });

  const uniqueItems = Array.from(counts.entries()).map(([id, count]) => ({
    id,
    count,
    item: getItem(id),
    firstIdx: firstIdxById.get(id)!,
  }));

  return (
    <div
      className="fixed inset-0 z-40 bg-[var(--color-bg-base)]/80 flex items-center justify-center p-6 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[var(--color-accent-amber)] uppercase tracking-[0.3em] text-sm mb-3">
          ► Use Item
        </div>
        {uniqueItems.length === 0 ? (
          <div className="text-[var(--color-text-secondary)] text-sm italic mb-4">
            No usable items in your inventory.
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {uniqueItems.map(({ id, count, item, firstIdx }) => {
              if (item.kind !== 'consumable') return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPick(firstIdx)}
                  className="text-left p-3 border-2 border-[var(--color-border-warm)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold">
                        {item.name}
                      </div>
                      <div className="text-[var(--color-text-secondary)] text-xs italic mt-1">
                        {item.description}
                      </div>
                      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-2">
                        {item.actionCost === 'bonus' ? 'Bonus action' : 'Action'}
                        {item.healDice && ` · heal ${item.healDice}`}
                      </div>
                    </div>
                    <div className="text-[var(--color-accent-amber)] font-mono text-lg shrink-0">
                      ×{count}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
