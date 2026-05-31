import { useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getItem } from '../../content/items';
import { playSfx } from '../../engine/audio';
import { EQUIP_SLOTS } from '../../engine/character/equip';
import {
  consumableStockForTier,
  rollGearStock,
  rollLegendaryOffer,
  sellValue,
  tierForChapter,
  type GearStock,
} from './shopStock';
import { GearWareRow, ConsumableWareRow, LegendaryWareRow, SellWareRow } from './MerchantWares';

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
  const character = useGameStore((s) => s.character);
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const purchaseRolledGear = useGameStore((s) => s.purchaseRolledGear);
  const purchaseLegendary = useGameStore((s) => s.purchaseLegendary);
  const sellItem = useGameStore((s) => s.sellItem);
  const ownedLegendaries = useGameStore((s) => s.ownedLegendaries);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const [message, setMessage] = useState<string | null>(null);
  const [boughtKeys, setBoughtKeys] = useState<Set<string>>(new Set());
  const [legendaryBought, setLegendaryBought] = useState(false);

  const tier = tierForChapter(room.chapter);
  const classId = character?.classId;

  // Draughts & charms only from the fixed stock — the arms rack is rolled below.
  const consumables = useMemo(
    () => consumableStockForTier(tier).map(getItem).filter((it) => it.kind === 'consumable'),
    [tier],
  );

  const gear = useMemo<GearStock[]>(
    () => (classId ? rollGearStock(room.id, tier, classId, room.layer ?? 0) : []),
    [room.id, tier, classId, room.layer],
  );

  // The rare reliquary offer is rolled deterministically per visit (owned-blind),
  // then hidden at render if the rolled relic is already owned or just bought —
  // so buying it doesn't churn a fresh offer into view.
  const legendaryOffer = useMemo(
    () => (classId ? rollLegendaryOffer(room.id, tier, classId, []) : null),
    [room.id, tier, classId],
  );

  if (!character) return null;
  const gold = character.goldInPocket;
  const equippedRefs = new Set(
    EQUIP_SLOTS.map((slot) => character.equipped[slot]).filter(Boolean),
  );
  const sellable = character.inventory
    .map((ref, idx) => ({ ref, idx }))
    .filter(({ ref }) => {
      if (equippedRefs.has(ref)) return false;
      const kind = getItem(ref.itemId).kind;
      return kind === 'weapon' || kind === 'armor' || kind === 'accessory';
    });
  const showLegendary =
    legendaryOffer != null &&
    !legendaryBought &&
    !ownedLegendaries.includes(legendaryOffer.legendaryId);

  function buyConsumable(itemId: string) {
    const r = purchaseFromMerchant(itemId);
    if (r.ok) {
      setMessage(`${getItem(itemId).name} added to your pack.`);
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? 'Cannot purchase.');
    }
  }

  function buyGear(stock: GearStock, key: string) {
    const r = purchaseRolledGear(stock.ref, stock.cost);
    if (r.ok) {
      setBoughtKeys((prev) => new Set(prev).add(key));
      setMessage(`${stock.ref.rolled?.name ?? 'Item'} added to your pack.`);
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? 'Cannot purchase.');
    }
  }

  function buyLegendary() {
    if (!legendaryOffer) return;
    const r = purchaseLegendary(legendaryOffer.legendaryId, legendaryOffer.cost);
    if (r.ok) {
      setLegendaryBought(true);
      setMessage(`${legendaryOffer.name} bound to your reliquary — attune it at the hub.`);
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? 'Cannot purchase.');
    }
  }

  function sell(inventoryIdx: number, name: string) {
    const r = sellItem(inventoryIdx);
    if (r.ok) {
      setMessage(`Sold ${name} for ${r.gold} gp.`);
      playSfx('ui_click');
    } else {
      setMessage(r.reason ?? 'Cannot sell.');
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-5 [background-image:radial-gradient(circle_at_50%_25%,rgba(212,176,98,0.10),transparent_60%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-[var(--color-accent-gold)] tracking-wider uppercase">
            {room.title}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Merchant · Coin and a charter, no questions asked
          </p>
        </div>
        <div
          className="shrink-0 panel-etched-warm border border-[var(--color-accent-gold)] px-3 py-1.5 text-right"
          title="Gold in pocket"
        >
          <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
            ◈ Gold
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
            Arms &amp; Armour
          </div>
          <div className="grid gap-3">
            {gear.map((stock, i) => {
              const key = `gear-${i}`;
              return (
                <GearWareRow
                  key={key}
                  stock={stock}
                  bought={boughtKeys.has(key)}
                  gold={gold}
                  onBuy={() => buyGear(stock, key)}
                />
              );
            })}
          </div>
        </div>
      )}

      {showLegendary && legendaryOffer && (
        <div>
          <div className="text-[var(--color-accent-gold)] text-[10px] uppercase tracking-[0.3em] mb-2">
            ✦ Reliquary
          </div>
          <div className="grid gap-3">
            <LegendaryWareRow
              offer={legendaryOffer}
              bought={legendaryBought}
              gold={gold}
              onBuy={buyLegendary}
            />
          </div>
        </div>
      )}

      {consumables.length > 0 && (
        <div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
            Draughts &amp; Charms
          </div>
          <div className="grid gap-3">
            {consumables.map((item) => (
              <ConsumableWareRow
                key={item.id}
                item={item}
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
            Sell from your Pack
          </div>
          <div className="grid gap-3">
            {sellable.map(({ ref, idx }) => (
              <SellWareRow
                key={idx}
                itemRef={ref}
                price={sellValue(ref)}
                onSell={() => sell(idx, ref.rolled?.name ?? getItem(ref.itemId).name)}
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
          ◆ Open your pack
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Move on →
        </Button>
      </div>
    </div>
  );
}
