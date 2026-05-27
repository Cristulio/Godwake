import { useMemo, useState, type DragEvent } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { getItem } from '../../content/items';
import { computeAC } from '../../engine/character/derived';
import {
  slotForItem,
  attunementSlotsCap,
  attunementSlotsUsed,
  canEquip,
  type EquipSlot,
} from '../../engine/character/equip';
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
  const [dragInvalidSlot, setDragInvalidSlot] = useState<EquipSlot | null>(null);
  const [dragOverList, setDragOverList] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const ac = useMemo(() => (character ? computeAC(character) : 0), [character]);
  const attUsed = useMemo(() => (character ? attunementSlotsUsed(character) : 0), [character]);
  const attCap = useMemo(() => (character ? attunementSlotsCap(character) : 0), [character]);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. Return to title.
      </div>
    );
  }

  const groups = groupInventory(character.inventory);

  // Identity-based comparison breaks across JSON persist/rehydrate AND the
  // starting kit defines equipped slots with separate object literals from
  // inventory. Resolve each equipped slot to an inventory index (identity
  // first, itemId fallback) so equipped items in the bag are highlighted
  // correctly in every state.
  const equippedIdxSet = new Set<number>();
  for (const slot of ['mainHand', 'offHand', 'armor'] as const) {
    const ref = character.equipped[slot];
    if (!ref) continue;
    let idx = character.inventory.indexOf(ref);
    if (idx === -1) {
      idx = character.inventory.findIndex(
        (inv, i) => !equippedIdxSet.has(i) && inv.itemId === ref.itemId,
      );
    }
    if (idx !== -1) equippedIdxSet.add(idx);
  }

  function isEquippedIdx(idx: number): boolean {
    return equippedIdxSet.has(idx);
  }

  function hasAttunementEquipped(): boolean {
    for (const slot of ['mainHand', 'offHand', 'armor'] as const) {
      const ref = character?.equipped[slot];
      if (!ref) continue;
      const item = getItem(ref.itemId);
      if (item.kind !== 'consumable' && (item as { attunement: boolean }).attunement) return true;
    }
    return false;
  }

  function attunementOnSlot(slot: EquipSlot): boolean {
    const ref = character?.equipped[slot];
    if (!ref) return false;
    const item = getItem(ref.itemId);
    if (item.kind === 'consumable') return false;
    return (item as { attunement: boolean }).attunement;
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, inventoryIdx: number) {
    e.dataTransfer.setData(DND_INV_MIME, String(inventoryIdx));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
    setDragOverSlot(null);
    setDragInvalidSlot(null);
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
    setDragInvalidSlot(null);
    if (!raw) return;
    const idx = Number(raw);
    if (Number.isNaN(idx)) return;
    const ref = character?.inventory[idx];
    if (!ref) return;
    const targetSlot = slotForItem(ref.itemId);
    if (targetSlot !== slot) {
      setDragInvalidSlot(slot);
      setTimeout(() => setDragInvalidSlot(null), 320);
      return;
    }
    if (character && !canEquip(character, ref.itemId)) {
      setDragInvalidSlot(slot);
      setTimeout(() => setDragInvalidSlot(null), 320);
      return;
    }
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

  const attAtCap = attUsed >= attCap;

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex justify-between items-end mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            INVENTORY
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1 font-mono">
            {character.name} · {character.inventory.length} items · AC {ac}
          </p>
        </div>
        <Button variant="ghost" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 mb-6">
        <Panel title="Equipped" tone="warm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SLOTS.map((s) => {
              const ref = character.equipped[s.slot];
              const item = ref ? getItem(ref.itemId) : null;
              const isOver = dragOverSlot === s.slot;
              const isInvalid = dragInvalidSlot === s.slot;
              const itemTargetSlot = isDragging && hoverIdx !== null
                ? slotForItem(character.inventory[hoverIdx]?.itemId ?? '')
                : null;
              void itemTargetSlot;
              const attuned = attunementOnSlot(s.slot);
              return (
                <div
                  key={s.slot}
                  onDragOver={(e) => handleSlotDragOver(e, s.slot)}
                  onDragLeave={() => setDragOverSlot((c) => (c === s.slot ? null : c))}
                  onDrop={(e) => handleSlotDrop(e, s.slot)}
                  onMouseEnter={() => setHoverSlot(s.slot)}
                  onMouseLeave={() => setHoverSlot((c) => (c === s.slot ? null : c))}
                  className={`
                    relative w-full min-h-[124px] p-3 border-2 transition-all
                    bg-gradient-to-br from-[var(--color-bg-deep)] to-[var(--color-bg-elevated)]
                    ${isInvalid
                      ? 'border-[var(--color-accent-blood)] animate-shake-soft scale-105'
                      : isOver
                        ? 'border-[var(--color-accent-amber)] scale-[1.04] shadow-[0_0_22px_rgba(244,167,66,0.45)]'
                        : attuned
                          ? 'border-[var(--color-accent-gold)] shadow-[0_0_14px_rgba(212,176,98,0.25)]'
                          : ref
                            ? 'border-[var(--color-border-warm)]'
                            : 'border-dashed border-[var(--color-border-dim)]'}
                  `}
                >
                  <div className="font-display text-[var(--color-accent-amber)] text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="text-[var(--color-accent-gold)]">◆</span>
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
                      <ItemIcon item={item} size={56} />
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[var(--color-text-primary)] uppercase tracking-wider text-[11px] truncate">
                          {item.name}
                        </div>
                        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-mono mt-0.5">
                          {statLine(item)}
                        </div>
                        {attuned && (
                          <div className="text-[var(--color-accent-gold)] text-[9px] uppercase tracking-widest font-display mt-1">
                            ◆ Attuned
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-60">
                      <div className="w-14 h-14 border border-dashed border-[var(--color-border-dim)] flex items-center justify-center text-[var(--color-text-muted)] text-2xl">
                        ◇
                      </div>
                      <div className="text-[var(--color-text-dim)] text-[10px] italic font-mono leading-snug">{s.hint}</div>
                    </div>
                  )}
                  {hoverSlot === s.slot && item && !isDragging && (
                    <div className="absolute z-30 left-full top-0 ml-2">
                      <ItemTooltip item={item} hint="Double-click or drag down to unequip" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <div
          className={`
            panel-etched-warm border-2 p-4 flex flex-col justify-center
            ${attAtCap
              ? 'border-[var(--color-accent-gold)] animate-pulse-glow'
              : 'border-[var(--color-border-warm)]'}
          `}
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center gap-1">
            <span className="text-[var(--color-accent-gold)]">◆</span>
            Attunement
          </div>
          <div
            className={`font-mono text-2xl ${
              attAtCap ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-accent-amber)]'
            }`}
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7), 0 0 10px rgba(244,167,66,0.3)' }}
          >
            {attUsed} <span className="text-[var(--color-text-dim)]">/</span> {attCap}
          </div>
          <div className="font-mono text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mt-1">
            {attAtCap ? 'slots full' : `${attCap - attUsed} free`}
          </div>
          {hasAttunementEquipped() && (
            <div className="mt-2 text-[9px] uppercase tracking-widest text-[var(--color-accent-gold)] font-display">
              ◆ Soul-bound items active
            </div>
          )}
        </div>
      </div>

      <Panel
        title={`Backpack (${character.inventory.length})`}
        tone="default"
        className={`transition-colors ${dragOverList ? 'border-[var(--color-accent-amber)]' : ''}`}
      >
        <div
          onDragOver={handleListDragOver}
          onDragLeave={() => setDragOverList(false)}
          onDrop={handleListDrop}
        >
          {character.inventory.length === 0 && (
            <div className="text-[var(--color-text-secondary)] text-sm italic py-4 text-center font-narrative">
              Your backpack is empty.
            </div>
          )}

          {groups.map((g) => (
            <div key={g.label} className="mb-4 last:mb-0">
              <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                <span className="text-[var(--color-accent-gold)]/60">◆</span>
                {g.label}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.entries.map(({ idx, item, stackCount }) => {
                  const slot = slotForItem(item.id);
                  const equippable = slot !== null;
                  const equipped = isEquippedIdx(idx);
                  const blocked = equippable && !equipped && !canEquip(character!, item.id);
                  const isAttunement =
                    item.kind !== 'consumable' && (item as { attunement: boolean }).attunement;
                  const hint = equipped
                    ? 'Equipped'
                    : blocked
                      ? `No free attunement slot (${attUsed}/${attCap})`
                      : equippable
                        ? 'Click or drag to equip'
                        : item.kind === 'consumable'
                          ? 'Use in combat'
                          : '';
                  return (
                    <div
                      key={idx}
                      draggable={equippable && !equipped && !blocked}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx((c) => (c === idx ? null : c))}
                      onClick={() => {
                        if (equippable && !equipped && !blocked) equipFromInventory(idx);
                      }}
                      className={`
                        relative flex items-center gap-3 p-2 border-2 transition-all
                        bg-gradient-to-br from-[var(--color-bg-panel)] to-[var(--color-bg-elevated)]
                        ${equipped
                          ? 'border-[var(--color-accent-amber)]/70 shadow-[inset_0_0_12px_rgba(244,167,66,0.12)]'
                          : blocked
                            ? 'border-[var(--color-border-dim)] opacity-50'
                            : 'border-[var(--color-border-warm)]'}
                        ${equippable && !equipped && !blocked
                          ? 'cursor-pointer hover:bg-[var(--color-bg-panel-hover)] hover:border-[var(--color-accent-amber)] hover:shadow-[0_0_14px_rgba(244,167,66,0.2)] cursor-grab active:cursor-grabbing'
                          : ''}
                        ${blocked ? 'cursor-not-allowed' : ''}
                      `}
                    >
                      <ItemIcon item={item} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-display text-[var(--color-text-primary)] uppercase tracking-wider text-[11px] truncate">
                            {item.name}
                          </div>
                          {stackCount > 1 && (
                            <div className="text-[var(--color-accent-amber)] font-mono text-xs shrink-0">
                              ×{stackCount}
                            </div>
                          )}
                        </div>
                        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest truncate font-mono mt-0.5">
                          {statLine(item)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {equipped && (
                            <div className="font-display text-[var(--color-accent-amber)] text-[9px] uppercase tracking-widest">
                              ✓ equipped
                            </div>
                          )}
                          {isAttunement && (
                            <div className="font-display text-[var(--color-accent-gold)] text-[9px] uppercase tracking-widest">
                              ◆ Attuned
                            </div>
                          )}
                        </div>
                      </div>
                      {hoverIdx === idx && !isDragging && (
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
        <div className="mt-4 pt-3 border-t border-[var(--color-border-dim)] text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest text-center font-mono">
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
