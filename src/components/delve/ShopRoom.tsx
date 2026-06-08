import { useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getItem } from '../../content/items';
import { localizedItemName } from '../inventory/itemDisplay';
import { playSfx } from '../../engine/audio';
import { equippedInventoryIndices } from '../../engine/character/equip';
import {
  consumableStockForTier,
  rollGearStock,
  rollLegendaryOffer,
  sellValue,
  tierForChapter,
  type GearStock,
} from './shopStock';
import { GearWareRow, ConsumableWareRow, LegendaryWareRow, SellWareRow } from './MerchantWares';
import { useT } from '../../i18n/useT';

interface ShopRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

/**
 * A merchant node on the route map: a standalone buy screen. Draughts come from
 * the fixed depth-scaled stock; the ARMS rack is Diablo-style rolled gear
 * — class-legal bases with rolled affixes, rarity-coloured and priced by rarity
 * (the gold sink). Stock is deterministic per visit (seeded by the room id), so
 * re-renders don't reroll. Keep the coin-lender's diegetic voice.
 */
export function ShopRoom({ room, onContinue }: ShopRoomProps) {
  const { t, tc } = useT();
  const character = useGameStore((s) => s.character);
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const purchaseRolledGear = useGameStore((s) => s.purchaseRolledGear);
  const purchaseLegendary = useGameStore((s) => s.purchaseLegendary);
  const sellItem = useGameStore((s) => s.sellItem);
  const ownedLegendaries = useGameStore((s) => s.ownedLegendaries);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const [message, setMessage] = useState<string | null>(null);
  // Sold-state lives in delveStore so a bought ware stays gone when the player
  // steps out to the pack and back (component state reset on unmount, so bought
  // items used to re-appear and were re-buyable). Keyed by this room's id.
  const recordShopPurchase = useGameStore((s) => s.recordShopPurchase);
  const purchasedKeys = useGameStore((s) => s.purchasedShopKeys[room.id]);
  const isBought = (key: string) => purchasedKeys?.includes(key) ?? false;

  const tier = tierForChapter(room.chapter);
  const classId = character?.classId;
  const ascensionLevel = useGameStore((s) => s.delve?.ascensionLevel ?? 0);

  // Draughts & charms only from the fixed stock — the arms rack is rolled below.
  const consumables = useMemo(
    () => consumableStockForTier(tier).map(getItem).filter((it) => it.kind === 'consumable'),
    [tier],
  );

  const chapter = room.chapter ?? 1;
  const gear = useMemo<GearStock[]>(
    () =>
      classId
        ? rollGearStock(room.id, chapter, classId, room.layer ?? 0)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room.id, chapter, classId, room.layer],
  );

  // The rare reliquary offer is rolled deterministically per visit (owned-blind),
  // then hidden at render if the rolled relic is already owned or just bought —
  // so buying it doesn't churn a fresh offer into view.
  const legendaryOffer = useMemo(
    () => (classId ? rollLegendaryOffer(room.id, chapter, classId, [], ascensionLevel) : null),
    [room.id, chapter, classId, ascensionLevel],
  );

  if (!character) return null;
  const gold = character.goldInPocket;
  // Resolve worn items by inventory index (not object identity), so equipped
  // gear stays out of the sell list even after a reload rehydrates the equipped
  // refs as distinct objects from the bag entries.
  const equippedIdx = equippedInventoryIndices(character);
  const sellable = character.inventory
    .map((ref, idx) => ({ ref, idx }))
    .filter(({ ref, idx }) => {
      if (equippedIdx.has(idx)) return false;
      const kind = getItem(ref.itemId).kind;
      return kind === 'weapon' || kind === 'armor' || kind === 'accessory';
    });
  const showLegendary =
    legendaryOffer != null &&
    !isBought('legendary') &&
    !ownedLegendaries.includes(legendaryOffer.legendaryId);

  function buyConsumable(itemId: string) {
    const r = purchaseFromMerchant(itemId);
    if (r.ok) {
      recordShopPurchase(room.id, itemId);
      setMessage(t('ui.shop.addedToPack', { name: tc('items', itemId, 'name', getItem(itemId).name) }));
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? t('ui.shop.cannotPurchase'));
    }
  }

  function buyGear(stock: GearStock, key: string) {
    const r = purchaseRolledGear(stock.ref, stock.cost);
    if (r.ok) {
      recordShopPurchase(room.id, key);
      setMessage(t('ui.shop.addedToPack', { name: localizedItemName(stock.ref) || t('ui.shop.itemFallback') }));
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? t('ui.shop.cannotPurchase'));
    }
  }

  function buyLegendary() {
    if (!legendaryOffer) return;
    const r = purchaseLegendary(legendaryOffer.legendaryId, legendaryOffer.cost);
    if (r.ok) {
      recordShopPurchase(room.id, 'legendary');
      setMessage(t('ui.shop.boundToReliquary', { name: tc('legendaries', legendaryOffer.legendaryId, 'name', legendaryOffer.name) }));
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? t('ui.shop.cannotPurchase'));
    }
  }

  function sell(inventoryIdx: number, name: string) {
    const r = sellItem(inventoryIdx);
    if (r.ok) {
      setMessage(t('ui.shop.soldFor', { name, gold: r.gold ?? 0 }));
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? t('ui.shop.cannotSell'));
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-5 [background-image:radial-gradient(circle_at_50%_25%,rgba(212,176,98,0.10),transparent_60%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-[var(--color-accent-gold)] tracking-wider uppercase">
            {room.title}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            {t('ui.shop.subtitle')}
          </p>
        </div>
        <div
          className="shrink-0 panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
          title={t('ui.shop.goldTitle')}
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
            ◈ {t('ui.shop.gold')}
          </div>
          <div
            className="font-mono text-lg text-[var(--color-accent-gold)] leading-none"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7)' }}
          >
            {gold}
          </div>
        </div>
      </header>

      <Panel className="bg-gradient-to-br from-[#2a2112] to-[#16110a]">
        <p className="text-[var(--color-text-secondary)] text-sm italic text-center leading-relaxed">
          {room.flavorText}
        </p>
      </Panel>

      {gear.length > 0 && (
        <div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
            {t('ui.shop.arms')}
          </div>
          <div className="grid gap-3">
            {gear.map((stock, i) => {
              const key = `gear-${i}`;
              return (
                <GearWareRow
                  key={key}
                  stock={stock}
                  bought={isBought(key)}
                  gold={gold}
                  onBuy={() => buyGear(stock, key)}
                  playerClassId={classId}
                />
              );
            })}
          </div>
        </div>
      )}

      {showLegendary && legendaryOffer && (
        <div>
          <div className="text-[var(--color-accent-gold)] text-[10px] uppercase tracking-[0.3em] mb-2">
            ✦ {t('ui.shop.reliquary')}
          </div>
          <div className="grid gap-3">
            <LegendaryWareRow
              offer={legendaryOffer}
              bought={isBought('legendary')}
              gold={gold}
              onBuy={buyLegendary}
            />
          </div>
        </div>
      )}

      {consumables.length > 0 && (
        <div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
            {t('ui.shop.draughts')}
          </div>
          <div className="grid gap-3">
            {consumables.map((item) => (
              <ConsumableWareRow
                key={item.id}
                item={item}
                bought={isBought(item.id)}
                gold={gold}
                onBuy={() => buyConsumable(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {sellable.length > 0 && (
        <div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
            {t('ui.shop.sellFromPack')}
          </div>
          <div className="grid gap-3">
            {sellable.map(({ ref, idx }) => (
              <SellWareRow
                key={idx}
                itemRef={ref}
                price={sellValue(ref)}
                onSell={() => sell(idx, localizedItemName(ref))}
              />
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="text-[var(--color-status-poison)] text-xs uppercase tracking-widest text-center">
          {message}
        </div>
      )}

      <div className="flex justify-center gap-3 mt-1">
        <Button variant="ghost" onClick={goToInventory}>
          ◆ {t('ui.shop.openPack')}
        </Button>
        <Button variant="primary" onClick={onContinue}>
          {t('ui.shop.moveOn')}
        </Button>
      </div>
    </div>
  );
}
