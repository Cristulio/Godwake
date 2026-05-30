import { useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import type { GearRarity, Item, ItemRef } from '../../schemas/item';
import type { CampBoonTier } from '../../content/campBoons';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getItem, getAffix } from '../../content/items';
import { createDiceRoller } from '../../engine/dice';
import { rollItem, rolledItemCost } from '../../engine/items';
import { playSfx } from '../../engine/audio';
import { merchantStockForTier } from './CampRoom';
import { GEAR_RARITY_COLOR, GEAR_RARITY_LABEL } from '../inventory/rarity';

interface ShopRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

/** Deeper chapters carry the pricier wares — same tiering as the camp caravan. */
function tierForChapter(chapter: number | undefined): CampBoonTier {
  if (!chapter || chapter <= 1) return 1;
  if (chapter === 2) return 2;
  return 3;
}

/**
 * The rarity mix the merchant lays out by chapter depth. A small, fixed spread
 * (the big rotating pool is Wave 2) — bases and affixes still vary per visit via
 * the room-seeded roller.
 */
const GEAR_RARITY_MIX: Record<CampBoonTier, GearRarity[]> = {
  1: ['green', 'green', 'blue'],
  2: ['green', 'blue', 'blue'],
  3: ['blue', 'blue', 'purple'],
};

interface GearStock {
  ref: ItemRef;
  cost: number;
}

function consumableBlurb(item: Item): string {
  if (item.description) return item.description;
  if (item.kind === 'consumable') {
    return item.healDice ? `Restores ${item.healDice} HP.` : item.effect;
  }
  return '';
}

/**
 * A merchant node on the route map: a standalone buy screen. Draughts come from
 * the camp caravan's fixed stock; the ARMS rack is now Diablo-style rolled gear
 * — class-legal bases with rolled affixes, rarity-coloured and priced by rarity
 * (the gold sink). Stock is deterministic per visit (seeded by the room id), so
 * re-renders don't reroll. Keep the coin-lender's diegetic voice.
 */
export function ShopRoom({ room, onContinue }: ShopRoomProps) {
  const character = useGameStore((s) => s.character);
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const purchaseRolledGear = useGameStore((s) => s.purchaseRolledGear);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const [message, setMessage] = useState<string | null>(null);
  const [boughtKeys, setBoughtKeys] = useState<Set<string>>(new Set());

  const tier = tierForChapter(room.chapter);
  const classId = character?.classId;

  // Draughts & charms only from the fixed stock — the arms rack is rolled below.
  const consumables = useMemo(
    () => merchantStockForTier(tier).map(getItem).filter((it) => it.kind === 'consumable'),
    [tier],
  );

  const gear = useMemo<GearStock[]>(() => {
    if (!classId) return [];
    const roller = createDiceRoller(`${room.id}:gear-shop`);
    return GEAR_RARITY_MIX[tier].map((rarity) => {
      const ref = rollItem(roller, { rarity, classId });
      return { ref, cost: rolledItemCost(ref) };
    });
  }, [room.id, tier, classId]);

  if (!character) return null;
  const gold = character.goldInPocket;

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

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-5 [background-image:radial-gradient(circle_at_50%_25%,rgba(212,176,98,0.10),transparent_60%)]">
      <header className="pb-3 border-b border-[var(--color-border-warm)] flex items-start justify-between gap-4">
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
              const rolled = stock.ref.rolled;
              const rarity = rolled?.rarity ?? 'white';
              const color = GEAR_RARITY_COLOR[rarity];
              const bought = boughtKeys.has(key);
              const tooDear = gold < stock.cost;
              return (
                <div
                  key={key}
                  className="border p-3 flex items-center gap-4"
                  style={{ borderColor: bought ? 'var(--color-border-dim)' : color, opacity: bought ? 0.5 : 1 }}
                >
                  <div className="flex-1">
                    <div className="text-sm uppercase tracking-wider" style={{ color }}>
                      {rolled?.name ?? getItem(stock.ref.itemId).name}
                    </div>
                    <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-0.5">
                      {GEAR_RARITY_LABEL[rarity]}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {(rolled?.affixes ?? []).map((id) => {
                        let effect = id;
                        try {
                          effect = getAffix(id).effect;
                        } catch {
                          /* unknown id */
                        }
                        return (
                          <div key={id} className="text-[11px] italic leading-snug" style={{ color }}>
                            ◆ {effect}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[var(--color-accent-gold)] text-sm">{stock.cost} gp</div>
                    <Button
                      variant={bought || tooDear ? 'secondary' : 'primary'}
                      disabled={bought || tooDear}
                      onClick={() => buyGear(stock, key)}
                    >
                      {bought ? 'Sold' : tooDear ? `Need ${stock.cost - gold} more` : 'Buy'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {consumables.length > 0 && (
        <div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
            Draughts &amp; Charms
          </div>
          <div className="grid gap-3">
            {consumables.map((item) => {
              const tooDear = gold < item.cost;
              return (
                <div
                  key={item.id}
                  className="border border-[var(--color-border-dim)] p-3 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="text-[var(--color-text-primary)] text-sm uppercase tracking-wider">
                      {item.name}
                    </div>
                    <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
                      {consumableBlurb(item)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[var(--color-accent-gold)] text-sm">{item.cost} gp</div>
                    <Button
                      variant={tooDear ? 'secondary' : 'primary'}
                      disabled={tooDear}
                      onClick={() => buyConsumable(item.id)}
                    >
                      {tooDear ? `Need ${item.cost - gold} more` : 'Buy'}
                    </Button>
                  </div>
                </div>
              );
            })}
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
