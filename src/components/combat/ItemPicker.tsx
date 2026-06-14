import { useEffect } from 'react';
import type { Character } from '../../types/character';
import { getItem } from '../../content/items';
import { Button } from '../ui/Button';
import { ItemIcon } from '../inventory/ItemIcon';
import { useT } from '../../i18n/useT';

interface ItemPickerProps {
  character: Character;
  onPick: (inventoryIndex: number) => void;
  onCancel: () => void;
}

export function ItemPicker({ character, onPick, onCancel }: ItemPickerProps) {
  const { t, tc } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
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
        className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] p-5 max-w-md w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[var(--color-accent-amber)] uppercase tracking-[0.3em] text-sm mb-3 shrink-0">
          {t('combat.itemPicker.title')}
        </div>
        {uniqueItems.length === 0 ? (
          <div className="text-[var(--color-text-secondary)] text-sm italic mb-4">
            {t('combat.itemPicker.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4 flex-1 overflow-y-auto min-h-0 -mr-2 pr-2">
            {uniqueItems.map(({ id, count, item, firstIdx }) => {
              if (item.kind !== 'consumable') return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPick(firstIdx)}
                  className="text-left p-3 border-2 border-[var(--color-border-warm)] hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <ItemIcon item={item} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold">
                          {tc('items', item.id, 'name', item.name)}
                        </div>
                        <div className="text-[var(--color-accent-amber)] font-mono text-lg shrink-0">
                          ×{count}
                        </div>
                      </div>
                      <div className="text-[var(--color-text-secondary)] text-xs italic mt-1">
                        {tc('items', item.id, 'description', item.description ?? '')}
                      </div>
                      <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-2">
                        {item.actionCost === 'bonus' ? t('combat.itemPicker.bonusAction') : t('combat.itemPicker.action')}
                        {item.healDice && ` · ${t('combat.itemPicker.heal', { dice: item.healDice })}`}
                        {item.healPercent && ` · ${t('combat.itemPicker.healPct', { pct: item.healPercent })}`}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end shrink-0">
          <Button variant="secondary" onClick={onCancel}>
            {t('combat.itemPicker.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
