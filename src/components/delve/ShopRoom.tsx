import { useMemo, useState } from 'react';
import type { RoomSpec } from '../../types/delve';
import type { Item } from '../../schemas/item';
import type { CampBoonTier } from '../../content/campBoons';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getItem } from '../../content/items';
import { playSfx } from '../../engine/audio';
import { merchantStockForTier } from './CampRoom';

interface ShopRoomProps {
  room: RoomSpec;
  onContinue: () => void;
}

/** Grouped, ordered sections for the stock list (mirrors the camp shop). */
const STOCK_GROUPS: Array<{ kind: Item['kind']; label: string }> = [
  { kind: 'consumable', label: 'Draughts & Charms' },
  { kind: 'weapon', label: 'Arms' },
  { kind: 'armor', label: 'Armour' },
];

/** Deeper chapters carry the pricier wares — same tiering as the camp caravan. */
function tierForChapter(chapter: number | undefined): CampBoonTier {
  if (!chapter || chapter <= 1) return 1;
  if (chapter === 2) return 2;
  return 3;
}

function itemBlurb(item: Item): string {
  if (item.description) return item.description;
  if (item.kind === 'weapon') {
    const versatile = item.versatileDamage ? `, ${item.versatileDamage} two-handed` : '';
    return `${item.damage} ${item.damageType}${versatile}.`;
  }
  if (item.kind === 'armor') {
    if (item.category === 'shield') return `A banded shield. +${item.baseAC} AC.`;
    const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    return `${cat} armour. Base AC ${item.baseAC}.`;
  }
  return '';
}

/**
 * A merchant node on the route map: a standalone buy screen reusing the camp
 * caravan's tiered stock + the shared `purchaseFromMerchant` path, so nothing
 * here is orphaned and gold has a worthwhile sink mid-chapter. Stock scales with
 * the chapter depth.
 */
export function ShopRoom({ room, onContinue }: ShopRoomProps) {
  const character = useGameStore((s) => s.character);
  const purchaseFromMerchant = useGameStore((s) => s.purchaseFromMerchant);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const [message, setMessage] = useState<string | null>(null);

  const stockIds = useMemo(() => merchantStockForTier(tierForChapter(room.chapter)), [room.chapter]);
  const items = useMemo(() => stockIds.map(getItem), [stockIds]);

  if (!character) return null;
  const gold = character.goldInPocket;

  function buy(itemId: string) {
    const r = purchaseFromMerchant(itemId);
    if (r.ok) {
      setMessage(`${getItem(itemId).name} added to your pack.`);
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

      {STOCK_GROUPS.map((group) => {
        const groupItems = items.filter((it) => it.kind === group.kind);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.kind}>
            <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2">
              {group.label}
            </div>
            <div className="grid gap-3">
              {groupItems.map((item) => {
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
                        {itemBlurb(item)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[var(--color-accent-gold)] text-sm">{item.cost} gp</div>
                      <Button
                        variant={tooDear ? 'secondary' : 'primary'}
                        disabled={tooDear}
                        onClick={() => buy(item.id)}
                      >
                        {tooDear ? `Need ${item.cost - gold} more` : 'Buy'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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
