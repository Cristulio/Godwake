import type { Item } from '../../schemas/item';
import { Button } from '../ui/Button';
import { getItem, getAffix } from '../../content/items';
import { getLegendary } from '../../content/legendaries';
import { GEAR_RARITY_COLOR, GEAR_RARITY_LABEL } from '../inventory/rarity';
import type { GearStock, LegendaryOffer } from './shopStock';

/** Most wares carry their own flavour; synthesise a short line for the rest. */
export function consumableBlurb(item: Item): string {
  if (item.description) return item.description;
  if (item.kind === 'consumable') {
    return item.healDice ? `Restores ${item.healDice} HP.` : item.effect;
  }
  return '';
}

interface GearWareRowProps {
  stock: GearStock;
  bought: boolean;
  gold: number;
  onBuy: () => void;
}

/** One rolled arms-rack item: rarity-coloured frame, affix-effect list, price. */
export function GearWareRow({ stock, bought, gold, onBuy }: GearWareRowProps) {
  const rolled = stock.ref.rolled;
  const rarity = rolled?.rarity ?? 'white';
  const color = GEAR_RARITY_COLOR[rarity];
  const tooDear = gold < stock.cost;
  return (
    <div
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
          onClick={onBuy}
        >
          {bought ? 'Sold' : tooDear ? `Need ${stock.cost - gold} more` : 'Buy'}
        </Button>
      </div>
    </div>
  );
}

interface LegendaryWareRowProps {
  offer: LegendaryOffer;
  bought: boolean;
  gold: number;
  onBuy: () => void;
}

/**
 * The rare "reliquary" offer: a legendary relic. Buying it BANKS the relic to the
 * persistent collection (it doesn't enter the pack) — the row says so, and the
 * player attunes it at the hub.
 */
export function LegendaryWareRow({ offer, bought, gold, onBuy }: LegendaryWareRowProps) {
  const gold700 = 'var(--color-accent-gold)';
  const tooDear = gold < offer.cost;
  const effect = getLegendary(offer.legendaryId)?.effect ?? 'A relic that death cannot take.';
  return (
    <div
      className="border-2 p-3 flex items-center gap-4"
      style={{ borderColor: bought ? 'var(--color-border-dim)' : gold700, opacity: bought ? 0.5 : 1 }}
    >
      <div className="flex-1">
        <div className="text-sm uppercase tracking-wider" style={{ color: gold700 }}>
          ✦ {offer.name}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-0.5">
          Legendary · banks to your reliquary
        </div>
        <div className="text-[11px] italic leading-snug mt-1" style={{ color: gold700 }}>
          ◆ {effect}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[var(--color-accent-gold)] text-sm">{offer.cost} gp</div>
        <Button
          variant={bought || tooDear ? 'secondary' : 'primary'}
          disabled={bought || tooDear}
          onClick={onBuy}
        >
          {bought ? 'Bound' : tooDear ? `Need ${offer.cost - gold} more` : 'Acquire'}
        </Button>
      </div>
    </div>
  );
}

interface ConsumableWareRowProps {
  item: Item;
  gold: number;
  onBuy: () => void;
}

/** One fixed draught/charm row. */
export function ConsumableWareRow({ item, gold, onBuy }: ConsumableWareRowProps) {
  const tooDear = gold < item.cost;
  return (
    <div className="border border-[var(--color-border-dim)] p-3 flex items-center gap-4">
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
        <Button variant={tooDear ? 'secondary' : 'primary'} disabled={tooDear} onClick={onBuy}>
          {tooDear ? `Need ${item.cost - gold} more` : 'Buy'}
        </Button>
      </div>
    </div>
  );
}
