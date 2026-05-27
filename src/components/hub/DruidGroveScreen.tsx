import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { listUpgrades, type Upgrade } from '../../content/upgrades';
import { GroveScene } from './GroveScene';

type FlashKind = 'ok' | 'err';

export function DruidGroveScreen() {
  const character = useGameStore((s) => s.character);
  const unlocked = useGameStore((s) => s.unlockedUpgrades);
  const purchase = useGameStore((s) => s.purchaseUpgrade);
  const goToHub = useGameStore((s) => s.goToHub);
  const [flash, setFlash] = useState<{ kind: FlashKind; msg: string } | null>(null);
  const [pulsing, setPulsing] = useState<string | null>(null);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        No character. <Button onClick={goToHub}>Hub</Button>
      </div>
    );
  }

  const upgrades = listUpgrades();

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

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto animate-room-enter">
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
              {unlocked.length} / {upgrades.length} blessed
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

      <div className="grid md:grid-cols-2 gap-4">
        {upgrades.map((u) => (
          <UpgradeCard
            key={u.id}
            upgrade={u}
            owned={unlocked.includes(u.id)}
            renown={character.renown}
            pulsing={pulsing === u.id}
            onBuy={() => tryBuy(u.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface UpgradeCardProps {
  upgrade: Upgrade;
  owned: boolean;
  renown: number;
  pulsing: boolean;
  onBuy: () => void;
}

function UpgradeCard({ upgrade, owned, renown, pulsing, onBuy }: UpgradeCardProps) {
  const affordable = renown >= upgrade.cost;
  const shortfall = upgrade.cost - renown;

  const borderClass = owned
    ? 'border-[var(--color-accent-amber)]/70'
    : affordable
      ? 'border-[var(--color-accent-gold)] hover:shadow-[0_0_22px_rgba(244,167,66,0.3)]'
      : 'border-[var(--color-border-dim)]';

  return (
    <div
      className={`
        relative panel-etched-warm border-2 p-4 transition-all
        ${borderClass}
        ${owned ? 'opacity-75' : ''}
        ${pulsing ? 'animate-pulse-glow' : ''}
      `}
    >
      {owned && (
        <div className="absolute -top-px -right-px bg-[var(--color-accent-gold)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          ◆ Owned
        </div>
      )}

      <div className="flex justify-between items-start mb-2 gap-3">
        <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[12px] leading-tight">
          {upgrade.name}
        </h3>
        <div
          className={`text-sm font-mono whitespace-nowrap shrink-0 ${
            owned
              ? 'text-[var(--color-text-dim)] line-through'
              : affordable
                ? 'text-[var(--color-accent-gold)]'
                : 'text-[var(--color-text-dim)]'
          }`}
          style={affordable && !owned ? { textShadow: '0 0 8px rgba(212,176,98,0.5)' } : undefined}
        >
          {upgrade.cost} R
        </div>
      </div>

      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed font-narrative">
        {upgrade.flavor}
      </p>
      <p className="text-[var(--color-text-primary)] text-sm mb-4 font-mono">
        {upgrade.effect}
      </p>

      {owned ? (
        <div className="font-display text-[10px] uppercase tracking-widest text-[var(--color-accent-amber)]/70 text-center py-2 border border-[var(--color-accent-amber)]/40 bg-[var(--color-bg-deep)]/40">
          ✓ Blessed
        </div>
      ) : affordable ? (
        <Button variant="primary" onClick={onBuy} className="w-full">
          Drink from the Wellspring
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          <Button variant="secondary" disabled className="w-full">
            Wellspring withholds
          </Button>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-accent-blood)] text-center font-mono mt-0.5">
            — {shortfall} renown short
          </div>
        </div>
      )}
    </div>
  );
}
