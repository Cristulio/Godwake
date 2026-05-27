import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import {
  listUpgradesByCategory,
  listUpgrades,
  UPGRADE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_TAGLINES,
  type Upgrade,
  type UpgradeCategory,
} from '../../content/upgrades';
import { GroveScene } from './GroveScene';

type FlashKind = 'ok' | 'err';

export function DruidGroveScreen() {
  const character = useGameStore((s) => s.character);
  const unlocked = useGameStore((s) => s.unlockedUpgrades);
  const purchase = useGameStore((s) => s.purchaseUpgrade);
  const goToHub = useGameStore((s) => s.goToHub);
  const [flash, setFlash] = useState<{ kind: FlashKind; msg: string } | null>(null);
  const [pulsing, setPulsing] = useState<string | null>(null);
  const [tab, setTab] = useState<UpgradeCategory>('body');

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. <Button onClick={goToHub}>Hub</Button>
      </div>
    );
  }

  function tryBuy(id: string) {
    const res = purchase(id);
    if (res.ok) {
      setFlash({ kind: 'ok', msg: 'The Wellspring accepts your tribute.' });
      setPulsing(id);
      setTimeout(() => setPulsing(null), 1400);
    } else {
      setFlash({ kind: 'err', msg: res.reason ?? 'Cannot purchase.' });
    }
    setTimeout(() => setFlash(null), 2400);
  }

  const all = listUpgrades();
  const ownedRanks = all.reduce((sum, u) => sum + (unlocked[u.id] ?? 0), 0);
  const totalRanks = all.reduce((sum, u) => sum + u.maxRank, 0);
  const categoryUpgrades = listUpgradesByCategory(tab);

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex justify-between items-end mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            THE DRUID GROVE
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            Wellspring of Mielikki · Tend the soul, mend the wheel
          </p>
        </div>
        <Button variant="ghost" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <div className="relative">
        <GroveScene />
        <div className="absolute inset-0 pointer-events-none animate-torch-flicker bg-gradient-to-b from-[rgba(168,208,66,0.04)] via-transparent to-transparent mb-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">
        <Panel tone="glow">
          <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed font-narrative">
            The grove keepers gather around the pool. The water remembers every death you have
            taken, every name you have worn. Spend the Renown your courage has earned, and the
            Lady will mark your soul accordingly — a small mercy carried forward through every
            flesh you wear hereafter.
          </p>
        </Panel>
        <div className="panel-etched-warm border border-[var(--color-border-warm)] p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center gap-1">
              <span className="text-[var(--color-accent-gold)]">◆</span>
              Renown
            </div>
            <div
              className="font-mono text-3xl text-[var(--color-accent-gold)]"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7), 0 0 12px rgba(212,176,98,0.4)' }}
            >
              {character.renown}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mt-1">
              {ownedRanks} / {totalRanks} ranks blessed
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <div
          className={`
            mb-4 px-4 py-2 border-2 text-xs uppercase tracking-widest text-center font-display animate-fade-in
            ${flash.kind === 'ok'
              ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
              : 'border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] bg-[var(--color-bg-panel)]'}
          `}
        >
          {flash.msg}
        </div>
      )}

      <CategoryTabs current={tab} onChange={setTab} unlocked={unlocked} />

      <div className="mb-4 text-center">
        <div className="font-display text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.3em]">
          {CATEGORY_LABELS[tab]}
        </div>
        <div className="font-narrative italic text-[var(--color-text-secondary)] text-xs mt-1">
          {CATEGORY_TAGLINES[tab]}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {categoryUpgrades.map((u) => (
          <UpgradeCard
            key={u.id}
            upgrade={u}
            currentRank={unlocked[u.id] ?? 0}
            renown={character.renown}
            pulsing={pulsing === u.id}
            onBuy={() => tryBuy(u.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface CategoryTabsProps {
  current: UpgradeCategory;
  onChange: (c: UpgradeCategory) => void;
  unlocked: Record<string, number>;
}

function CategoryTabs({ current, onChange, unlocked }: CategoryTabsProps) {
  return (
    <div className="flex gap-1 mb-5 border-b border-[var(--color-border-warm)]">
      {UPGRADE_CATEGORIES.map((cat) => {
        const inCat = listUpgradesByCategory(cat);
        const owned = inCat.reduce((s, u) => s + (unlocked[u.id] ?? 0), 0);
        const max = inCat.reduce((s, u) => s + u.maxRank, 0);
        const active = cat === current;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={`
              flex-1 py-2 px-3 border-2 border-b-0 transition-colors text-center
              font-display text-[11px] uppercase tracking-widest
              ${active
                ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
                : 'border-[var(--color-border-dim)] text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-warm)]'}
            `}
          >
            <div>{CATEGORY_LABELS[cat]}</div>
            <div className="font-mono text-[9px] mt-0.5 opacity-70">
              {owned} / {max}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface UpgradeCardProps {
  upgrade: Upgrade;
  currentRank: number;
  renown: number;
  pulsing: boolean;
  onBuy: () => void;
}

function UpgradeCard({ upgrade, currentRank, renown, pulsing, onBuy }: UpgradeCardProps) {
  const maxed = currentRank >= upgrade.maxRank;
  const nextRank = currentRank + 1;
  const nextCost = maxed ? null : upgrade.costForRank(nextRank);
  const affordable = nextCost !== null && renown >= nextCost;
  const owned = currentRank > 0;
  const shortfall = nextCost !== null ? nextCost - renown : 0;

  const borderClass = maxed
    ? 'border-[var(--color-accent-amber)] shadow-[0_0_18px_rgba(244,167,66,0.25)]'
    : owned
      ? 'border-[var(--color-accent-amber)]/60'
      : affordable
        ? 'border-[var(--color-accent-gold)] hover:shadow-[0_0_22px_rgba(244,167,66,0.3)]'
        : 'border-[var(--color-border-dim)]';

  return (
    <div
      className={`
        relative panel-etched-warm border-2 p-4 transition-all flex flex-col
        ${borderClass}
        ${pulsing ? 'animate-pulse-glow' : ''}
      `}
    >
      {maxed && (
        <div className="absolute -top-px -right-px bg-[var(--color-accent-gold)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          ◆ Max Rank
        </div>
      )}

      <div className="flex justify-between items-start mb-1 gap-3">
        <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[12px] leading-tight">
          {upgrade.name}
        </h3>
        <RankPips current={currentRank} max={upgrade.maxRank} />
      </div>

      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed font-narrative">
        {upgrade.flavor}
      </p>

      <div className="text-[var(--color-text-primary)] text-xs mb-3 font-mono space-y-1">
        {owned && (
          <div>
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mr-2">
              Now ({currentRank}/{upgrade.maxRank})
            </span>
            {upgrade.effectAtRank(currentRank)}
          </div>
        )}
        {!maxed && (
          <div className="text-[var(--color-accent-gold)]">
            <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest mr-2">
              Next ({nextRank}/{upgrade.maxRank})
            </span>
            {upgrade.effectAtRank(nextRank)}
          </div>
        )}
      </div>

      <div className="mt-auto">
        {maxed ? (
          <div className="font-display text-[10px] uppercase tracking-widest text-[var(--color-accent-amber)]/80 text-center py-2 border border-[var(--color-accent-amber)]/40 bg-[var(--color-bg-deep)]/40">
            ✓ Soul blessed in full
          </div>
        ) : affordable ? (
          <Button variant="primary" onClick={onBuy} className="w-full">
            {owned ? `Rank up — ${nextCost} R` : `Drink — ${nextCost} R`}
          </Button>
        ) : (
          <div className="flex flex-col gap-1">
            <Button variant="secondary" disabled className="w-full">
              {nextCost} R — Wellspring withholds
            </Button>
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-accent-blood)] text-center font-mono mt-0.5">
              — {shortfall} renown short
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RankPips({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex gap-1 shrink-0">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className={`
              w-2.5 h-2.5 border
              ${filled
                ? 'bg-[var(--color-accent-gold)] border-[var(--color-accent-amber)] shadow-[0_0_6px_rgba(244,167,66,0.6)]'
                : 'bg-transparent border-[var(--color-border-dim)]'}
            `}
          />
        );
      })}
    </div>
  );
}
