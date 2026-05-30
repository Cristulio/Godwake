import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import {
  LEGENDARIES,
  legendarySlotCap,
  type Legendary,
} from '../../content/legendaries';
import { SETS, setProgress } from '../../content/sets';

interface LegendaryScreenProps {
  onBack: () => void;
}

/**
 * The hub "Relics" view: inspect earned legendary relics and choose which to
 * attune for the next descent (a Hades-mirror-style slot cap). Reached from the
 * Phandalin hub once the soul has earned at least one relic — gated there so the
 * feature only appears after it exists for the player.
 */
export function LegendaryScreen({ onBack }: LegendaryScreenProps) {
  const owned = useGameStore((s) => s.ownedLegendaries);
  const active = useGameStore((s) => s.activeLegendaries);
  const setActive = useGameStore((s) => s.setActiveLegendaries);
  const ascensionUnlocked = useGameStore((s) => s.ascensionUnlocked);
  const cap = legendarySlotCap(ascensionUnlocked);
  const [flash, setFlash] = useState<string | null>(null);

  function toggle(id: string) {
    if (active.includes(id)) {
      setActive(active.filter((a) => a !== id));
      return;
    }
    if (active.length >= cap) {
      setFlash(`Only ${cap} relics may be attuned at once. More slots open as you ascend.`);
      setTimeout(() => setFlash(null), 2400);
      return;
    }
    setActive([...active, id]);
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex justify-between items-end mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            RELICS OF THE SOUL
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            Legendary attunements · What death cannot take
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          ← Phandalin
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">
        <Panel tone="glow">
          <p className="text-[var(--color-text-secondary)] text-sm italic leading-relaxed font-narrative">
            Some things the wheel cannot strip from you. These relics, earned in the deep dark,
            return with the soul through every death. Attune the ones you will carry into the next
            descent — the rest wait, patient, in the dark of the reliquary.
          </p>
        </Panel>
        <div className="panel-etched-warm border border-[var(--color-border-warm)] p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-display text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest mb-1 flex items-center gap-1">
              <span className="text-[var(--color-accent-gold)]">✦</span>
              Attuned
            </div>
            <div
              className="font-mono text-3xl text-[var(--color-accent-gold)]"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.7), 0 0 12px rgba(212,176,98,0.4)' }}
            >
              {active.length} / {cap}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest mt-1">
              {owned.length} / {LEGENDARIES.length} relics found
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <div className="mb-4 px-4 py-2 border-2 border-[var(--color-accent-blood)] text-[var(--color-accent-blood)] bg-[var(--color-bg-panel)] text-xs uppercase tracking-widest text-center font-display animate-fade-in">
          {flash}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {LEGENDARIES.map((relic) =>
          owned.includes(relic.id) ? (
            <RelicCard
              key={relic.id}
              relic={relic}
              attuned={active.includes(relic.id)}
              onToggle={() => toggle(relic.id)}
            />
          ) : (
            <UndiscoveredCard key={relic.id} />
          ),
        )}
      </div>

      <SetsPanel active={active} owned={owned} />
    </div>
  );
}

function SetsPanel({ active, owned }: { active: string[]; owned: string[] }) {
  return (
    <div className="mt-8">
      <div className="font-display text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
        <span className="text-[var(--color-accent-gold)]/60">✦</span>
        Set Bonuses · attune multiple pieces
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {SETS.map((set) => {
          const activeCount = setProgress(set, active);
          const ownedCount = set.pieceIds.filter((id) => owned.includes(id)).length;
          return (
            <div key={set.id} className="panel-etched border border-[var(--color-border-dim)] p-3">
              <div className="flex justify-between items-baseline gap-2">
                <h4 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[11px]">
                  {set.name}
                </h4>
                <span className="font-mono text-[10px] text-[var(--color-accent-gold)] shrink-0">
                  {activeCount}/{set.pieceIds.length} attuned
                </span>
              </div>
              <p className="text-[var(--color-text-secondary)] text-[10px] italic mt-1 font-narrative leading-snug">
                {set.flavor}
              </p>
              <div className="mt-2 space-y-0.5">
                {set.bonuses.map((tier) => {
                  const on = activeCount >= tier.piecesRequired;
                  return (
                    <div
                      key={tier.piecesRequired}
                      className="text-[10px] font-mono leading-snug"
                      style={{ color: on ? 'var(--color-accent-gold)' : 'var(--color-text-dim)' }}
                    >
                      {on ? '✦' : '○'} {tier.label}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[9px] text-[var(--color-text-dim)] uppercase tracking-widest">
                {ownedCount}/{set.pieceIds.length} pieces found
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RelicCardProps {
  relic: Legendary;
  attuned: boolean;
  onToggle: () => void;
}

function RelicCard({ relic, attuned, onToggle }: RelicCardProps) {
  return (
    <div
      className={`
        relative panel-etched-warm border-2 p-4 transition-all flex flex-col
        ${attuned
          ? 'border-[var(--color-accent-gold)] shadow-[0_0_18px_rgba(244,167,66,0.25)]'
          : 'border-[var(--color-border-dim)]'}
      `}
    >
      {attuned && (
        <div className="absolute -top-px -right-px bg-[var(--color-accent-gold)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
          ✦ Attuned
        </div>
      )}

      <h3 className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[12px] leading-tight mb-1">
        {relic.name}
      </h3>
      <p className="text-[var(--color-text-secondary)] text-xs italic mb-3 leading-relaxed font-narrative">
        {relic.flavor}
      </p>
      <div className="text-[var(--color-accent-gold)] text-xs mb-3 font-mono">{relic.effect}</div>

      <div className="mt-auto">
        <Button
          variant={attuned ? 'secondary' : 'primary'}
          onClick={onToggle}
          className="w-full"
        >
          {attuned ? 'Release' : 'Attune'}
        </Button>
      </div>
    </div>
  );
}

function UndiscoveredCard() {
  return (
    <div className="relative panel-etched border-2 border-[var(--color-border-dim)] opacity-70 p-4 flex flex-col">
      <div className="absolute -top-px -right-px bg-[var(--color-border-warm)] text-[var(--color-bg-base)] font-display text-[9px] uppercase tracking-widest px-2 py-1">
        ⚿ Undiscovered
      </div>
      <h3 className="font-display text-[var(--color-text-dim)] uppercase tracking-wider text-[12px] leading-tight mb-1">
        ??? ??? ???
      </h3>
      <p className="text-[var(--color-text-dim)] text-xs italic leading-relaxed font-narrative">
        A relic not yet earned. Clear the chain and the dark may yield it up.
      </p>
    </div>
  );
}
