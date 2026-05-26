import { useMemo, useState, type DragEvent } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { getItem } from '../../content/items';
import { computeAC } from '../../engine/character/derived';
import { slotForItem, type EquipSlot } from '../../engine/character/equip';
import type { Item, ItemRef } from '../../schemas/item';
import { ItemIcon } from './ItemIcon';
import { ItemTooltip } from './ItemTooltip';

const DND_INV_MIME = 'application/x-godwake-inv-idx';
const DND_SLOT_MIME = 'application/x-godwake-slot';

interface SlotMeta {
  slot: EquipSlot;
  label: string;
  hint: string;
}

const SLOTS: SlotMeta[] = [
  { slot: 'mainHand', label: 'Main Hand', hint: 'A weapon or one-handed implement.' },
  { slot: 'offHand', label: 'Off Hand', hint: 'A shield or light weapon.' },
  { slot: 'armor', label: 'Body', hint: 'Light, medium, or heavy armor.' },
];

export function InventoryScreen() {
  const character = useGameStore((s) => s.character);
  const goToHub = useGameStore((s) => s.goToHub);
  const equipFromInventory = useGameStore((s) => s.equipFromInventory);
  const unequipSlotAction = useGameStore((s) => s.unequipSlot);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<EquipSlot | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<EquipSlot | null>(null);
  const [dragOverList, setDragOverList] = useState(false);

  const ac = useMemo(() => (character ? computeAC(character) : 0), [character]);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. Return to title.
      </div>
    );
  }

  const groups = groupInventory(character.inventory);

  function isEquippedRef(ref: ItemRef): boolean {
    if (!character) return false;
    return (
      character.equipped.mainHand === ref ||
      character.equipped.offHand === ref ||
      character.equipped.armor === ref
    );
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, inventoryIdx: number) {
    e.dataTransfer.setData(DND_INV_MIME, String(inventoryIdx));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleSlotDragOver(e: DragEvent<HTMLDivElement>, slot: EquipSlot) {
    if (!e.dataTransfer.types.includes(DND_INV_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slot);
  }

  function handleSlotDrop(e: DragEvent<HTMLDivElement>, slot: EquipSlot) {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DND_INV_MIME);
    setDragOverSlot(null);
    if (!raw) return;
    const idx = Number(raw);
    if (Number.isNaN(idx)) return;
    const ref = character?.inventory[idx];
    if (!ref) return;
    const targetSlot = slotForItem(ref.itemId);
    if (targetSlot !== slot) return;
    equipFromInventory(idx);
  }

  function handleListDragOver(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(DND_SLOT_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverList(true);
  }

  function handleListDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOverList(false);
    const slotDragged = e.dataTransfer.getData(DND_SLOT_MIME);
    if (slotDragged) {
      unequipSlotAction(slotDragged as EquipSlot);
    }
  }

  function handleSlotDragStart(e: DragEvent<HTMLDivElement>, slot: EquipSlot) {
    e.dataTransfer.setData(DND_SLOT_MIME, slot);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-wider">
            THE PACK
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {character.name} · {character.inventory.length} items · AC {ac}
          </p>
        </div>
        <Button variant="secondary" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <Panel title="Equipped" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SLOTS.map((s) => {
            const ref = character.equipped[s.slot];
            const item = ref ? getItem(ref.itemId) : null;
            const isOver = dragOverSlot === s.slot;
            return (
              <div
                key={s.slot}
                onDragOver={(e) => handleSlotDragOver(e, s.slot)}
                onDragLeave={() => setDragOverSlot((c) => (c === s.slot ? null : c))}
                onDrop={(e) => handleSlotDrop(e, s.slot)}
                onMouseEnter={() => setHoverSlot(s.slot)}
                onMouseLeave={() => setHoverSlot((c) => (c === s.slot ? null : c))}
                className={`
                  relative p-3 border-2 transition-all
                  ${isOver
                    ? 'border-[var(--color-accent-amber)] bg-[var(--color-bg-panel-hover)]'
                    : ref
                      ? 'border-[var(--color-border-warm)]'
                      : 'border-dashed border-[var(--color-border-dim)] bg-[var(--color-bg-elevated)]/40'}
                `}
              >
                <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mb-2">
                  {s.label}
                </div>
                {item && ref ? (
                  <div
                    draggable
                    onDragStart={(e) => handleSlotDragStart(e, s.slot)}
                    onDoubleClick={() => unequipSlotAction(s.slot)}
                    className="flex items-center gap-3 cursor-grab active:cursor-grabbing"
                    title="Double-click or drag to inventory to unequip"
                  >
                    <ItemIcon item={item} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold truncate">
                        {item.name}
                      </div>
                      <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest">
                        {statLine(item)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 opacity-60">
                    <div className="w-12 h-12 border border-dashed border-[var(--color-border-dim)]" />
                    <div className="text-[var(--color-text-dim)] text-xs italic">{s.hint}</div>
                  </div>
                )}
                {hoverSlot === s.slot && item && (
                  <div className="absolute z-30 left-full top-0 ml-2">
                    <ItemTooltip item={item} hint="Double-click or drag down to unequip" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={`Pack (${character.inventory.length})`}
        className={`transition-colors ${dragOverList ? 'border-[var(--color-accent-amber)]' : ''}`}
      >
        <div
          onDragOver={handleListDragOver}
          onDragLeave={() => setDragOverList(false)}
          onDrop={handleListDrop}
        >
          {character.inventory.length === 0 && (
            <div className="text-[var(--color-text-secondary)] text-sm italic py-4 text-center">
              The pack is empty.
            </div>
          )}

          {groups.map((g) => (
            <div key={g.label} className="mb-4 last:mb-0">
              <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
                {g.label}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.entries.map(({ ref, idx, item, stackCount }) => {
                  const slot = slotForItem(item.id);
                  const equippable = slot !== null;
                  const equipped = isEquippedRef(ref);
                  const hint = equipped
                    ? 'Equipped'
                    : equippable
                      ? 'Click or drag to equip'
                      : item.kind === 'consumable'
                        ? 'Use in combat'
                        : '';
                  return (
                    <div
                      key={idx}
                      draggable={equippable && !equipped}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx((c) => (c === idx ? null : c))}
                      onClick={() => {
                        if (equippable && !equipped) equipFromInventory(idx);
                      }}
                      className={`
                        relative flex items-center gap-3 p-2 border-2 transition-colors
                        ${equipped
                          ? 'border-[var(--color-accent-amber)]/60 bg-[var(--color-bg-panel-hover)]/40'
                          : 'border-[var(--color-border-warm)]'}
                        ${equippable && !equipped
                          ? 'cursor-pointer hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)]'
                          : ''}
                        ${equippable && !equipped ? 'cursor-grab active:cursor-grabbing' : ''}
                      `}
                    >
                      <ItemIcon item={item} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-[var(--color-text-primary)] uppercase tracking-wider text-sm font-bold truncate">
                            {item.name}
                          </div>
                          {stackCount > 1 && (
                            <div className="text-[var(--color-accent-amber)] font-mono text-xs shrink-0">
                              ×{stackCount}
                            </div>
                          )}
                        </div>
                        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest truncate">
                          {statLine(item)}
                        </div>
                        {equipped && (
                          <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest mt-0.5">
                            ✓ equipped
                          </div>
                        )}
                      </div>
                      {hoverIdx === idx && (
                        <div className="absolute z-30 left-full top-0 ml-2">
                          <ItemTooltip item={item} hint={hint} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--color-border-dim)] text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest text-center">
          Drag an equipped item back here to unequip · Or double-click the slot
        </div>
      </Panel>
    </div>
  );
}

interface InventoryEntry {
  ref: ItemRef;
  idx: number;
  item: Item;
  stackCount: number;
}

interface InventoryGroup {
  label: string;
  entries: InventoryEntry[];
}

function groupInventory(inventory: ItemRef[]): InventoryGroup[] {
  // Stack consumables by id (visible as ×N); keep weapons/armor as discrete
  // rows so the player can equip a specific instance and see attunement etc.
  const weapons: InventoryEntry[] = [];
  const armor: InventoryEntry[] = [];
  const consumables = new Map<string, InventoryEntry>();
  const other: InventoryEntry[] = [];

  inventory.forEach((ref, idx) => {
    const item = getItem(ref.itemId);
    if (item.kind === 'weapon') {
      weapons.push({ ref, idx, item, stackCount: 1 });
    } else if (item.kind === 'armor') {
      armor.push({ ref, idx, item, stackCount: 1 });
    } else if (item.kind === 'consumable') {
      const existing = consumables.get(item.id);
      if (existing) {
        existing.stackCount += 1;
      } else {
        consumables.set(item.id, { ref, idx, item, stackCount: 1 });
      }
    } else {
      other.push({ ref, idx, item, stackCount: 1 });
    }
  });

  const result: InventoryGroup[] = [];
  if (weapons.length) result.push({ label: 'Weapons', entries: weapons });
  if (armor.length) result.push({ label: 'Armor & Shields', entries: armor });
  if (consumables.size) result.push({ label: 'Consumables', entries: [...consumables.values()] });
  if (other.length) result.push({ label: 'Other', entries: other });
  return result;
}

function statLine(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return `${item.damage} ${item.damageType}${item.versatileDamage ? ` (${item.versatileDamage} 2h)` : ''}`;
    case 'armor':
      return item.category === 'shield' ? `+${item.baseAC} AC shield` : `${item.category} · AC ${item.baseAC}`;
    case 'consumable':
      return item.healDice ? `heal ${item.healDice}` : item.effect;
  }
}
