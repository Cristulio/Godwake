import { useState } from 'react';
import type { Item, ItemRef } from '../../schemas/item';
import type { Character } from '../../types/character';
import { Button } from '../ui/Button';
import { getItem } from '../../content/items';
import { getLegendary } from '../../content/legendaries';
import { armorEquipWarning, equipDenialReason, slotForItem } from '../../engine/character/equip';
import { rolledItemCost } from '../../engine/items';
import { GEAR_RARITY_COLOR } from '../inventory/rarity';
import { ItemTooltip } from '../inventory/ItemTooltip';
import { baseStatLine, enhancementLine, itemTypeLabel, localizedItemName, localizedAffixEffect, gearRarityLabel } from '../inventory/itemDisplay';
import type { GearStock, LegendaryOffer } from './shopStock';
import { useT } from '../../i18n/useT';

type TFn = (key: string, params?: Record<string, string | number>) => string;
type TcFn = (namespace: string, id: string, field: string, fallbackEnglish: string) => string;

/** Most wares carry their own flavour; synthesise a short line for the rest. */
export function consumableBlurb(item: Item, t: TFn, tc: TcFn): string {
  if (item.description) return tc('items', item.id, 'description', item.description);
  if (item.kind === 'consumable') {
    return item.healDice ? t('delve.wares.restores', { dice: item.healDice }) : item.effect;
  }
  return '';
}

interface GearWareRowProps {
  stock: GearStock;
  bought: boolean;
  gold: number;
  onBuy: () => void;
  /** Viewing character — drives the armour caveat, usability gate, and the compare-on-hover tooltip. */
  character?: Character;
}

/** One rolled arms-rack item: rarity-coloured frame, affix-effect list, price. */
export function GearWareRow({ stock, bought, gold, onBuy, character }: GearWareRowProps) {
  const { t } = useT();
  const [hovered, setHovered] = useState(false);
  const rolled = stock.ref.rolled;
  const base = getItem(stock.ref.itemId);
  const rarity = rolled?.rarity ?? 'white';
  const color = GEAR_RARITY_COLOR[rarity];
  const tooDear = gold < stock.cost;
  const warning =
    character && base.kind === 'armor' ? armorEquipWarning(character.classId, base) : null;
  // The usability gate — why this can't be worn yet (wrong class, stat shortfall,
  // class-bound). Shown but never blocks buying: the player may grow into it.
  const denial = character ? equipDenialReason(character, stock.ref.itemId) : null;
  // Compare-on-hover: the item already worn in this buy item's slot (desktop only).
  const slot = character ? slotForItem(stock.ref.itemId) : null;
  const equippedRef =
    character && slot
      ? slot === 'ring1'
        ? character.equipped.ring1 ?? character.equipped.ring2
        : character.equipped[slot]
      : null;
  return (
    <div
      className="border p-3 flex items-center gap-3 relative"
      style={{ borderColor: bought ? 'var(--color-border-dim)' : color, opacity: bought ? 0.5 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && equippedRef && (
        <div className="absolute z-30 right-full mr-2 top-0 hidden md:block pointer-events-none">
          <ItemTooltip
            item={getItem(equippedRef.itemId)}
            rolled={equippedRef.rolled}
            rolledCost={rolledItemCost(equippedRef)}
            hint={t('delve.wares.currentlyEquipped')}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm uppercase tracking-wider" style={{ color }}>
          {localizedItemName(stock.ref)}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-0.5">
          {gearRarityLabel(rarity)} · {itemTypeLabel(base)}
        </div>
        {base.kind !== 'accessory' && (
          <div className="text-[var(--color-text-secondary)] text-[11px] uppercase tracking-widest font-mono mt-0.5">
            {baseStatLine(base)}
          </div>
        )}
        <div className="mt-1 space-y-0.5">
          {!!rolled?.enhancement && enhancementLine(base, rolled.enhancement) && (
            <div className="text-[11px] italic leading-snug" style={{ color }}>
              ◆ {enhancementLine(base, rolled.enhancement)}
            </div>
          )}
          {(rolled?.affixes ?? []).map((id) => (
            <div key={id} className="text-[11px] italic leading-snug" style={{ color }}>
              ◆ {localizedAffixEffect(id)}
            </div>
          ))}
        </div>
        {warning && (
          <div className="text-[var(--color-accent-amber)] text-[10px] leading-snug mt-1">
            ⚠ {warning}
          </div>
        )}
        {denial && (
          <div className="text-[var(--color-accent-blood)] text-[10px] leading-snug mt-1">
            ✕ {denial}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[var(--color-accent-gold)] text-sm">{t('delve.wares.priceGp', { n: stock.cost })}</div>
        <Button
          variant={bought || tooDear ? 'secondary' : 'primary'}
          disabled={bought || tooDear}
          onClick={onBuy}
        >
          {bought ? t('delve.wares.sold') : tooDear ? t('delve.wares.needMore', { n: stock.cost - gold }) : t('delve.wares.buy')}
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
  const { t, tc } = useT();
  const gold700 = 'var(--color-accent-gold)';
  const tooDear = gold < offer.cost;
  const effect = tc(
    'legendaries',
    offer.legendaryId,
    'effect',
    getLegendary(offer.legendaryId)?.effect ?? t('delve.wares.relicFallback'),
  );
  return (
    <div
      className="border-2 p-3 flex items-center gap-3"
      style={{ borderColor: bought ? 'var(--color-border-dim)' : gold700, opacity: bought ? 0.5 : 1 }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm uppercase tracking-wider" style={{ color: gold700 }}>
          ✦ {tc('legendaries', offer.legendaryId, 'name', offer.name)}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-0.5">
          {t('delve.wares.legendaryBanks')}
        </div>
        <div className="text-[11px] italic leading-snug mt-1" style={{ color: gold700 }}>
          ◆ {effect}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[var(--color-accent-gold)] text-sm">{t('delve.wares.priceGp', { n: offer.cost })}</div>
        <Button
          variant={bought || tooDear ? 'secondary' : 'primary'}
          disabled={bought || tooDear}
          onClick={onBuy}
        >
          {bought ? t('delve.wares.bound') : tooDear ? t('delve.wares.needMore', { n: offer.cost - gold }) : t('delve.wares.acquire')}
        </Button>
      </div>
    </div>
  );
}

interface ConsumableWareRowProps {
  item: Item;
  bought: boolean;
  gold: number;
  onBuy: () => void;
}

/** One fixed draught/charm row. Goes SOLD once bought so the same draught can't
 * be re-bought after a trip to the pack — the sold-state persists in delveStore. */
export function ConsumableWareRow({ item, bought, gold, onBuy }: ConsumableWareRowProps) {
  const { t, tc } = useT();
  const tooDear = gold < item.cost;
  return (
    <div
      className="border border-[var(--color-border-dim)] p-3 flex items-center gap-3"
      style={{ opacity: bought ? 0.5 : 1 }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[var(--color-text-primary)] text-sm uppercase tracking-wider">
          {tc('items', item.id, 'name', item.name)}
        </div>
        <div className="text-[var(--color-text-secondary)] text-xs italic mt-1 leading-relaxed">
          {consumableBlurb(item, t, tc)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[var(--color-accent-gold)] text-sm">{t('delve.wares.priceGp', { n: item.cost })}</div>
        <Button
          variant={bought || tooDear ? 'secondary' : 'primary'}
          disabled={bought || tooDear}
          onClick={onBuy}
        >
          {bought ? t('delve.wares.sold') : tooDear ? t('delve.wares.needMore', { n: item.cost - gold }) : t('delve.wares.buy')}
        </Button>
      </div>
    </div>
  );
}

interface SellWareRowProps {
  itemRef: ItemRef;
  price: number;
  onSell: () => void;
}

/** One pack item the merchant will buy back, rarity-framed, with its sell price. */
export function SellWareRow({ itemRef, price, onSell }: SellWareRowProps) {
  const { t } = useT();
  const base = getItem(itemRef.itemId);
  const rarity = itemRef.rolled?.rarity ?? 'white';
  const color = GEAR_RARITY_COLOR[rarity];
  const typeLabel = itemTypeLabel(base);
  const stat = baseStatLine(base);
  return (
    <div className="border p-3 flex items-center gap-4" style={{ borderColor: color }}>
      <div className="flex-1 min-w-0">
        <div className="text-sm uppercase tracking-wider truncate" style={{ color }}>
          {localizedItemName(itemRef)}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mt-0.5">
          {stat && stat !== typeLabel ? `${typeLabel} · ${stat}` : typeLabel}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[var(--color-accent-gold)] text-sm">{t('delve.wares.sellPriceGp', { n: price })}</div>
        <Button variant="secondary" onClick={onSell}>
          {t('delve.wares.sell')}
        </Button>
      </div>
    </div>
  );
}
