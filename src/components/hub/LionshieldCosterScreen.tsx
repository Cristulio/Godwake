import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { getItem } from '../../content/items';
import { ItemIcon } from '../inventory/ItemIcon';
import { playSfx } from '../../engine/audio';

/**
 * The permanent town shop. Distinct from the camp-room merchant — Lionshield
 * is always open in Phandalin and stocks potions, mid-tier weapons, scrolls.
 * Sells from gold-in-pocket, which deltas to inventory.
 */
const STOCK: string[] = [
  'potion-of-healing',
  'potion-of-greater-healing',
  'dagger',
  'longsword',
  'leather-armor',
  'shield',
  'antitoxin',
];

export function LionshieldCosterScreen() {
  const character = useGameStore((s) => s.character);
  const goToHub = useGameStore((s) => s.goToHub);
  const purchase = useGameStore((s) => s.purchaseFromMerchant);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. <Button onClick={goToHub}>Hub</Button>
      </div>
    );
  }

  function buy(itemId: string) {
    if (!character) return;
    const result = purchase(itemId);
    if (result.ok) {
      playSfx('ui_click');
      const item = getItem(itemId);
      setFlash({ kind: 'ok', msg: `Bought: ${item.name}` });
    } else {
      setFlash({ kind: 'err', msg: result.reason ?? 'Cannot buy.' });
    }
    setTimeout(() => setFlash(null), 2200);
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto animate-room-enter">
      <header className="flex justify-between items-end mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            LIONSHIELD COSTER
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1 italic">
            Linene Graywind's trading post · Phandalin
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
              ◈ Gold
            </div>
            <div className="font-mono text-xl text-[var(--color-accent-gold)]" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}>
              {character.goldInPocket + character.goldInBank}
            </div>
          </div>
          <Button variant="ghost" onClick={goToHub}>← Phandalin</Button>
        </div>
      </header>

      <Panel tone="warm" className="mb-6">
        <p className="font-narrative italic text-[var(--color-text-secondary)] text-sm leading-relaxed">
          "The road south is hungry. Stock up before you walk it." The shopkeep nods at a row of
          glass vials and a rack of well-kept blades behind the counter.
        </p>
      </Panel>

      {flash && (
        <div
          className={`mb-4 px-3 py-2 border-2 text-sm uppercase tracking-widest text-center animate-fade-in font-display ${
            flash.kind === 'ok'
              ? 'border-[var(--color-status-poison)] text-[var(--color-status-poison)] bg-[var(--color-bg-panel)]'
              : 'border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] bg-[var(--color-bg-panel)]'
          }`}
        >
          {flash.msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {STOCK.map((id) => {
          const item = getItem(id);
          const affordable = character.goldInPocket >= item.cost;
          return (
            <div
              key={id}
              className={`panel-etched-warm border ${affordable ? 'border-[var(--color-border-warm)]' : 'border-[var(--color-border-dim)] opacity-60'} p-3 flex gap-3 items-start`}
            >
              <ItemIcon item={item} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[var(--color-text-primary)] font-display text-xs uppercase tracking-wider truncate">
                    {item.name}
                  </div>
                  <div className="font-mono text-[var(--color-accent-gold)] text-sm shrink-0">
                    {item.cost}g
                  </div>
                </div>
                <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest mt-0.5">
                  {statLine(item)}
                </div>
                <div className="text-[var(--color-text-dim)] text-[10px] italic mt-1 leading-tight line-clamp-2">
                  {item.description ?? ''}
                </div>
                <div className="mt-2">
                  <Button
                    variant={affordable ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={!affordable}
                    onClick={() => buy(id)}
                  >
                    {affordable ? '⛁ Buy' : 'Too dear'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ShopItem = ReturnType<typeof getItem>;

function statLine(item: ShopItem): string {
  switch (item.kind) {
    case 'weapon':
      return `${item.damage} ${item.damageType}${item.versatileDamage ? ` (${item.versatileDamage} 2h)` : ''}`;
    case 'armor':
      return item.category === 'shield' ? `+${item.baseAC} AC shield` : `${item.category} · AC ${item.baseAC}`;
    case 'consumable':
      return item.healDice ? `heal ${item.healDice}` : item.effect;
    default:
      return '';
  }
}
