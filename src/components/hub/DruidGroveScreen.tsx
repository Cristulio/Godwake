import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { listUpgrades } from '../../content/upgrades';
import { GroveScene } from './GroveScene';

export function DruidGroveScreen() {
  const character = useGameStore((s) => s.character);
  const unlocked = useGameStore((s) => s.unlockedUpgrades);
  const purchase = useGameStore((s) => s.purchaseUpgrade);
  const goToHub = useGameStore((s) => s.goToHub);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

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
    } else {
      setFlash({ kind: 'err', msg: res.reason ?? 'Cannot purchase.' });
    }
    setTimeout(() => setFlash(null), 2400);
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-wider">
            THE DRUID GROVE
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Wellspring of Mielikki · Tend the soul, mend the wheel
          </p>
        </div>
        <Button variant="secondary" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <GroveScene />

      <Panel className="mb-6">
        <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed">
          The grove keepers gather around the pool. The water remembers every death you have
          taken, every name you have worn. Spend the Renown your courage has earned, and the
          Lady will mark your soul accordingly — a small mercy carried forward through every
          flesh you wear hereafter.
        </p>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <span className="text-[var(--color-text-dim)] uppercase tracking-widest mr-2">Renown</span>
            <span className="text-[var(--color-accent-amber)] text-lg font-mono">{character.renown}</span>
          </div>
          <div>
            <span className="text-[var(--color-text-dim)] uppercase tracking-widest mr-2">Owned</span>
            <span className="text-[var(--color-text-primary)] text-lg font-mono">
              {unlocked.length} / {upgrades.length}
            </span>
          </div>
        </div>
      </Panel>

      {flash && (
        <div
          className={`
            mb-4 px-4 py-2 border text-sm uppercase tracking-widest text-center
            ${flash.kind === 'ok'
              ? 'border-[var(--color-accent-amber)] text-[var(--color-accent-amber)] bg-[var(--color-bg-panel)]'
              : 'border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] bg-[var(--color-bg-panel)]'}
          `}
        >
          {flash.msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {upgrades.map((u) => {
          const owned = unlocked.includes(u.id);
          const affordable = character.renown >= u.cost;
          return (
            <Panel key={u.id} className={owned ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[var(--color-accent-amber)] uppercase tracking-wider">
                  {u.name}
                </h3>
                <div className="text-[var(--color-accent-amber)] text-sm font-mono whitespace-nowrap">
                  {u.cost} R
                </div>
              </div>
              <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed">
                {u.flavor}
              </p>
              <p className="text-[var(--color-text-primary)] text-sm mb-4">
                {u.effect}
              </p>
              {owned ? (
                <div className="text-xs uppercase tracking-widest text-[var(--color-text-dim)] text-center py-2 border border-[var(--color-border-dim)]">
                  ✓ Blessed
                </div>
              ) : (
                <Button
                  variant={affordable ? 'primary' : 'secondary'}
                  disabled={!affordable}
                  onClick={() => tryBuy(u.id)}
                >
                  {affordable ? 'Drink from the Wellspring' : `Need ${u.cost - character.renown} more Renown`}
                </Button>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
