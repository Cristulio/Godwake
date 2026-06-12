import { useMemo, useState, type DragEvent } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { getItem } from '../../content/items';
import { computeAC, critRange } from '../../engine/character/derived';
import {
  slotForItem,
  canEquip,
  equipDenialReason,
  equippedInventoryIndices,
  type EquipSlot,
  itemEquipNote,
  equippedRefsForItemSlot,
} from '../../engine/character/equip';
import { martialArtsWeaponId, MONK_UNARMED_DAMAGE_EDGE } from '../../engine/combat/monk';
import { rolledItemCost } from '../../engine/items/rollItem';
import type { Item, ItemRef } from '../../schemas/item';
import { ItemIcon } from './ItemIcon';
import { ItemTooltip } from './ItemTooltip';
import { TouchTooltip } from '../ui/TouchTooltip';
import { GEAR_RARITY_COLOR } from './rarity';
import { baseStatLine, localizedItemName } from './itemDisplay';
import { GEAR_SETS, setSize, setProgress } from '../../content/sets';
import { equippedSetIds } from '../../engine/items';
import type { Character } from '../../types/character';
import { useT } from '../../i18n/useT';

const DND_INV_MIME = 'application/x-godwake-inv-idx';
const DND_SLOT_MIME = 'application/x-godwake-slot';

const SLOTS: EquipSlot[] = [
  'mainHand',
  'offHand',
  'armor',
  'helm',
  'amulet',
  'belt',
  'ring1',
  'ring2',
  'boots',
];

export function InventoryScreen() {
  const { t } = useT();
  const character = useGameStore((s) => s.character);
  const delve = useGameStore((s) => s.delve);
  const goToHub = useGameStore((s) => s.goToHub);
  const goToDelve = useGameStore((s) => s.goToDelve);
  const equipFromInventory = useGameStore((s) => s.equipFromInventory);
  const equipToSlot = useGameStore((s) => s.equipToSlot);
  const unequipSlotAction = useGameStore((s) => s.unequipSlot);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<EquipSlot | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<EquipSlot | null>(null);
  const [dragInvalidSlot, setDragInvalidSlot] = useState<EquipSlot | null>(null);
  const [dragOverList, setDragOverList] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // A tall tooltip (an epic with many affixes) anchored to a near-bottom row
  // used to run off the viewport, spawn a page scrollbar, reflow the list, and
  // re-fire the row's hover → an endless jitter. Anchor to whichever vertical
  // side of the row has more room and cap the height to that space, so the
  // absolute panel can never extend past the viewport.
  const [tip, setTip] = useState<{ flip: boolean; flipX: boolean; maxH: number }>({
    flip: false,
    flipX: false,
    maxH: 600,
  });

  function placeTip(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const pad = 12;
    const below = window.innerHeight - rect.top - pad;
    const above = rect.bottom - pad;
    const flip = above > below;
    // Tooltip is w-64 (256px) anchored one side of the row with a ~8px margin.
    // If the right side can't fit it but the left has more room, flip to the left
    // so it never spills off the viewport edge.
    const tipW = 256 + 8;
    const spaceRight = window.innerWidth - rect.right - pad;
    const spaceLeft = rect.left - pad;
    const flipX = spaceRight < tipW && spaceLeft > spaceRight;
    setTip({ flip, flipX, maxH: Math.max(160, Math.floor(flip ? above : below)) });
  }

  const ac = useMemo(() => (character ? computeAC(character) : 0), [character]);
  const critLabel = useMemo(() => {
    if (!character) return '20';
    const band = critRange(character);
    return band.length <= 1 ? '20' : `${band[0]}-20`;
  }, [character]);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        {t('screens.inventory.noCharacter')}
      </div>
    );
  }

  const groups = groupInventory(character.inventory);

  const equippedIdxSet = equippedInventoryIndices(character);

  function isEquippedIdx(idx: number): boolean {
    return equippedIdxSet.has(idx);
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
    // Auto-route: any equippable item dropped on any slot goes where it belongs
    // (a helm on the boots well still equips the helm). Rings honour the exact
    // band they land on, so ring1/ring2 stay independent.
    if (slotForItem(ref.itemId) === null || (character && !canEquip(character, ref.itemId))) {
      setDragInvalidSlot(slot);
      setTimeout(() => setDragInvalidSlot(null), 320);
      return;
    }
    equipToSlot(idx, slot);
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
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 items-start mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            {t('screens.inventory.heading')}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1 font-mono">
            {t('screens.inventory.subtitle', {
              name: character.name,
              n: character.inventory.length,
              ac,
              crit: critLabel,
            })}
          </p>
        </div>
        {delve ? (
          <Button variant="ghost" onClick={goToDelve}>
            {t('screens.inventory.backToDelve')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={goToHub}>
            {t('screens.inventory.backPhandalin')}
          </Button>
        )}
      </header>

      <div className="mb-6">
        <Panel title={t('screens.inventory.equipped')} tone="warm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SLOTS.map((slot) => {
              const ref = character.equipped[slot];
              const item = ref ? getItem(ref.itemId) : null;
              const isOver = dragOverSlot === slot;
              const isInvalid = dragInvalidSlot === slot;
              const itemTargetSlot = isDragging && hoverIdx !== null
                ? slotForItem(character.inventory[hoverIdx]?.itemId ?? '')
                : null;
              void itemTargetSlot;
              return (
                <div
                  key={slot}
                  onDragOver={(e) => handleSlotDragOver(e, slot)}
                  onDragLeave={() => setDragOverSlot((c) => (c === slot ? null : c))}
                  onDrop={(e) => handleSlotDrop(e, slot)}
                  onMouseEnter={(e) => {
                    setHoverSlot(slot);
                    placeTip(e.currentTarget);
                  }}
                  onMouseLeave={() => setHoverSlot((c) => (c === slot ? null : c))}
                  className={`
                    relative w-full min-h-[124px] p-3 border-2 transition-all
                    bg-gradient-to-br from-[var(--color-bg-deep)] to-[var(--color-bg-elevated)]
                    ${isInvalid
                      ? 'border-[var(--color-accent-blood)] animate-shake-soft scale-105'
                      : isOver
                        ? 'border-[var(--color-accent-amber)] scale-[1.04] shadow-[0_0_22px_rgba(244,167,66,0.45)]'
                        : ref
                          ? 'border-[var(--color-border-warm)]'
                          : 'border-dashed border-[var(--color-border-dim)]'}
                  `}
                >
                  <div className="font-display text-[var(--color-accent-amber)] text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="text-[var(--color-accent-gold)]">◆</span>
                    {t(`screens.inventory.slot.${slot}`)}
                  </div>
                  {item && ref ? (
                    <div
                      draggable
                      onDragStart={(e) => handleSlotDragStart(e, slot)}
                      onDoubleClick={() => unequipSlotAction(slot)}
                      className="flex items-center gap-3 cursor-grab active:cursor-grabbing"
                      title={t('screens.inventory.unequipTitle')}
                    >
                      <ItemIcon item={item} size={56} gearRarity={ref.rolled?.rarity} />
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-display uppercase tracking-wider text-[11px] truncate"
                          style={{
                            color: ref.rolled
                              ? GEAR_RARITY_COLOR[ref.rolled.rarity]
                              : 'var(--color-text-primary)',
                          }}
                        >
                          {localizedItemName(ref)}
                        </div>
                        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-mono mt-0.5">
                          {baseStatLine(item)}
                        </div>
                      </div>
                    </div>
                  ) : slot === 'mainHand' && character.classId === 'monk' ? (
                    <UnarmedHand character={character} />
                  ) : (
                    <div className="flex items-center gap-3 opacity-60">
                      <div className="w-14 h-14 border border-dashed border-[var(--color-border-dim)] flex items-center justify-center text-[var(--color-text-muted)] text-2xl">
                        ◇
                      </div>
                      <div className="text-[var(--color-text-dim)] text-[10px] italic font-mono leading-snug">{t(`screens.inventory.slotHint.${slot}`)}</div>
                    </div>
                  )}
                  {hoverSlot === slot && item && !isDragging && (
                    <div
                      className={`absolute z-30 ${tip.flipX ? 'right-full mr-2' : 'left-full ml-2'} hidden md:block pointer-events-none overflow-y-auto ${tip.flip ? 'bottom-0' : 'top-0'}`}
                      style={{ maxHeight: tip.maxH }}
                    >
                      <ItemTooltip
                        item={item}
                        rolled={ref?.rolled}
                        rolledCost={ref?.rolled ? rolledItemCost(ref) : undefined}
                        equipWarning={
                          character ? itemEquipNote(character, item) ?? undefined : undefined
                        }
                        hint={t('screens.inventory.unequipHintDesktop')}
                      />
                    </div>
                  )}
                  {item && ref && (
                    <div className="md:hidden absolute top-2 right-2 z-30">
                      <TouchTooltip
                        bare
                        placement="bottom"
                        label={t('screens.inventory.detailsAria', {
                          name: localizedItemName(ref),
                        })}
                        className="flex items-center justify-center w-8 h-8 border border-[var(--color-border-warm)] bg-[var(--color-bg-deep)]/85 text-[var(--color-accent-amber)] text-sm leading-none"
                        content={
                          <ItemTooltip
                            item={item}
                            rolled={ref.rolled}
                            rolledCost={ref.rolled ? rolledItemCost(ref) : undefined}
                            equipWarning={
                              character ? itemEquipNote(character, item) ?? undefined : undefined
                            }
                            hint={t('screens.inventory.unequipHintTouch')}
                          />
                        }
                      >
                        i
                      </TouchTooltip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

      </div>

      <SetProgressPanel character={character} />

      <Panel
        title={t('screens.inventory.backpack', { n: character.inventory.length })}
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
              {t('screens.inventory.empty')}
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key} className="mb-4 last:mb-0">
              <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                <span className="text-[var(--color-accent-gold)]/60">◆</span>
                {t(`screens.inventory.group.${g.key}`)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.entries.map(({ ref, idx, item, stackCount }) => {
                  const slot = slotForItem(item.id);
                  const equippable = slot !== null;
                  const equipped = isEquippedIdx(idx);
                  const denial =
                    equippable && !equipped ? equipDenialReason(character!, item.id) : null;
                  const blocked = denial !== null;
                  const hint = equipped
                    ? t('screens.inventory.hintEquipped')
                    : denial
                      ? denial
                      : equippable
                        ? t('screens.inventory.hintEquip')
                        : item.kind === 'consumable'
                          ? t('screens.inventory.hintUseInCombat')
                          : '';
                  return (
                    <div
                      key={idx}
                      draggable={equippable && !equipped && !blocked}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={(e) => {
                        setHoverIdx(idx);
                        placeTip(e.currentTarget);
                      }}
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
                      <ItemIcon item={item} size={44} gearRarity={ref.rolled?.rarity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div
                            className="font-display uppercase tracking-wider text-[11px] truncate"
                            style={{
                              color: ref.rolled
                                ? GEAR_RARITY_COLOR[ref.rolled.rarity]
                                : 'var(--color-text-primary)',
                            }}
                          >
                            {localizedItemName(ref)}
                          </div>
                          {stackCount > 1 && (
                            <div className="text-[var(--color-accent-amber)] font-mono text-xs shrink-0">
                              ×{stackCount}
                            </div>
                          )}
                        </div>
                        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest truncate font-mono mt-0.5">
                          {baseStatLine(item)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {equipped && (
                            <div className="font-display text-[var(--color-accent-amber)] text-[9px] uppercase tracking-widest">
                              {t('screens.inventory.equippedTag')}
                            </div>
                          )}
                        </div>
                      </div>
                      {hoverIdx === idx && !isDragging && (
                        <div
                          className={`absolute z-30 ${tip.flipX ? 'right-full mr-2' : 'left-full ml-2'} hidden md:block pointer-events-none overflow-y-auto ${tip.flip ? 'bottom-0' : 'top-0'}`}
                          style={{ maxHeight: tip.maxH }}
                        >
                          <ItemTooltip
                            item={item}
                            rolled={ref.rolled}
                            rolledCost={ref.rolled ? rolledItemCost(ref) : undefined}
                            equipWarning={
                              character ? itemEquipNote(character, item) ?? undefined : undefined
                            }
                            hint={hint}
                          />
                          {/* Compare-with-equipped (the shop's hover, owner-asked for
                              the backpack too): what you'd be replacing, both rings. */}
                          {!equipped &&
                            character &&
                            equippedRefsForItemSlot(character, ref.itemId).map((eref, ei) => (
                              <div className="mt-1" key={`${eref.itemId}-${ei}`}>
                                <ItemTooltip
                                  item={getItem(eref.itemId)}
                                  rolled={eref.rolled}
                                  rolledCost={rolledItemCost(eref)}
                                  hint={t('delve.wares.currentlyEquipped')}
                                />
                              </div>
                            ))}
                        </div>
                      )}
                      <div className="md:hidden shrink-0">
                        <TouchTooltip
                          bare
                          placement="bottom"
                          label={t('screens.inventory.detailsAria', {
                            name: localizedItemName(ref),
                          })}
                          className="flex items-center justify-center w-8 h-8 border border-[var(--color-border-warm)] bg-[var(--color-bg-deep)]/85 text-[var(--color-accent-amber)] text-sm leading-none"
                          content={
                            <ItemTooltip
                              item={item}
                              rolled={ref.rolled}
                              rolledCost={ref.rolled ? rolledItemCost(ref) : undefined}
                              equipWarning={
                                character ? itemEquipNote(character, item) ?? undefined : undefined
                              }
                              hint={hint}
                            />
                          }
                        >
                          i
                        </TouchTooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--color-border-dim)] text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest text-center font-mono">
          {t('screens.inventory.footer')}
        </div>
      </Panel>
    </div>
  );
}

/**
 * The monk's empty main-hand IS the weapon. Render the living unarmed state —
 * the level-scaled Martial Arts die plus the bare-hand edge — in place of the
 * generic empty-slot hint. Deliberately NOT an item card: there is nothing
 * equipped, nothing to drag out, and no phantom "Fists" occupying the slot.
 */
function UnarmedHand({ character }: { character: Character }) {
  const { t } = useT();
  const ma = getItem(martialArtsWeaponId(character));
  const die = ma.kind === 'weapon' ? ma.damage : '1d6';
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 border-2 border-[var(--color-border-warm)] bg-[var(--color-bg-elevated)] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden>
          <g fill="var(--color-accent-amber)" fillOpacity="0.85">
            <rect x="13" y="24" width="6" height="4" />
            <rect x="9" y="12" width="14" height="12" rx="2" />
            <rect x="9" y="8" width="3" height="6" rx="1" />
            <rect x="13" y="7" width="3" height="7" rx="1" />
            <rect x="17" y="7" width="3" height="7" rx="1" />
            <rect x="21" y="8" width="3" height="6" rx="1" />
            <rect x="6" y="14" width="4" height="7" rx="1.5" />
          </g>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display uppercase tracking-wider text-[11px] text-[var(--color-text-primary)]">
          {t('screens.inventory.unarmedName')}
        </div>
        <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-mono mt-0.5">
          {t('screens.inventory.unarmedLine', { die, edge: MONK_UNARMED_DAMAGE_EDGE })}
        </div>
      </div>
    </div>
  );
}

/**
 * Live set-progress for the WORN pieces: one row per set the player has at least
 * one piece of equipped, showing how many of its pieces are on (X / size) and
 * which escalating bonus tiers are lit. Reads straight off the equipped slots —
 * set gear is real backpack loot now, so this replaces the old hub set board.
 */
function SetProgressPanel({ character }: { character: Character }) {
  const { t, tc } = useT();
  const frame = GEAR_RARITY_COLOR.set;
  const wornIds = equippedSetIds(character);
  if (wornIds.length === 0) return null;
  const active = GEAR_SETS.filter((s) => setProgress(s, wornIds) > 0);
  if (active.length === 0) return null;

  return (
    <div className="mb-6">
      <Panel title={t('screens.inventory.sets')} tone="default">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map((s) => {
            const worn = setProgress(s, wornIds);
            return (
              <div key={s.id} className="panel-etched border p-3" style={{ borderColor: frame + '55' }}>
                <div className="flex justify-between items-baseline gap-2">
                  <h4 className="font-display uppercase tracking-wider text-[11px]" style={{ color: frame }}>
                    {tc('setGear', s.id, 'name', s.name)}
                  </h4>
                  <span className="font-mono text-[10px] shrink-0" style={{ color: frame }}>
                    {t('hub.setGear.equippedCount', { n: worn, total: setSize(s) })}
                  </span>
                </div>
                <div className="mt-2 space-y-0.5">
                  {s.bonuses.map((tier) => {
                    const on = worn >= tier.piecesRequired;
                    return (
                      <div
                        key={tier.piecesRequired}
                        className="text-[10px] font-mono leading-snug"
                        style={{ color: on ? frame : 'var(--color-text-dim)' }}
                      >
                        {on ? '◆' : '◇'} {tc('setGear', `${s.id}.bonus`, String(tier.piecesRequired), tier.label)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
  key: 'weapons' | 'armor' | 'accessories' | 'consumables' | 'other';
  entries: InventoryEntry[];
}

function groupInventory(inventory: ItemRef[]): InventoryGroup[] {
  // Stack consumables by id (visible as ×N); keep weapons/armor/accessories as
  // discrete rows so the player can equip a specific instance.
  const weapons: InventoryEntry[] = [];
  const armor: InventoryEntry[] = [];
  const accessories: InventoryEntry[] = [];
  const consumables = new Map<string, InventoryEntry>();
  const other: InventoryEntry[] = [];

  inventory.forEach((ref, idx) => {
    const item = getItem(ref.itemId);
    if (item.kind === 'weapon') {
      weapons.push({ ref, idx, item, stackCount: 1 });
    } else if (item.kind === 'armor') {
      armor.push({ ref, idx, item, stackCount: 1 });
    } else if (item.kind === 'accessory') {
      accessories.push({ ref, idx, item, stackCount: 1 });
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
  if (weapons.length) result.push({ key: 'weapons', entries: weapons });
  if (armor.length) result.push({ key: 'armor', entries: armor });
  if (accessories.length) result.push({ key: 'accessories', entries: accessories });
  if (consumables.size) result.push({ key: 'consumables', entries: [...consumables.values()] });
  if (other.length) result.push({ key: 'other', entries: other });
  return result;
}
